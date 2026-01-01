# 設計書 - INSERTビルダー

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
  ├─ InsertPanel.vue (右パネル)
  │   ├─ テーブル選択UI
  │   ├─ カラム・値入力フォーム（複数行対応）
  │   └─ 行追加・削除ボタン
  ├─ mutation-builderストア
  │   ├─ InsertQueryModel管理
  │   └─ SQL生成・実行制御
  └─ Tauri API (invoke)
      ↓
Rust Backend
  ├─ mutation.rs (SQL生成)
  │   └─ generate_insert_sql()
  └─ mutation_commands.rs (Tauriコマンド)
      └─ execute_mutation()
          ↓
Database (PostgreSQL/MySQL/SQLite)
```

### 影響範囲

- **フロントエンド**:
  - 新規: `app/components/mutation-builder/InsertPanel.vue`
  - 拡張: `app/stores/mutation-builder.ts`（INSERT関連のアクション追加）
  - 既存利用: `app/components/query-builder/DatabaseTree.vue`（再利用）
  - 既存利用: Phase 8.1で作成される `app/components/mutation-builder/MutationBuilderLayout.vue`, `MutationBuilderToolbar.vue`

- **バックエンド**:
  - 新規: `src-tauri/src/query/mutation.rs`（INSERT SQL生成エンジン）
  - 新規: `src-tauri/src/commands/mutation_commands.rs`（Tauriコマンド）
  - 既存利用: `src-tauri/src/services/database_inspector.rs`（カラム情報取得）

## 実装方針

### 概要

1. **Phase 8.1の基盤を活用**: Phase 8.1で実装される`mutation-builder`ページ、ストア、型定義を基盤として利用
2. **InsertPanel.vueの実装**: 右パネルにINSERT専用の入力UIを実装
3. **複数行INSERT対応**: 配列でデータを管理し、行の追加・削除を可能にする
4. **Rust側SQL生成**: データベース方言に応じたINSERT文を生成
5. **既存機能との統合**: クエリ保存・履歴、安全機能と連携

### 詳細

1. **InsertPanel.vueの責務**:
   - テーブル選択UI（DatabaseTreeとの連動）
   - カラム一覧表示（型情報含む）
   - 各カラムの値入力フォーム（型に応じた入力コンポーネント）
   - 複数行管理（行追加・削除ボタン）
   - mutation-builderストアとの連携

2. **mutation-builderストアの拡張**:
   - `updateInsertValues()`アクション: 値の更新
   - `addInsertRow()`アクション: 行追加
   - `removeInsertRow()`アクション: 行削除
   - `generateInsertSql()`アクション: Rust側のSQL生成コマンド呼び出し

3. **Rust側SQL生成**:
   - `generate_insert_sql()`関数: InsertQueryModelからINSERT文を生成
   - データベース方言対応（PostgreSQL/MySQL/SQLite）
   - エスケープ処理（SQLインジェクション対策）

4. **既存機能との統合**:
   - `DatabaseTree`: テーブルクリック時に`mutation-builderストア.setSelectedTable()`を呼び出し
   - `DangerousQueryDialog`: 実行前に確認ダイアログ表示（本番環境）
   - `SaveQueryDialog`: INSERT文を保存
   - `QueryHistorySlideover`: INSERT実行履歴を記録

## データ構造

### 型定義（TypeScript）

#### InsertQueryModel（既存 - Phase 8.1）

```typescript
// app/types/mutation-query.ts
export interface InsertQueryModel {
  type: 'INSERT'
  table: string
  columns: string[]
  values: Array<Record<string, any>>
}
```

#### InsertRowData（InsertPanel内部で使用）

```typescript
// InsertPanel.vue内部の型定義
interface InsertRowData {
  id: string  // 行の一意識別子（UUID）
  values: Record<string, {
    value: any
    isNull: boolean
  }>
}

interface ColumnInputConfig {
  columnName: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  isAutoIncrement: boolean
}
```

### 型定義（Rust）

```rust
// src-tauri/src/query/mutation.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertQueryModel {
    #[serde(rename = "type")]
    pub query_type: String,  // "INSERT"
    pub table: String,
    pub columns: Vec<String>,
    pub values: Vec<serde_json::Value>,  // Record<string, any>の配列
}

