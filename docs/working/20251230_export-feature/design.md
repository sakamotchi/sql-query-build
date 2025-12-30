# フェーズ5: エクスポート機能 - 設計書

**作成日**: 2025-12-30
**前提**: `requirements.md`の要件を満たす設計

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Vue/TypeScript)                                │
├─────────────────────────────────────────────────────────┤
│ ExportDialog.vue                                         │
│   ↓                                                      │
│ exportApi.exportResult(format, filePath, data)          │
│   ↓ Tauri IPC                                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (Rust)                                           │
├─────────────────────────────────────────────────────────┤
│ #[tauri::command]                                        │
│ export_result(format, file_path, data)                  │
│   ↓                                                      │
│ ExportService                                            │
│   ├─ CsvExporter                                        │
│   ├─ ExcelExporter                                      │
│   └─ JsonExporter                                       │
│        ↓                                                 │
│   File Write (streaming)                                │
└─────────────────────────────────────────────────────────┘
```

## 2. データ構造

### 2.1 Rust側型定義

```rust
// src-tauri/src/models/export.rs

use serde::{Deserialize, Serialize};

/// エクスポート形式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Csv,
    Excel,
    Json,
}

/// エクスポートオプション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    /// ファイル形式
    pub format: ExportFormat,
    /// ファイルパス
    pub file_path: String,
    /// ヘッダー行を含めるか（CSV/Excel）
    #[serde(default = "default_include_header")]
    pub include_header: bool,
    /// Pretty print（JSON）
    #[serde(default = "default_pretty_print")]
    pub pretty_print: bool,
}

fn default_include_header() -> bool {
    true
}

fn default_pretty_print() -> bool {
    true
}

/// エクスポート結果
#[derive(Debug, Serialize)]
pub struct ExportResult {
    /// 成功したか
    pub success: bool,
    /// エクスポートした行数
    pub rows_exported: usize,
    /// ファイルパス
    pub file_path: String,
    /// エラーメッセージ（失敗時）
    pub error: Option<String>,
}
```

### 2.2 TypeScript側型定義

```typescript
// app/types/export.ts

export type ExportFormat = 'csv' | 'excel' | 'json'

export interface ExportOptions {
  format: ExportFormat
  filePath: string
  includeHeader?: boolean  // default: true
  prettyPrint?: boolean    // default: true (JSON only)
}

export interface ExportResult {
  success: boolean
  rowsExported: number
  filePath: string
  error?: string
}
```

### 2.3 クエリ結果データ構造

```typescript
// app/types/query-result.ts（既存）

export interface QueryResult {
  columns: ColumnInfo[]
  rows: Row[]
  rowCount: number
  executionTime: number
}

export interface ColumnInfo {
  name: string
  type: string
}

export type Row = Record<string, CellValue>
export type CellValue = string | number | boolean | null
```

## 3. 実装詳細

### 3.1 Rust側実装

#### 3.1.1 ExportService

```rust
// src-tauri/src/services/exporter.rs

use crate::models::export::{ExportFormat, ExportOptions, ExportResult};
use crate::models::query_result::QueryResult;
use anyhow::Result;
use std::path::Path;

pub struct ExportService;

impl ExportService {
    /// クエリ結果をエクスポート
    pub async fn export_result(
        options: ExportOptions,
        result: QueryResult,
    ) -> Result<ExportResult> {
        let rows_total = result.rows.len();

        // ファイル形式に応じたエクスポート処理
        let export_result = match options.format {
            ExportFormat::Csv => {
                CsvExporter::export(&options.file_path, &result, options.include_header)?
            }
            ExportFormat::Excel => {
                ExcelExporter::export(&options.file_path, &result, options.include_header)?
            }
            ExportFormat::Json => {
                JsonExporter::export(&options.file_path, &result, options.pretty_print)?
            }
        };

        Ok(ExportResult {
            success: true,
            rows_exported: rows_total,
            file_path: options.file_path.clone(),
            error: None,
        })
    }
}

/// CSVエクスポーター
struct CsvExporter;

