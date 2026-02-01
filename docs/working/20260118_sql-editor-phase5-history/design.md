# 設計書 - SQLエディタ Phase 5: クエリ履歴機能

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vue/Nuxt)                                         │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ SqlEditorLayout  │  │ SqlEditorToolbar                │ │
│  │ ├─ SqlTextEditor │  │ └─ 履歴パネル開閉ボタン(任意)   │ │
│  │ ├─ ResultPanel   │  └─────────────────────────────────┘ │
│  │ └─ SqlEditorHist │                                      │
│  │    oryPanel (新) │  ┌─────────────────────────────────┐ │
│  └──────────────────┘  │ ConfirmDialog                   │ │
│                        │ (削除確認)                       │ │
│  ┌──────────────────┐  └─────────────────────────────────┘ │
│  │ sql-editor.ts    │                                      │
│  │ (Pinia Store)    │                                      │
│  │ ├─ executeQuery()│  (自動履歴保存ロジック追加)        │
│  │ ├─ histories     │                                      │
│  │ └─ loadHistory() │                                      │
│  └────────┬─────────┘                                      │
│           │ invoke()                                        │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│ Tauri API (Rust)                                            │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Tauri Commands   │  │ Services                        │ │
│  │                  │  │                                 │ │
│  │ add_sql_editor_  ├─→│ SqlEditorHistoryService (新規)  │ │
│  │   history        │  │ ├─ add_history()                │ │
│  │ get_sql_editor_  │  │ ├─ get_histories()              │ │
│  │   histories      │  │ ├─ load_history()               │ │
│  │ delete_sql_edit  │  │ └─ delete_history()             │ │
│  │   or_history     │  └─────────┬───────────────────────┘ │
│  └──────────────────┘            │                         │
│                                  │                         │
│  ┌──────────────────┐            │                         │
│  │ Models           │            │                         │
│  │ SqlEditorHistory │◄───────────┘                         │
│  │   Entry (新規)   │                                      │
│  └──────────────────┘                                      │
└───────────┬─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│ File System                                                 │
│                                                             │
│  {data_dir}/                                                │
│    ├─ query_histories/      (Query Builder用、既存)        │
│    │    └─ query_history.json                              │
│    └─ sql_editor_histories/ (SQLエディタ用、新規)          │
│         ├─ {connection_id}_history.jsonl                   │
│         └─ {connection_id}_history.jsonl (複数接続対応)    │
└─────────────────────────────────────────────────────────────┘
```

### 影響範囲

#### フロントエンド

**新規作成**:
- `app/components/sql-editor/SqlEditorHistoryPanel.vue` - 履歴パネルコンポーネント

**更新**:
- `app/components/sql-editor/SqlEditorLayout.vue` - 履歴パネル統合
- `app/components/sql-editor/SqlEditorToolbar.vue` - 履歴パネル開閉ボタン追加（任意）
- `app/stores/sql-editor.ts` - 自動履歴保存ロジック、履歴管理アクション追加
- `app/types/sql-editor.ts` - 型定義追加（`SqlEditorHistoryEntry`等）
- `app/api/sql-editor.ts` - 履歴関連APIメソッド追加

#### バックエンド

**新規作成**:
- `src-tauri/src/models/sql_editor_history.rs` - SQLエディタ履歴専用モデル
- `src-tauri/src/services/sql_editor_history.rs` - SQLエディタ履歴専用サービス
- `src-tauri/src/commands/sql_editor.rs` - Tauriコマンド追加（履歴関連）

**更新**:
- `src-tauri/src/storage/path_manager.rs` - `sql_editor_histories_dir()` メソッド追加
- `src-tauri/src/lib.rs` - コマンド登録

**既存利用（変更なし）**:
- `src-tauri/src/models/query_history.rs` - Query Builder用履歴モデル（既存のまま）
- `src-tauri/src/services/query_history.rs` - Query Builder用履歴サービス（既存のまま）

## 実装方針

### 概要

Phase 5では、既存のQuery Builder用履歴機能（`query_history.rs`）とは完全に独立した、SQLエディタ専用の履歴機能を実装します。モデル・サービス・ストレージを全て分離し、SQL文字列のみを保存するシンプルな履歴システムを構築します。

### 詳細

1. **ストレージの完全分離**
   - SQLエディタ用履歴: `{data_dir}/sql_editor_histories/` に保存
   - Query Builder用履歴: `{data_dir}/query_histories/` に保存（既存）
   - ファイル形式: JSON Lines（1行1履歴、追記型）
     - 例: `{connection_id}_history.jsonl`
   - メリット:
     - 追記が高速（ファイル全体を読み込まずに末尾追記）
     - 行単位で読み取り可能（大量履歴でもメモリ効率が良い）
     - テキストエディタで直接確認可能

2. **データモデルの分離**
   - Query Builder用: `QueryHistory { query: serde_json::Value, ... }` - クエリビルダーの状態を保存
   - SQLエディタ用: `SqlEditorHistoryEntry { sql: String, ... }` - SQL文字列のみ保存

3. **バックエンド実装（Rust）**
   - `sql_editor_history.rs` モデル:
     - `SqlEditorHistoryEntry` - 履歴エントリ
     - `AddSqlEditorHistoryRequest` - 履歴追加リクエスト
     - `SearchSqlEditorHistoryRequest` - 履歴検索リクエスト
   - `sql_editor_history.rs` サービス:
     - JSON Lines形式での読み書き
     - 最大1000件の自動削除
     - 検索・フィルタリング機能
   - Tauriコマンド（`commands/sql_editor.rs`に追加）:
     - `add_sql_editor_history` - 履歴追加
     - `get_sql_editor_histories` - 履歴一覧取得
     - `delete_sql_editor_history` - 履歴削除

4. **フロントエンド実装（Vue/Nuxt）**
   - Piniaストア (`sql-editor.ts`) 更新:
     - `executeQuery()` 内で自動的に履歴保存を呼び出し
     - `histories: SqlEditorHistoryEntry[]` 状態を追加
     - `fetchHistories()`, `loadHistory()`, `deleteHistory()` アクション追加
   - 履歴パネルコンポーネント (`SqlEditorHistoryPanel.vue`):
     - 一覧表示（時系列降順）
     - 検索・フィルタリングUI
     - クリックでエディタ読み込み
     - ホバーで再実行・削除ボタン表示
   - レイアウト統合 (`SqlEditorLayout.vue`):
     - 右側に履歴パネルを配置（リサイズ可能）

5. **自動履歴保存のフロー**
   ```
   ユーザー操作（Ctrl+Enter）
     → sql-editor.ts の executeQuery() 呼び出し
     → app/api/query.ts の executeQuery() でクエリ実行
     → 実行成功/失敗
     → sql-editor.ts 内で add_sql_editor_history() を非同期呼び出し
     → SqlEditorHistoryService.add_history()
     → {connection_id}_history.jsonl に1行追記
     → ストアの histories を更新
     → SqlEditorHistoryPanel に反映
   ```

6. **検索・フィルタリング**
   - クライアントサイドで実装（全履歴をメモリに読み込み）
   - SQL文の部分一致検索
   - 成功/失敗ステータスフィルター

7. **エラーハンドリング**
   - 履歴保存失敗時もクエリ実行自体は成功させる（履歴は副次的処理）
   - 履歴ファイル読み込み失敗時は空の履歴として扱う

## データ構造

### 型定義（TypeScript）

#### app/types/sql-editor.ts（追加）

```typescript
/**
 * SQLエディタの実行履歴エントリ
 * 注: Query Builder用の QueryHistory とは別の型です
 */