#[derive(Debug, Clone)]
pub struct InsertSqlResult {
    pub sql: String,
    pub params: Vec<String>,  // プレースホルダー対応（将来的な拡張）
}
```

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `generate_insert_sql` | `InsertQueryModel`, `connection_id: String` | `Result<String, String>` | INSERT文を生成（DB方言対応） |
| `execute_mutation` | `sql: String`, `connection_id: String` | `Result<MutationResult, String>` | INSERT/UPDATE/DELETE実行 |

#### MutationResult型

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct MutationResult {
    pub affected_rows: u64,
    pub execution_time_ms: u64,
}
```

### SQL生成ロジック

```rust
// src-tauri/src/query/mutation.rs
pub fn generate_insert_sql(
    model: &InsertQueryModel,
    dialect: &DatabaseDialect,
) -> Result<String, String> {
    // 1. テーブル名のエスケープ
    let table_name = dialect.escape_identifier(&model.table);

    // 2. カラム名のエスケープ
    let columns = model.columns.iter()
        .map(|col| dialect.escape_identifier(col))
        .collect::<Vec<_>>()
        .join(", ");

    // 3. VALUES句の生成（複数行対応）
    let values_clauses = model.values.iter()
        .map(|row| {
            let values = model.columns.iter()
                .map(|col| {
                    match row.get(col) {
                        Some(value) if !value.is_null() => {
                            dialect.format_value(value)
                        }
                        _ => "NULL".to_string()
                    }
                })
                .collect::<Vec<_>>()
                .join(", ");
            format!("({})", values)
        })
        .collect::<Vec<_>>()
        .join(", ");

    // 4. INSERT文の組み立て
    Ok(format!(
        "INSERT INTO {} ({}) VALUES {}",
        table_name, columns, values_clauses
    ))
}
```

## UI設計

### 画面構成（InsertPanel.vue）

```
┌─────────────────────────────────────────┐
│ 挿入先テーブル: users                    │ ← テーブル名表示
├─────────────────────────────────────────┤
│ 行1  [削除]                              │ ← 行ヘッダー
├─────────────────────────────────────────┤
│ ┌─ id (INT, PRIMARY KEY, AUTO_INCREMENT)│
│ │  [×] NULL  (自動採番のため入力不要)   │
│ ├─ name (VARCHAR)                       │
│ │  [入力欄: ____________________]        │
│ │  [ ] NULL                             │
│ ├─ email (VARCHAR)                      │
│ │  [入力欄: ____________________]        │
│ │  [ ] NULL                             │
│ ├─ is_active (BOOLEAN)                  │
│ │  [✓] 有効                              │
│ └─ created_at (TIMESTAMP)               │
│    [×] NULL  (デフォルト値: NOW())      │
├─────────────────────────────────────────┤
│ 行2  [削除]                              │
├─────────────────────────────────────────┤
│ （同様のフォーム）                       │
├─────────────────────────────────────────┤
│ [+ 行を追加]                             │ ← 行追加ボタン
└─────────────────────────────────────────┘
```

### コンポーネント構成

```vue
InsertPanel.vue
  ├─ テーブル選択ドロップダウン（USelect or 表示のみ）
  ├─ InsertRowForm.vue（v-for="row in rows"）
  │   ├─ 行ヘッダー（行番号 + 削除ボタン）
  │   └─ ColumnInputField.vue（v-for="column in columns"）
  │       ├─ カラム名・型情報表示
  │       ├─ 型に応じた入力コンポーネント
  │       │   ├─ UInput（VARCHAR, INT等）
  │       │   ├─ UCheckbox（BOOLEAN）
  │       │   ├─ UTextarea（TEXT）
  │       │   └─ その他（将来拡張）
  │       └─ NULLチェックボックス
  └─ 行追加ボタン（UButton）
```

### コンポーネント詳細設計

#### InsertPanel.vue

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import type { Column } from '@/types/database-structure'

const mutationStore = useMutationBuilderStore()
const dbStructureStore = useDatabaseStructureStore()

// 選択中のテーブルのカラム情報
const tableColumns = computed<Column[]>(() => {
  if (!mutationStore.selectedTable) return []
  // DatabaseStructureStoreからカラム情報を取得
  return dbStructureStore.getTableColumns(mutationStore.selectedTable)
})

// 入力行の管理
const rows = ref<InsertRowData[]>([createEmptyRow()])

function createEmptyRow(): InsertRowData {
  const values: Record<string, { value: any; isNull: boolean }> = {}
  tableColumns.value.forEach(col => {
    values[col.name] = {
      value: getDefaultValue(col),
      isNull: false
    }
  })
  return {
    id: crypto.randomUUID(),
    values
  }
}