impl CsvExporter {
    fn export(file_path: &str, result: &QueryResult, include_header: bool) -> Result<()> {
        use csv::WriterBuilder;
        use std::fs::File;

        let file = File::create(file_path)?;
        let mut writer = WriterBuilder::new()
            .has_headers(include_header)
            .from_writer(file);

        // ヘッダー書き込み
        if include_header {
            let headers: Vec<&str> = result.columns.iter().map(|c| c.name.as_str()).collect();
            writer.write_record(&headers)?;
        }

        // データ書き込み
        for row in &result.rows {
            let values: Vec<String> = result
                .columns
                .iter()
                .map(|col| {
                    row.get(&col.name)
                        .map(|v| v.to_string())
                        .unwrap_or_default()
                })
                .collect();
            writer.write_record(&values)?;
        }

        writer.flush()?;
        Ok(())
    }
}

/// Excelエクスポーター
struct ExcelExporter;

impl ExcelExporter {
    fn export(file_path: &str, result: &QueryResult, include_header: bool) -> Result<()> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();
        let worksheet = workbook.add_worksheet();

        let mut row_idx = 0;

        // ヘッダー書き込み（太字）
        if include_header {
            let header_format = Format::new().set_bold();
            for (col_idx, column) in result.columns.iter().enumerate() {
                worksheet.write_string_with_format(
                    row_idx,
                    col_idx as u16,
                    &column.name,
                    &header_format,
                )?;
            }
            row_idx += 1;
        }

        // データ書き込み
        for row in &result.rows {
            for (col_idx, column) in result.columns.iter().enumerate() {
                if let Some(value) = row.get(&column.name) {
                    let value_str = value.to_string();
                    worksheet.write_string(row_idx, col_idx as u16, &value_str)?;
                }
            }
            row_idx += 1;
        }

        // カラム幅の自動調整
        for col_idx in 0..result.columns.len() {
            worksheet.autofit_column(col_idx as u16)?;
        }

        workbook.save(file_path)?;
        Ok(())
    }
}

/// JSONエクスポーター
struct JsonExporter;

impl JsonExporter {
    fn export(file_path: &str, result: &QueryResult, pretty_print: bool) -> Result<()> {
        use std::fs::File;
        use std::io::Write;

        let json = if pretty_print {
            serde_json::to_string_pretty(&result.rows)?
        } else {
            serde_json::to_string(&result.rows)?
        };

        let mut file = File::create(file_path)?;
        file.write_all(json.as_bytes())?;
        Ok(())
    }
}
```

#### 3.1.2 Tauriコマンド

```rust
// src-tauri/src/commands/export_commands.rs

use crate::models::export::{ExportOptions, ExportResult};
use crate::models::query_result::QueryResult;
use crate::services::exporter::ExportService;
use tauri::State;

#[tauri::command]
pub async fn export_result(
    options: ExportOptions,
    result: QueryResult,
) -> Result<ExportResult, String> {
    ExportService::export_result(options, result)
        .await
        .map_err(|e| e.to_string())
}
```

```rust
// src-tauri/src/lib.rs への追加

mod commands {
    pub mod export_commands;
    // ... 既存コマンド
}

use commands::export_commands::export_result;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            export_result,
            // ... 既存コマンド
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3.2 フロントエンド実装

#### 3.2.1 Export API

```typescript
// app/api/export.ts

import { invoke } from '@tauri-apps/api/core'
import type { ExportOptions, ExportResult } from '~/types/export'
import type { QueryResult } from '~/types/query-result'

export const exportApi = {
  /**
   * クエリ結果をエクスポート
   */
  async exportResult(
    options: ExportOptions,
    result: QueryResult
  ): Promise<ExportResult> {
    return await invoke<ExportResult>('export_result', {
      options,
      result,
    })
  },
}
```

#### 3.2.2 ExportDialog.vue

