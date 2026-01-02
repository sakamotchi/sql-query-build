# 設計書: 8.4 DELETEビルダー

## アーキテクチャ概要

DELETEビルダーは、既存のmutation-builderページに統合される形で実装します。
INSERTビルダー（8.2）やUPDATEビルダー（8.3）と同様に、mutation-builderページのタブ切り替えで
DELETEモードに切り替わり、右パネルにDeletePanel.vueが表示される構成です。

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│ MutationBuilderToolbar (タブ切り替え: INSERT/UPDATE/DELETE)  │
└─────────────────────────────────────────────────────────────┘
┌────────────┬────────────────────────┬────────────────────────┐
│ LeftPanel  │  CenterPanel          │  RightPanel            │
│ (非表示)   │  (SQLプレビュー)       │  (入力フォーム)        │
│            │                        │                        │
│            │  DELETE FROM table     │  ┌──────────────────┐ │
│            │  WHERE condition       │  │ DeletePanel.vue  │ │
│            │                        │  ├──────────────────┤ │
│            │  [コピー] ボタン        │  │ テーブル選択     │ │
│            │                        │  │ WHERE条件設定    │ │
│            │                        │  └──────────────────┘ │
└────────────┴────────────────────────┴────────────────────────┘
```

## コンポーネント設計

### 新規作成コンポーネント

#### 1. DeletePanel.vue

**責務:**
- DELETE操作のメインUI
- テーブル選択ドロップダウン表示
- WHERE条件設定UI（MutationWhereTab）の表示
- WHERE句なし警告の表示

**Props:**
なし（mutation-builderストアから状態を取得）

**Emits:**
なし

**状態管理:**
- mutation-builderストアを使用
- 内部状態は持たない（シンプルさを優先）

**実装例:**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import TableSelector from './TableSelector.vue'
import MutationWhereTab from './MutationWhereTab.vue'

const store = useMutationBuilderStore()

const selectedTable = computed(() => store.selectedTable)
const hasWhereConditions = computed(() => {
  const model = store.queryModel
  if (!model || model.type !== 'DELETE') return false
  return model.whereConditions && model.whereConditions.length > 0
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- テーブル選択 -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-800">
      <TableSelector />
    </div>

    <!-- WHERE句なし警告 -->
    <div v-if="selectedTable && !hasWhereConditions" class="p-4">
      <UAlert
        color="red"
        icon="i-heroicons-exclamation-triangle"
        title="警告: WHERE句がありません"
        description="WHERE句を指定しないと、テーブルの全行が削除されます。本当に全行削除する場合のみ実行してください。"
      />
    </div>

    <!-- WHERE条件設定 -->
    <div class="flex-1 overflow-hidden">
      <MutationWhereTab />
    </div>
  </div>
</template>
```

### 既存コンポーネントの再利用

#### 1. TableSelector.vue

既存のコンポーネントをそのまま再利用します。mutation-builderストアの
`selectedTable`と`setSelectedTable()`を使用してテーブル選択を管理します。

#### 2. MutationWhereTab.vue

既存のコンポーネントをそのまま再利用します。mutation-builderストアの
`queryModel.whereConditions`を使用してWHERE条件を管理します。

## ストア設計（mutation-builder.ts）

### 追加する型定義

```typescript
// app/types/mutation-query.ts

export interface DeleteQueryModel {
  type: 'DELETE'
  table: string | null
  whereConditions: Array<WhereCondition | ConditionGroup>
}

export type MutationQueryModel = InsertQueryModel | UpdateQueryModel | DeleteQueryModel
```

### 追加するアクション

既存のストアに以下のDELETE関連アクションを追加します（既にUPDATEで実装済みのパターンを踏襲）:

1. `addWhereCondition()` - WHERE条件を追加（既存）
2. `updateWhereCondition()` - WHERE条件を更新（既存）
3. `removeWhereCondition()` - WHERE条件を削除（既存）
4. `addWhereConditionGroup()` - WHERE条件グループを追加（既存）

DELETE専用の新規アクションは不要です。既存のWHERE条件管理アクションをそのまま使用します。

### ストアの初期化ロジック

```typescript
// mutation-builderストアの既存ロジック

watch(
  () => store.mutationType,
  (newType) => {
    // DELETEタブに切り替えた時の初期化
    if (newType === 'DELETE') {
      store.queryModel = {
        type: 'DELETE',
        table: store.selectedTable,
        whereConditions: [],
      } as DeleteQueryModel
    }
  }
)

watch(
  () => store.selectedTable,
  (newTable) => {
    // テーブル変更時、DELETEモデルを更新
    if (store.mutationType === 'DELETE') {
      store.queryModel = {
        type: 'DELETE',
        table: newTable,
        whereConditions: [],
      } as DeleteQueryModel
    }
  }
)
```