function addRow() {
  rows.value.push(createEmptyRow())
}

function removeRow(rowId: string) {
  if (rows.value.length <= 1) {
    // 最低1行は残す
    return
  }
  rows.value = rows.value.filter(r => r.id !== rowId)
}

// mutation-builderストアへの反映
watch(
  () => rows.value,
  () => {
    updateQueryModel()
  },
  { deep: true }
)

function updateQueryModel() {
  const columns = tableColumns.value.map(col => col.name)
  const values = rows.value.map(row => {
    const rowData: Record<string, any> = {}
    columns.forEach(col => {
      const cellData = row.values[col]
      rowData[col] = cellData.isNull ? null : cellData.value
    })
    return rowData
  })

  mutationStore.updateInsertQueryModel({ columns, values })
}
</script>

<template>
  <div class="insert-panel">
    <!-- テーブル名表示 -->
    <div class="table-info">
      <h3>挿入先テーブル: {{ mutationStore.selectedTable }}</h3>
    </div>

    <!-- 入力行 -->
    <div v-for="(row, index) in rows" :key="row.id" class="insert-row">
      <div class="row-header">
        <span>行{{ index + 1 }}</span>
        <UButton
          v-if="rows.length > 1"
          icon="i-heroicons-trash"
          color="red"
          variant="ghost"
          size="xs"
          @click="removeRow(row.id)"
        />
      </div>

      <!-- カラム入力フィールド -->
      <div v-for="column in tableColumns" :key="column.name" class="column-input">
        <ColumnInputField
          :column="column"
          v-model:value="row.values[column.name].value"
          v-model:is-null="row.values[column.name].isNull"
        />
      </div>
    </div>

    <!-- 行追加ボタン -->
    <UButton
      icon="i-heroicons-plus"
      label="行を追加"
      @click="addRow"
    />
  </div>
</template>
```

#### ColumnInputField.vue（新規コンポーネント）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '@/types/database-structure'

interface Props {
  column: Column
  value: any
  isNull: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:value': [value: any]
  'update:isNull': [isNull: boolean]
}>()

// カラムの型に応じた入力コンポーネントの判定
const inputType = computed(() => {
  const dataType = props.column.data_type.toUpperCase()
  if (dataType.includes('BOOL')) return 'checkbox'
  if (dataType.includes('TEXT')) return 'textarea'
  if (dataType.includes('INT') || dataType.includes('NUMERIC')) return 'number'
  return 'text'
})

// 自動採番カラムかどうか
const isAutoIncrement = computed(() => {
  return props.column.is_primary_key &&
    (props.column.data_type.includes('SERIAL') ||
     props.column.default_value?.includes('AUTO_INCREMENT'))
})

// 入力無効化条件
const isDisabled = computed(() => {
  return props.isNull || isAutoIncrement.value
})
</script>

<template>
  <UFormField
    :label="`${column.name} (${column.data_type})`"
    :hint="isAutoIncrement ? '自動採番' : column.is_primary_key ? 'PRIMARY KEY' : ''"
  >
    <!-- 数値入力 -->
    <UInput
      v-if="inputType === 'number'"
      :model-value="value"
      type="number"
      :disabled="isDisabled"
      @update:model-value="emit('update:value', $event)"
    />

    <!-- テキストエリア -->
    <UTextarea
      v-else-if="inputType === 'textarea'"
      :model-value="value"
      :disabled="isDisabled"
      @update:model-value="emit('update:value', $event)"
    />

    <!-- チェックボックス -->
    <UCheckbox
      v-else-if="inputType === 'checkbox'"
      :model-value="value"
      label="有効"
      :disabled="isDisabled"
      @update:model-value="emit('update:value', $event)"
    />

    <!-- テキスト入力 -->
    <UInput
      v-else
      :model-value="value"
      :disabled="isDisabled"
      @update:model-value="emit('update:value', $event)"
    />

    <!-- NULLチェックボックス -->
    <UCheckbox
      v-if="column.is_nullable && !isAutoIncrement"
      :model-value="isNull"
      label="NULL"
      class="mt-2"
      @update:model-value="emit('update:isNull', $event)"
    />
  </UFormField>
</template>
```

## テストコード

### ユニットテスト例（TypeScript）