export interface SqlEditorHistoryEntry {
  /** 履歴ID (UUID) */
  id: string
  /** 接続ID */
  connectionId: string
  /** 実行したSQL文 */
  sql: string
  /** 実行日時（ISO 8601形式） */
  executedAt: string
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
  /** 実行ステータス */
  status: 'success' | 'error'
  /** 結果行数（SELECT成功時のみ） */
  rowCount?: number
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string
}

/**
 * 履歴追加リクエスト
 */
export interface AddSqlEditorHistoryRequest {
  connectionId: string
  sql: string
  status: 'success' | 'error'
  executionTimeMs: number
  rowCount?: number
  errorMessage?: string
}

/**
 * 履歴検索リクエスト
 */
export interface SearchSqlEditorHistoryRequest {
  connectionId?: string
  keyword?: string
  successOnly?: boolean
  limit?: number
}
```

#### app/stores/sql-editor.ts（更新）

```typescript
import type { SqlEditorHistoryEntry } from '@/types/sql-editor'

export const useSqlEditorStore = defineStore('sql-editor', {
  state: () => ({
    // ... 既存の状態
    histories: [] as SqlEditorHistoryEntry[],
    isLoadingHistories: false,
    historySearchKeyword: '',
    historySuccessOnly: false,
  }),

  getters: {
    // 検索・フィルタリング済みの履歴
    filteredHistories: (state) => {
      let filtered = state.histories

      // 検索キーワードでフィルタ
      if (state.historySearchKeyword) {
        const keyword = state.historySearchKeyword.toLowerCase()
        filtered = filtered.filter(h => h.sql.toLowerCase().includes(keyword))
      }

      // 成功のみフィルタ
      if (state.historySuccessOnly) {
        filtered = filtered.filter(h => h.status === 'success')
      }

      return filtered
    },
  },

  actions: {
    // クエリ実行（既存、履歴保存を追加）
    async executeQuery() {
      // ... 既存の実行ロジック
      const startTime = Date.now()

      try {
        const result = await executeQueryApi({
          connectionId: this.connectionId!,
          sql: this.sql,
        })

        const executionTimeMs = Date.now() - startTime

        // 成功時の履歴保存
        await this.addHistory({
          connectionId: this.connectionId!,
          sql: this.sql,
          status: 'success',
          executionTimeMs,
          rowCount: result.rows?.length,
        })

        // ... 既存の結果処理
      } catch (error) {
        const executionTimeMs = Date.now() - startTime

        // 失敗時の履歴保存
        await this.addHistory({
          connectionId: this.connectionId!,
          sql: this.sql,
          status: 'error',
          executionTimeMs,
          errorMessage: error.message,
        })

        // ... 既存のエラー処理
      }
    },

    // 履歴追加（非同期、エラーは無視）
    async addHistory(request: AddSqlEditorHistoryRequest) {
      try {
        const history = await addSqlEditorHistory(request)
        this.histories.unshift(history) // 先頭に追加
      } catch (error) {
        console.error('Failed to add history:', error)
        // エラーは無視（履歴保存は副次的処理）
      }
    },

    // 履歴一覧取得
    async fetchHistories() {
      if (!this.connectionId) return

      this.isLoadingHistories = true
      try {
        this.histories = await getSqlEditorHistories({
          connectionId: this.connectionId,
        })
      } catch (error) {
        console.error('Failed to fetch histories:', error)
        this.histories = []
      } finally {
        this.isLoadingHistories = false
      }
    },

    // 履歴読み込み（エディタに反映）
    async loadHistory(id: string) {
      const history = this.histories.find(h => h.id === id)
      if (!history) throw new Error('History not found')

      // 未保存の変更がある場合は警告（実装は略）
      // ...

      this.sql = history.sql
      this.isDirty = false
    },

    // 履歴削除
    async deleteHistory(id: string) {
      await deleteSqlEditorHistory(id)
      this.histories = this.histories.filter(h => h.id !== id)
    },

    // 検索キーワード設定
    setHistorySearchKeyword(keyword: string) {
      this.historySearchKeyword = keyword
    },

    // 成功のみフィルタ設定
    setHistorySuccessOnly(value: boolean) {
      this.historySuccessOnly = value
    },
  },
})
```

### 型定義（Rust）

#### src-tauri/src/models/sql_editor_history.rs（新規）

```rust
use serde::{Deserialize, Serialize};