```vue
<!-- app/components/query-builder/dialog/ExportDialog.vue -->

<script setup lang="ts">
import { ref, computed } from 'vue'
import { save } from '@tauri-apps/plugin-dialog'
import { exportApi } from '~/api/export'
import type { ExportFormat } from '~/types/export'

const props = defineProps<{
  result: QueryResult
}>()

const emit = defineEmits<{
  close: []
  success: [filePath: string]
}>()

const selectedFormat = ref<ExportFormat>('csv')
const isExporting = ref(false)
const errorMessage = ref<string | null>(null)

const formatOptions = [
  { value: 'csv', label: 'CSV', extension: '.csv' },
  { value: 'excel', label: 'Excel', extension: '.xlsx' },
  { value: 'json', label: 'JSON', extension: '.json' },
] as const

const rowCount = computed(() => props.result.rowCount)

const selectedFormatInfo = computed(() =>
  formatOptions.find(f => f.value === selectedFormat.value)
)

async function handleExport() {
  if (!selectedFormatInfo.value) return

  try {
    isExporting.value = true
    errorMessage.value = null

    // ファイル保存ダイアログを表示
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const defaultFilename = `query_result_${timestamp}${selectedFormatInfo.value.extension}`

    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [
        {
          name: selectedFormatInfo.value.label,
          extensions: [selectedFormatInfo.value.extension.slice(1)],
        },
      ],
    })

    if (!filePath) {
      // ユーザーがキャンセル
      isExporting.value = false
      return
    }

    // エクスポート実行
    const result = await exportApi.exportResult(
      {
        format: selectedFormat.value,
        filePath,
      },
      props.result
    )

    if (result.success) {
      emit('success', result.filePath)
      emit('close')
    } else {
      errorMessage.value = result.error || 'Export failed'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <UModal
    :model-value="true"
    @update:model-value="emit('close')"
  >
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">
          Export Query Result
        </h3>
      </template>

      <div class="space-y-4">
        <!-- 形式選択 -->
        <UFormGroup label="Format">
          <URadioGroup
            v-model="selectedFormat"
            :options="formatOptions"
          />
        </UFormGroup>

        <!-- 行数表示 -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ rowCount.toLocaleString() }} rows will be exported
        </div>

        <!-- エラーメッセージ -->
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          :title="errorMessage"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="gray"
            variant="ghost"
            @click="emit('close')"
            :disabled="isExporting"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            @click="handleExport"
            :loading="isExporting"
          >
            Export
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

#### 3.2.3 ResultPanel.vue への統合

```vue
<!-- app/components/query-builder/ResultPanel.vue への追加 -->

<script setup lang="ts">
// ... 既存のimport

import ExportDialog from './dialog/ExportDialog.vue'

// ... 既存のコード

const showExportDialog = ref(false)

function handleExportSuccess(filePath: string) {
  // 成功通知
  // TODO: Toastなどで通知
  console.log('Exported to:', filePath)
}
</script>

<template>
  <div class="result-panel">
    <!-- ツールバー -->
    <div class="toolbar">
      <div class="toolbar-right">
        <UButton
          v-if="result"
          icon="i-heroicons-arrow-down-tray"
          color="gray"
          variant="ghost"
          @click="showExportDialog = true"
        >
          Export
        </UButton>
      </div>
    </div>

    <!-- 既存の結果表示 -->
    <!-- ... -->

    <!-- エクスポートダイアログ -->
    <ExportDialog
      v-if="showExportDialog && result"
      :result="result"
      @close="showExportDialog = false"
      @success="handleExportSuccess"
    />
  </div>