## Rust バックエンド設計

### DELETE SQL生成機能

#### ファイル: `src-tauri/src/query/mutation.rs`

既存の`mutation.rs`に`generate_delete_sql`関数を追加します。

```rust
use crate::types::query::{DeleteQueryModel, WhereCondition, ConditionGroup};
use crate::database::dialect::Dialect;

pub fn generate_delete_sql(
    model: &DeleteQueryModel,
    dialect: &dyn Dialect,
) -> Result<String, String> {
    let table = model.table.as_ref().ok_or("Table is required")?;

    let mut sql = format!("DELETE FROM {}", dialect.quote_identifier(table));

    // WHERE句の生成
    if !model.where_conditions.is_empty() {
        let where_clause = generate_where_clause(&model.where_conditions, dialect)?;
        sql.push_str(&format!(" WHERE {}", where_clause));
    }

    Ok(sql)
}

// WHERE句生成は既存のgenerate_where_clause()を再利用
fn generate_where_clause(
    conditions: &[ConditionOrGroup],
    dialect: &dyn Dialect,
) -> Result<String, String> {
    // 既存のUPDATE実装を再利用
    // ...
}
```

#### Tauriコマンド: `src-tauri/src/commands/mutation_commands.rs`

既存の`mutation_commands.rs`に`generate_delete_sql`コマンドを追加します。

```rust
#[tauri::command]
pub async fn generate_delete_sql(
    model: DeleteQueryModel,
    connection_id: String,
) -> Result<String, String> {
    // 接続情報からDB方言を取得
    let dialect = get_dialect(&connection_id)?;

    // SQL生成
    mutation::generate_delete_sql(&model, dialect.as_ref())
}
```

### DELETE実行機能

#### Tauriコマンド: `execute_mutation_query`（既存）

既存の`execute_mutation_query`コマンドを拡張してDELETEに対応します。

```rust
#[tauri::command]
pub async fn execute_mutation_query(
    sql: String,
    connection_id: String,
) -> Result<MutationResult, String> {
    // 接続取得
    let connection = ConnectionService::get_by_id(&connection_id, true).await?;

    // SQL実行
    let executor = get_executor(&connection)?;
    let rows_affected = executor.execute(&sql).await?;

    Ok(MutationResult {
        rows_affected,
        success: true,
        message: format!("{} rows deleted", rows_affected),
    })
}
```

## フロントエンド API設計

### app/api/mutation-builder.ts

既存のAPIファイルに`generateDeleteSql`関数を追加します。

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { DeleteQueryModel } from '@/types/mutation-query'

export async function generateDeleteSql(
  model: DeleteQueryModel,
  connectionId: string
): Promise<string> {
  return await invoke('generate_delete_sql', {
    model,
    connectionId,
  })
}
```

## 安全機能設計

### WHERE句なし警告

#### 1. インライン警告（DeletePanel内）

```vue
<!-- DeletePanel.vue内 -->
<UAlert
  v-if="selectedTable && !hasWhereConditions"
  color="red"
  icon="i-heroicons-exclamation-triangle"
  title="警告: WHERE句がありません"
  description="WHERE句を指定しないと、テーブルの全行が削除されます。本当に全行削除する場合のみ実行してください。"
/>
```

#### 2. DangerousQueryDialog連携

mutation-builderストアの`executeQuery()`で、WHERE句がない場合は
`warningLevel: 'danger'`を設定し、DangerousQueryDialogを表示します。

```typescript
// mutation-builder.ts

async executeQuery() {
  const model = this.queryModel
  if (!model) return

  // WHERE句チェック
  const hasWhere = model.type === 'DELETE' || model.type === 'UPDATE'
    ? (model.whereConditions && model.whereConditions.length > 0)
    : true

  // 警告レベル設定
  let warningLevel: 'info' | 'warning' | 'danger' = 'info'
  if (model.type === 'DELETE') {
    warningLevel = hasWhere ? 'warning' : 'danger'
  }

  // DangerousQueryDialog表示（dangerレベルの場合）
  if (warningLevel === 'danger') {
    const confirmed = await showDangerousQueryDialog({
      sql: this.generatedSql,
      warningLevel,
      message: 'WHERE句がないため、テーブルの全行が削除されます。',
    })
    if (!confirmed) return
  }

  // 実行
  await executeMutationQuery(this.generatedSql, connectionId)
}
```

## データフロー

### DELETE実行の流れ

```
1. ユーザーがDELETEタブを選択
   ↓
2. DeletePanel.vueが表示される
   ↓
3. テーブル選択ドロップダウンでテーブルを選択
   ↓ (mutation-builderストアのsetSelectedTable()呼び出し)