/// SQLエディタの実行履歴エントリ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String, // ISO 8601形式
    pub execution_time_ms: u64,
    pub status: ExecutionStatus,
    pub row_count: Option<u64>,
    pub error_message: Option<String>,
}

/// 実行ステータス
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Success,
    Error,
}

/// 履歴追加リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSqlEditorHistoryRequest {
    pub connection_id: String,
    pub sql: String,
    pub status: ExecutionStatus,
    pub execution_time_ms: u64,
    pub row_count: Option<u64>,
    pub error_message: Option<String>,
}

/// 履歴検索リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSqlEditorHistoryRequest {
    pub connection_id: Option<String>,
    pub keyword: Option<String>,
    pub success_only: Option<bool>,
    pub limit: Option<usize>,
}
```

#### src-tauri/src/services/sql_editor_history.rs（新規）

```rust
use crate::models::sql_editor_history::{
    AddSqlEditorHistoryRequest, ExecutionStatus, SearchSqlEditorHistoryRequest,
    SqlEditorHistoryEntry,
};
use crate::storage::path_manager::PathManager;
use chrono::Utc;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use uuid::Uuid;

const MAX_HISTORY_COUNT: usize = 1000;

pub struct SqlEditorHistoryService {
    histories_dir: PathBuf,
}