</template>
```

## 4. テストコード

### 4.1 Rust単体テスト

```rust
// src-tauri/src/services/exporter.rs

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::query_result::{ColumnInfo, QueryResult};
    use std::collections::HashMap;

    fn create_test_result() -> QueryResult {
        QueryResult {
            columns: vec![
                ColumnInfo {
                    name: "id".to_string(),
                    r#type: "integer".to_string(),
                },
                ColumnInfo {
                    name: "name".to_string(),
                    r#type: "text".to_string(),
                },
            ],
            rows: vec![
                HashMap::from([
                    ("id".to_string(), "1".to_string()),
                    ("name".to_string(), "Alice".to_string()),
                ]),
                HashMap::from([
                    ("id".to_string(), "2".to_string()),
                    ("name".to_string(), "Bob".to_string()),
                ]),
            ],
            row_count: 2,
            execution_time: 10,
        }
    }

    #[tokio::test]
    async fn test_csv_export() {
        let result = create_test_result();
        let temp_file = "/tmp/test_export.csv";

        let export_result = CsvExporter::export(temp_file, &result, true);
        assert!(export_result.is_ok());

        // ファイルが生成されたことを確認
        assert!(std::path::Path::new(temp_file).exists());

        // 内容確認
        let content = std::fs::read_to_string(temp_file).unwrap();
        assert!(content.contains("id,name"));
        assert!(content.contains("1,Alice"));

        // クリーンアップ
        std::fs::remove_file(temp_file).ok();
    }

    #[tokio::test]
    async fn test_json_export() {
        let result = create_test_result();
        let temp_file = "/tmp/test_export.json";

        let export_result = JsonExporter::export(temp_file, &result, true);
        assert!(export_result.is_ok());

        let content = std::fs::read_to_string(temp_file).unwrap();
        let json: Vec<HashMap<String, String>> = serde_json::from_str(&content).unwrap();
        assert_eq!(json.len(), 2);
        assert_eq!(json[0].get("name"), Some(&"Alice".to_string()));

        std::fs::remove_file(temp_file).ok();
    }
}
```

### 4.2 フロントエンド単体テスト

```typescript
// app/components/query-builder/dialog/ExportDialog.test.ts

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExportDialog from './ExportDialog.vue'

describe('ExportDialog', () => {
  const mockResult = {
    columns: [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
    ],
    rows: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
    rowCount: 2,
    executionTime: 10,
  }

  it('renders format options', () => {
    const wrapper = mount(ExportDialog, {
      props: { result: mockResult },
    })

    expect(wrapper.text()).toContain('CSV')
    expect(wrapper.text()).toContain('Excel')
    expect(wrapper.text()).toContain('JSON')
  })

  it('displays row count', () => {
    const wrapper = mount(ExportDialog, {
      props: { result: mockResult },
    })

    expect(wrapper.text()).toContain('2 rows will be exported')
  })

  it('emits close event when cancel button clicked', async () => {
    const wrapper = mount(ExportDialog, {
      props: { result: mockResult },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
```

## 5. エラーハンドリング

### 5.1 エラーケース

| エラー | 原因 | 対処 |
|--------|------|------|
| FileWriteError | ディスク容量不足、権限エラー | エラーメッセージ表示、ファイルパス確認促す |
| InvalidPath | 無効なファイルパス | パス形式検証、再入力促す |
| SerializationError | データのシリアライズ失敗 | エラーメッセージ表示、データ型確認 |
| ExportCancelled | ユーザーによるキャンセル | 通知なし、部分ファイル削除 |

### 5.2 エラーメッセージ

```typescript
// app/utils/export-errors.ts

export function formatExportError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('permission')) {
      return 'Permission denied. Please check file permissions.'
    }
    if (error.message.includes('space')) {
      return 'Insufficient disk space. Please free up space and try again.'
    }
    return error.message
  }
  return 'An unknown error occurred during export.'
}
```

## 6. パフォーマンス最適化

### 6.1 大量データ対応（将来拡張）

10万行以上のデータをエクスポートする場合:

1. **ストリーミング書き込み**: メモリに全データを保持せず、バッチ処理
2. **進捗通知**: Tauri Eventで進捗を通知
3. **キャンセル処理**: tokio::select!でキャンセルシグナルを検知

```rust
// 将来拡張例
pub async fn export_result_stream(
    options: ExportOptions,
    result_stream: impl Stream<Item = Row>,
    cancel_token: CancellationToken,
) -> Result<ExportResult> {
    // ストリーミング処理
    // ...
}
```

## 7. 依存クレート

```toml
# src-tauri/Cargo.toml への追加

[dependencies]
csv = "1.3"
rust_xlsxwriter = "0.75"
serde_json = "1.0"
# 既存の依存関係
```

## 8. まとめ

- CSV/Excel/JSON形式でのエクスポートをサポート
- タウリのファイルダイアログで保存先を選択
- エラーハンドリングとユーザーフィードバック
- 将来的に大量データ対応を拡張可能な設計