4. mutation-builderストアのselectedTableが更新される
   ↓ (watchでqueryModelが自動更新)
5. MutationWhereTabでWHERE条件を設定
   ↓ (addWhereCondition()等を呼び出し)
6. mutation-builderストアのqueryModel.whereConditionsが更新される
   ↓ (watchでgeneratedSqlが自動生成)
7. Rust側のgenerate_delete_sqlが呼び出される
   ↓
8. SQLプレビューに生成されたDELETE文が表示される
   ↓
9. ユーザーが実行ボタンをクリック
   ↓
10. WHERE句チェック
    ↓ (WHERE句がない場合)
11. DangerousQueryDialog表示（danger レベル）
    ↓ (確認後)
12. execute_mutation_queryが呼び出される
    ↓
13. 削除行数が結果パネルに表示される
```

## エラーハンドリング

### フロントエンド

1. **テーブル未選択エラー**
   - DeletePanel内に空状態を表示
   - 「テーブルを選択してください」メッセージ

2. **SQL生成エラー**
   - エラーメッセージをトーストで表示
   - SQLプレビューにエラー内容を表示

3. **実行エラー**
   - エラーダイアログを表示
   - エラーメッセージとSQLを表示

### バックエンド（Rust）

1. **テーブル未指定エラー**
   - `Err("Table is required")`を返す

2. **WHERE句生成エラー**
   - 無効な条件の場合、`Err("Invalid condition")`を返す

3. **SQL実行エラー**
   - データベースエラーをそのまま返す
   - エラーメッセージをログに記録

## パフォーマンス考慮事項

### SQL生成のパフォーマンス

- SQL生成はRust側で行うため、高速（100ms以内）
- WHERE条件が複雑でも、計算量はO(n)（nは条件数）

### テーブル選択のパフォーマンス

- 既存のTableSelectorを再利用（キャッシュ済み）
- テーブル一覧は接続時に取得済み

### WHERE条件設定のパフォーマンス

- MutationWhereTabは既存実装を再利用
- リアクティブな更新により即座にSQLが生成される

## テスト設計

### 単体テスト（Rust）

#### `generate_delete_sql`テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::dialect::PostgresDialect;

    #[test]
    fn test_generate_delete_sql_with_where() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![
                WhereCondition {
                    column: Some("id".to_string()),
                    operator: "=".to_string(),
                    value: "1".to_string(),
                },
            ],
        };

        let dialect = PostgresDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(sql, "DELETE FROM \"users\" WHERE \"id\" = 1");
    }

    #[test]
    fn test_generate_delete_sql_without_where() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![],
        };

        let dialect = PostgresDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(sql, "DELETE FROM \"users\"");
    }
}
```

### コンポーネントテスト（Vue）

#### DeletePanel.vueテスト

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DeletePanel from '@/components/mutation-builder/DeletePanel.vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('DeletePanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('テーブル未選択時に空状態を表示する', () => {
    const wrapper = mount(DeletePanel)
    expect(wrapper.text()).toContain('テーブルを選択してください')
  })

  it('WHERE句がない場合に警告を表示する', async () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('public.users')
    store.setMutationType('DELETE')

    const wrapper = mount(DeletePanel)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('WHERE句がありません')
  })
})
```

### E2Eテスト

1. **基本的なDELETE実行**
   - テーブル選択 → WHERE条件設定 → 実行 → 削除行数確認

2. **WHERE句なし警告**
   - テーブル選択 → 実行 → 警告ダイアログ確認

3. **実行キャンセル**
   - テーブル選択 → WHERE条件設定 → 実行 → ダイアログでキャンセル

## マイグレーション/デプロイ

### 既存データへの影響

なし（新機能追加のみ）

### 設定変更

なし

### データベーススキーマ変更

なし

## セキュリティ考慮事項

### SQLインジェクション対策

- Rust側で識別子をエスケープ（`dialect.quote_identifier()`）
- 値はプレースホルダーを使用（既存の`generate_where_clause()`が対応）

### 権限チェック

- データベース側の権限チェックに依存
- DELETE権限がない場合、実行時にエラーが返される

### 監査ログ

- 実行したDELETE文は履歴に記録される（既存のクエリ履歴機能）
- WHERE句の有無も記録される

## 将来の拡張性

### Phase 1（本実装）

- 基本的なDELETE機能
- WHERE条件設定
- WHERE句なし警告

### Phase 2（将来対応）

- 複数テーブルのDELETE（JOINを伴うDELETE）
- TRUNCATE文対応
- DELETE ... RETURNING句（PostgreSQL）

### Phase 3（将来対応）

- DELETE前のプレビュー（削除される行を表示）
- バッチDELETE（大量削除の最適化）
- カスケードDELETE警告