```typescript
// tests/components/mutation-builder/InsertPanel.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InsertPanel from '@/components/mutation-builder/InsertPanel.vue'

describe('InsertPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態で1行の入力フォームが表示される', () => {
    const wrapper = mount(InsertPanel)
    const rows = wrapper.findAll('.insert-row')
    expect(rows).toHaveLength(1)
  })

  it('「行を追加」ボタンで新しい行が追加される', async () => {
    const wrapper = mount(InsertPanel)
    const addButton = wrapper.find('button:contains("行を追加")')
    await addButton.trigger('click')

    const rows = wrapper.findAll('.insert-row')
    expect(rows).toHaveLength(2)
  })

  it('最後の1行は削除できない', async () => {
    const wrapper = mount(InsertPanel)
    const deleteButton = wrapper.find('button[icon="i-heroicons-trash"]')
    expect(deleteButton.exists()).toBe(false)
  })

  it('複数行ある場合は削除ボタンが表示される', async () => {
    const wrapper = mount(InsertPanel)
    const addButton = wrapper.find('button:contains("行を追加")')
    await addButton.trigger('click')

    const deleteButtons = wrapper.findAll('button[icon="i-heroicons-trash"]')
    expect(deleteButtons.length).toBeGreaterThan(0)
  })
})
```

### Rustテスト例

```rust
// src-tauri/src/query/mutation.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::dialect::{DatabaseDialect, PostgresDialect};

    #[test]
    fn test_generate_insert_sql_single_row() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice",
                "email": "alice@example.com"
            })],
        };

        let dialect = PostgresDialect::default();
        let sql = generate_insert_sql(&model, &dialect).unwrap();

        assert_eq!(
            sql,
            r#"INSERT INTO "users" ("name", "email") VALUES ('Alice', 'alice@example.com')"#
        );
    }

    #[test]
    fn test_generate_insert_sql_multiple_rows() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![
                serde_json::json!({"name": "Alice", "email": "alice@example.com"}),
                serde_json::json!({"name": "Bob", "email": "bob@example.com"}),
            ],
        };

        let dialect = PostgresDialect::default();
        let sql = generate_insert_sql(&model, &dialect).unwrap();

        assert!(sql.contains("VALUES ('Alice', 'alice@example.com'), ('Bob', 'bob@example.com')"));
    }

    #[test]
    fn test_generate_insert_sql_with_null() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice",
                "email": null
            })],
        };

        let dialect = PostgresDialect::default();
        let sql = generate_insert_sql(&model, &dialect).unwrap();

        assert!(sql.contains("NULL"));
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| **複数行管理を配列で実装** | Vue.jsのリアクティブシステムとの相性が良い。v-forで簡潔に描画可能 | 各行を個別のコンポーネントにする（オーバーヘッド増） |
| **ColumnInputField を独立コンポーネント化** | カラムごとに異なる入力UIを提供でき、テストもしやすい | InsertPanel内にすべて記述（可読性低下） |
| **SQL生成はRust側で実装** | セキュリティ（エスケープ処理）と方言対応を確実に行うため | フロントエンド側でSQL文字列を組み立て（危険） |
| **DatabaseTreeを再利用** | 既存の実装を活用し、一貫性を保つ | mutation-builder専用のツリーを新規実装（重複） |
| **最低1行は必須** | 空のINSERT文を生成しないため（エラー防止） | 0行も許可（実行時エラーになる） |
| **AUTO_INCREMENT/SERIALカラムは入力無効化** | データベースが自動採番するため、ユーザー入力は不要 | 入力可能にする（上書きリスク） |

## 未解決事項

- [ ] **JSON/ARRAY型の入力UI**: 現時点では文字列入力のみ対応。将来的にJSON Editorなどの高度なUIを検討
- [ ] **外部キー制約のバリデーション**: Phase 8では実装しない。将来的にリレーション先の値を選択できるUIを検討
- [ ] **デフォルト値の自動入力**: データベースのDEFAULT値を取得し、フォームに事前入力する機能（Phase 8では未実装）
- [ ] **大量行INSERT時のパフォーマンス**: 100行以上のINSERTをGUIで構築する場合の最適化（仮想スクロール等）
- [ ] **トランザクション制御**: 複数INSERT文をまとめて実行する機能（Phase 8では未実装）
- [ ] **バリデーション**: NOT NULL制約、UNIQUE制約、CHECK制約などのクライアント側バリデーション（将来実装）