impl SqlEditorHistoryService {
    pub fn new(path_manager: &PathManager) -> Result<Self, String> {
        let histories_dir = path_manager.sql_editor_histories_dir();
        std::fs::create_dir_all(&histories_dir).map_err(|e| e.to_string())?;
        Ok(Self { histories_dir })
    }

    /// 履歴ファイルのパスを取得
    fn history_file_path(&self, connection_id: &str) -> PathBuf {
        self.histories_dir
            .join(format!("{}_history.jsonl", connection_id))
    }

    /// 履歴を追加
    pub fn add_history(
        &self,
        request: AddSqlEditorHistoryRequest,
    ) -> Result<SqlEditorHistoryEntry, String> {
        let entry = SqlEditorHistoryEntry {
            id: Uuid::new_v4().to_string(),
            connection_id: request.connection_id.clone(),
            sql: request.sql,
            executed_at: Utc::now().to_rfc3339(),
            execution_time_ms: request.execution_time_ms,
            status: request.status,
            row_count: request.row_count,
            error_message: request.error_message,
        };

        let file_path = self.history_file_path(&request.connection_id);

        // JSON Lines形式で追記
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .map_err(|e| e.to_string())?;

        let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
        writeln!(file, "{}", json).map_err(|e| e.to_string())?;

        // 最大件数チェック（定期的にクリーンアップ）
        self.cleanup_if_needed(&request.connection_id)?;

        Ok(entry)
    }

    /// 履歴一覧取得
    pub fn get_histories(
        &self,
        request: SearchSqlEditorHistoryRequest,
    ) -> Result<Vec<SqlEditorHistoryEntry>, String> {
        let connection_id = request
            .connection_id
            .ok_or("connection_id is required")?;

        let file_path = self.history_file_path(&connection_id);

        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let file = File::open(&file_path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);

        let mut histories: Vec<SqlEditorHistoryEntry> = Vec::new();

        for line in reader.lines() {
            let line = line.map_err(|e| e.to_string())?;
            if let Ok(entry) = serde_json::from_str::<SqlEditorHistoryEntry>(&line) {
                // フィルタリング
                if let Some(keyword) = &request.keyword {
                    if !entry.sql.to_lowercase().contains(&keyword.to_lowercase()) {
                        continue;
                    }
                }

                if request.success_only == Some(true) {
                    if !matches!(entry.status, ExecutionStatus::Success) {
                        continue;
                    }
                }

                histories.push(entry);
            }
        }

        // 新しい順（ファイルは古い順なので逆転）
        histories.reverse();

        // 件数制限
        if let Some(limit) = request.limit {
            histories.truncate(limit);
        }

        Ok(histories)
    }

    /// 履歴削除
    pub fn delete_history(&self, connection_id: &str, id: &str) -> Result<(), String> {
        let file_path = self.history_file_path(connection_id);

        if !file_path.exists() {
            return Err("History file not found".to_string());
        }

        // 全履歴を読み込み、対象を除外して再書き込み
        let file = File::open(&file_path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);

        let mut histories: Vec<SqlEditorHistoryEntry> = Vec::new();

        for line in reader.lines() {
            let line = line.map_err(|e| e.to_string())?;
            if let Ok(entry) = serde_json::from_str::<SqlEditorHistoryEntry>(&line) {
                if entry.id != id {
                    histories.push(entry);
                }
            }
        }

        // ファイルを再作成
        let mut file = File::create(&file_path).map_err(|e| e.to_string())?;
        for entry in histories {
            let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
            writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    /// 最大件数を超えた場合にクリーンアップ
    fn cleanup_if_needed(&self, connection_id: &str) -> Result<(), String> {
        let file_path = self.history_file_path(connection_id);

        if !file_path.exists() {
            return Ok(());
        }

        let file = File::open(&file_path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);

        let mut histories: Vec<SqlEditorHistoryEntry> = Vec::new();

        for line in reader.lines() {
            let line = line.map_err(|e| e.to_string())?;
            if let Ok(entry) = serde_json::from_str::<SqlEditorHistoryEntry>(&line) {
                histories.push(entry);
            }
        }

        if histories.len() <= MAX_HISTORY_COUNT {
            return Ok(());
        }

        // 新しいものから最大件数分を残す（古いものを削除）
        histories.reverse(); // 新しい順に
        histories.truncate(MAX_HISTORY_COUNT);
        histories.reverse(); // 元に戻す（古い順）

        // ファイルを再作成
        let mut file = File::create(&file_path).map_err(|e| e.to_string())?;
        for entry in histories {
            let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
            writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_history() {
        // テスト実装
    }

    #[test]
    fn test_cleanup_if_needed() {
        // テスト実装
    }
}
```

## API設計

### Tauriコマンド

#### src-tauri/src/commands/sql_editor.rs（追加）

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `add_sql_editor_history` | `AddSqlEditorHistoryRequest` | `Result<SqlEditorHistoryEntry, String>` | 履歴を追加する |
| `get_sql_editor_histories` | `SearchSqlEditorHistoryRequest` | `Result<Vec<SqlEditorHistoryEntry>, String>` | 履歴一覧を取得する（検索・フィルタリング対応） |
| `delete_sql_editor_history` | `connection_id: String, id: String` | `Result<(), String>` | 履歴を削除する |

#### app/api/sql-editor.ts（追加）

```typescript
import { invoke } from '@tauri-apps/api/core'
import type {
  SqlEditorHistoryEntry,
  AddSqlEditorHistoryRequest,
  SearchSqlEditorHistoryRequest,
} from '@/types/sql-editor'

/**
 * 履歴を追加
 */
export async function addSqlEditorHistory(
  request: AddSqlEditorHistoryRequest
): Promise<SqlEditorHistoryEntry> {
  return await invoke('add_sql_editor_history', { request })
}

/**
 * 履歴一覧を取得
 */
export async function getSqlEditorHistories(
  request: SearchSqlEditorHistoryRequest
): Promise<SqlEditorHistoryEntry[]> {
  return await invoke('get_sql_editor_histories', { request })
}

/**
 * 履歴を削除
 */
export async function deleteSqlEditorHistory(
  connectionId: string,
  id: string
): Promise<void> {
  return await invoke('delete_sql_editor_history', { connectionId, id })
}
```

## UI設計

### 画面構成

```
┌─────────────────────────────────────────────────────────┐
│ SqlEditorToolbar                                        │
│ [実行] [停止] [保存] ... [履歴]                         │
└─────────────────────────────────────────────────────────┘
┌───────────────────────────┬─────────────────────────────┐
│ SqlTextEditor             │ SqlEditorHistoryPanel       │
│                           │ ┌─────────────────────────┐ │
│ SELECT * FROM users       │ │ [検索ボックス]          │ │
│ WHERE ...                 │ │ ☑ 成功のみ表示          │ │
│                           │ └─────────────────────────┘ │
│                           │                             │
│                           │ ┌─────────────────────────┐ │
│                           │ │ ✅ 5分前  (0.05秒)      │ │
│                           │ │ SELECT * FROM users ... │ │
│                           │ │ 100行                   │ │
│                           │ │ [再実行] [削除]         │ │
│                           │ └─────────────────────────┘ │
│                           │                             │
│                           │ ┌─────────────────────────┐ │
│                           │ │ ❌ 今日 14:32 (1.2秒)   │ │
│                           │ │ UPDATE users SET ...    │ │
│                           │ │ Error: syntax error ... │ │
│                           │ │ [再実行] [削除]         │ │
│                           │ └─────────────────────────┘ │
│                           │                             │
├───────────────────────────┴─────────────────────────────┤
│ ResultPanel                                             │
│ [結果テーブル]                                          │
└─────────────────────────────────────────────────────────┘
```

### コンポーネント設計

#### SqlEditorHistoryPanel.vue（新規）

**Props**: なし（ストアから直接取得）

**主要機能**:
- 履歴一覧表示（`store.filteredHistories` を表示）
- 検索ボックス（`store.setHistorySearchKeyword()` を呼び出し）
- 成功のみフィルタチェックボックス（`store.setHistorySuccessOnly()` を呼び出し）
- 履歴クリックで `store.loadHistory()` を呼び出し
- 再実行ボタンで `store.executeQuery()` を呼び出し（SQL一時変更）
- 削除ボタンで確認ダイアログ表示後、`store.deleteHistory()` を呼び出し

**テンプレート例**:

```vue
<template>
  <div class="flex flex-col h-full">
    <!-- 検索・フィルタ -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
      <UInput
        :model-value="store.historySearchKeyword"
        @update:model-value="store.setHistorySearchKeyword"
        icon="i-heroicons-magnifying-glass"
        placeholder="SQL検索..."
        clearable
      />
      <UCheckbox
        :model-value="store.historySuccessOnly"
        @update:model-value="store.setHistorySuccessOnly"
        label="成功のみ表示"
      />
    </div>

    <!-- 履歴一覧 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div v-if="store.isLoadingHistories" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <div v-else-if="store.filteredHistories.length === 0" class="text-center py-8 text-gray-500">
        履歴がありません
      </div>

      <UCard
        v-for="history in store.filteredHistories"
        :key="history.id"
        class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
        @click="handleLoad(history)"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <!-- ステータスバッジと実行日時 -->
            <div class="flex items-center gap-2 mb-1">
              <UBadge
                :color="history.status === 'success' ? 'success' : 'error'"
                variant="subtle"
                size="xs"
              >
                {{ history.status === 'success' ? '成功' : '失敗' }}
              </UBadge>
              <span class="text-xs text-gray-500">
                {{ formatDate(history.executedAt) }}
              </span>
              <span class="text-xs text-gray-500">
                ({{ formatExecutionTime(history.executionTimeMs) }})
              </span>
            </div>

            <!-- SQL文（省略表示） -->
            <div class="font-mono text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded line-clamp-2 mb-1">
              {{ history.sql }}
            </div>

            <!-- 結果情報 -->
            <div class="text-xs text-gray-500">
              <span v-if="history.rowCount !== undefined">
                {{ history.rowCount }}行
              </span>
              <span v-if="history.errorMessage" class="text-error-500">
                {{ history.errorMessage }}
              </span>
            </div>
          </div>

          <!-- アクションボタン -->
          <div class="flex flex-col gap-1 ml-2">
            <UButton
              icon="i-heroicons-play"
              color="neutral"
              variant="ghost"
              size="xs"
              title="再実行"
              @click.stop="handleReExecute(history)"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="xs"
              title="削除"
              @click.stop="handleDelete(history)"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSqlEditorStore } from '@/stores/sql-editor'
import type { SqlEditorHistoryEntry } from '@/types/sql-editor'

const store = useSqlEditorStore()
const toast = useToast()

onMounted(() => {
  store.fetchHistories()
})

const handleLoad = async (history: SqlEditorHistoryEntry) => {
  try {
    await store.loadHistory(history.id)
    toast.add({
      title: '履歴を読み込みました',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error) {
    toast.add({
      title: '履歴の読み込みに失敗しました',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

const handleReExecute = async (history: SqlEditorHistoryEntry) => {
  const originalSql = store.sql
  store.sql = history.sql
  await store.executeQuery()
  store.sql = originalSql
}

const handleDelete = (history: SqlEditorHistoryEntry) => {
  // 確認ダイアログ表示（実装略）
}

const formatDate = (dateStr: string) => {
  // 相対時間表示（「5分前」「今日 14:32」等）
  // 実装略
}

const formatExecutionTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}秒`
}
</script>
```

## テストコード

### ユニットテスト例

#### app/tests/stores/sql-editor.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '@/stores/sql-editor'
import * as sqlEditorApi from '@/api/sql-editor'

vi.mock('@/api/sql-editor')

describe('sql-editor store - history feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should add history after successful query execution', async () => {
    const store = useSqlEditorStore()
    store.connectionId = 'test-connection'
    store.sql = 'SELECT * FROM users'

    vi.mocked(sqlEditorApi.addSqlEditorHistory).mockResolvedValue({
      id: 'history-1',
      connectionId: 'test-connection',
      sql: 'SELECT * FROM users',
      executedAt: new Date().toISOString(),
      executionTimeMs: 100,
      status: 'success',
      rowCount: 10,
    })

    await store.addHistory({
      connectionId: 'test-connection',
      sql: 'SELECT * FROM users',
      status: 'success',
      executionTimeMs: 100,
      rowCount: 10,
    })

    expect(store.histories).toHaveLength(1)
    expect(store.histories[0].sql).toBe('SELECT * FROM users')
  })

  it('should filter histories by search keyword', () => {
    const store = useSqlEditorStore()
    store.histories = [
      { id: '1', sql: 'SELECT * FROM users', status: 'success' } as any,
      { id: '2', sql: 'SELECT * FROM orders', status: 'success' } as any,
    ]

    store.setHistorySearchKeyword('users')

    expect(store.filteredHistories).toHaveLength(1)
    expect(store.filteredHistories[0].sql).toContain('users')
  })

  it('should filter histories by success status', () => {
    const store = useSqlEditorStore()
    store.histories = [
      { id: '1', sql: 'SELECT *', status: 'success' } as any,
      { id: '2', sql: 'INVALID SQL', status: 'error' } as any,
    ]

    store.setHistorySuccessOnly(true)

    expect(store.filteredHistories).toHaveLength(1)
    expect(store.filteredHistories[0].status).toBe('success')
  })
})
```

### Rustテスト例

#### src-tauri/src/services/sql_editor_history.rs

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::path_manager::PathManager;
    use tempfile::TempDir;

    #[test]
    fn test_add_history() {
        let temp_dir = TempDir::new().unwrap();
        let path_manager = PathManager::new(temp_dir.path().to_path_buf());
        let service = SqlEditorHistoryService::new(&path_manager).unwrap();

        let request = AddSqlEditorHistoryRequest {
            connection_id: "test-conn".to_string(),
            sql: "SELECT * FROM users".to_string(),
            status: ExecutionStatus::Success,
            execution_time_ms: 100,
            row_count: Some(10),
            error_message: None,
        };

        let result = service.add_history(request);
        assert!(result.is_ok());

        let entry = result.unwrap();
        assert_eq!(entry.connection_id, "test-conn");
        assert_eq!(entry.sql, "SELECT * FROM users");
        assert!(matches!(entry.status, ExecutionStatus::Success));
    }

    #[test]
    fn test_get_histories() {
        let temp_dir = TempDir::new().unwrap();
        let path_manager = PathManager::new(temp_dir.path().to_path_buf());
        let service = SqlEditorHistoryService::new(&path_manager).unwrap();

        // 履歴を3件追加
        for i in 1..=3 {
            service
                .add_history(AddSqlEditorHistoryRequest {
                    connection_id: "test-conn".to_string(),
                    sql: format!("SELECT {}", i),
                    status: ExecutionStatus::Success,
                    execution_time_ms: 100,
                    row_count: Some(10),
                    error_message: None,
                })
                .unwrap();
        }

        let histories = service
            .get_histories(SearchSqlEditorHistoryRequest {
                connection_id: Some("test-conn".to_string()),
                keyword: None,
                success_only: None,
                limit: None,
            })
            .unwrap();

        assert_eq!(histories.len(), 3);
        // 新しい順
        assert!(histories[0].sql.contains("3"));
    }

    #[test]
    fn test_cleanup_if_needed() {
        let temp_dir = TempDir::new().unwrap();
        let path_manager = PathManager::new(temp_dir.path().to_path_buf());
        let service = SqlEditorHistoryService::new(&path_manager).unwrap();

        // MAX_HISTORY_COUNT + 10件追加
        for i in 1..=(MAX_HISTORY_COUNT + 10) {
            service
                .add_history(AddSqlEditorHistoryRequest {
                    connection_id: "test-conn".to_string(),
                    sql: format!("SELECT {}", i),
                    status: ExecutionStatus::Success,
                    execution_time_ms: 100,
                    row_count: Some(10),
                    error_message: None,
                })
                .unwrap();
        }

        let histories = service
            .get_histories(SearchSqlEditorHistoryRequest {
                connection_id: Some("test-conn".to_string()),
                keyword: None,
                success_only: None,
                limit: None,
            })
            .unwrap();

        // MAX_HISTORY_COUNT件に制限されている
        assert_eq!(histories.len(), MAX_HISTORY_COUNT);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| Query Builder履歴と完全分離 | データ構造が異なる（SQL文字列 vs QueryState）、混在すると複雑化 | 統一モデルで管理（却下：複雑性増） |
| JSON Lines形式で保存 | 追記が高速、大量履歴でもメモリ効率が良い | 単一JSON配列（却下：追記のたびに全体読み書き） |
| 最大1000件で自動削除 | パフォーマンスとストレージのバランス | 無制限（却下：ストレージ増大）、100件（却下：少なすぎ） |
| 履歴保存は非同期・エラー無視 | クエリ実行が主目的、履歴保存失敗でユーザー体験を損なわない | 同期処理（却下：実行が遅延）、エラー通知（却下：うるさい） |
| クライアントサイド検索 | 実装が簡単、1000件程度なら十分高速 | Rustで検索（可能だが、複雑化）|

## 未解決事項

- [ ] 履歴パネルの開閉状態をローカルストレージに保存するか？
- [ ] 履歴の保持件数を設定UIで変更可能にするか？（Phase 6以降）
- [ ] 履歴の詳細ビュー（実行結果の保存・表示）は必要か？（Phase 6以降）
- [ ] 複数接続間での履歴横断検索は必要か？（将来検討）
