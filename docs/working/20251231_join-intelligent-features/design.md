# 設計書: 6C - JOIN設定インテリジェント機能

**作成日**: 2025-12-31
**対象フェーズ**: Phase 6C

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│ フロントエンド (Vue/TypeScript)                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  JoinConfigDialog.vue                                         │
│  ├─ JoinSuggestionList.vue (新規)                            │
│  │  └─ JoinSuggestionItem.vue (新規)                         │
│  └─ JoinConditionRow.vue (既存)                              │
│                                                               │
│  query-builder.ts (Pinia Store)                              │
│  ├─ joinSuggestions: JoinSuggestion[]                        │
│  └─ fetchJoinSuggestions()                                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ バックエンド (Rust/Tauri)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  commands/join_suggestions.rs (新規)                         │
│  └─ get_join_suggestions(connection_id, tables)             │
│                                                               │
│  services/join_suggestion_engine.rs (新規)                   │
│  ├─ JoinSuggestionEngine                                     │
│  ├─ suggest_joins()                                          │
│  ├─ calculate_join_path()                                    │
│  └─ score_suggestion()                                       │
│                                                               │
│  database/*_inspector.rs (拡張)                              │
│  ├─ PostgresqlInspector::get_foreign_keys()                 │
│  ├─ MysqlInspector::get_foreign_keys()                      │
│  └─ SqliteInspector::get_foreign_keys()                     │
│                                                               │
│  models/foreign_key.rs (新規)                                │
│  └─ ForeignKeyConstraint                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. データモデル

### 2.1 ForeignKeyConstraint (Rust)

**注意**: `ForeignKey`型は既に`src-tauri/src/models/database_structure.rs`に定義されているため、新規作成は不要です。
代わりに、JOIN提案用に既存の`ForeignKey`型を活用します。

既存の`ForeignKey`型:
```rust
// src-tauri/src/models/database_structure.rs (既存)
pub struct ForeignKey {
    pub name: String,
    pub columns: Vec<String>,
    pub referenced_schema: String,
    pub referenced_table: String,
    pub referenced_columns: Vec<String>,
    pub on_delete: String,
    pub on_update: String,
}
```

この型は複合外部キー（複数カラム）にも対応しているため、JOIN提案でそのまま使用できます。

### 2.2 JoinSuggestion (Rust)

```rust
// src-tauri/src/models/join_suggestion.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinSuggestion {
    /// FROM側テーブル（例: "users"）
    pub from_table: String,

    /// TO側テーブル（例: "orders"）
    pub to_table: String,

    /// JOINタイプ（例: "INNER JOIN", "LEFT JOIN"）
    pub join_type: String,

    /// ON条件のリスト
    pub conditions: Vec<JoinCondition>,

    /// 信頼度（0.0〜1.0）
    /// - 1.0: 外部キー制約に基づく
    /// - 0.7: カラム名の完全一致
    /// - 0.5: カラム名の部分一致
    /// - 0.3: データ型のみ一致
    pub confidence: f32,

    /// 提案理由（例: "外部キー制約 'fk_orders_user_id' に基づく"）
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinCondition {
    /// 左側カラム（例: "users.id"）
    pub left_column: String,

    /// 演算子（通常は "="）
    pub operator: String,

    /// 右側カラム（例: "orders.user_id"）
    pub right_column: String,
}
```

### 2.3 JoinSuggestion (TypeScript)

```typescript
// app/types/join-suggestion.ts
export interface JoinSuggestion {
  fromTable: string;
  toTable: string;
  joinType: string;
  conditions: JoinCondition[];
  confidence: number;
  reason: string;
}

export interface JoinCondition {
  leftColumn: string;
  operator: string;
  rightColumn: string;
}
```

---

## 3. バックエンド実装

### 3.1 外部キー情報取得

#### 3.1.1 DatabaseInspectorトレイト拡張

**注意**: `DatabaseInspector`トレイトには既に`get_foreign_keys()`メソッドが定義されていますが、
シグネチャが異なるため、新規メソッド`get_all_foreign_keys()`を追加します。

```rust
// src-tauri/src/services/database_inspector.rs
use crate::models::database_structure::ForeignKey;

#[async_trait::async_trait]
pub trait DatabaseInspector {
    // 既存メソッド（テーブル単位）
    async fn get_foreign_keys(&self, schema: &str, table: &str) -> Result<Vec<ForeignKey>, String>;

    // 新規追加（スキーマ全体）
    /// スキーマ内の全テーブルの外部キー制約を取得
    async fn get_all_foreign_keys(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<TableForeignKey>, String>;
}

/// テーブルと外部キーのペア
#[derive(Debug, Clone)]
pub struct TableForeignKey {
    pub schema: String,
    pub table: String,
    pub foreign_key: ForeignKey,
}
```

#### 3.1.2 PostgreSQL実装

```rust
// src-tauri/src/database/postgresql_inspector.rs
async fn get_all_foreign_keys(
    &self,
    schema: Option<&str>,
) -> Result<Vec<TableForeignKey>, String> {
    let schema_filter = schema.unwrap_or("public");

    // スキーマ内の全テーブルを取得
    let tables = self.get_tables(schema_filter).await?;

    let mut all_fks = Vec::new();

    // 各テーブルの外部キーを取得
    for table in tables {
        let fks = self.get_foreign_keys(schema_filter, &table.name).await?;

        for fk in fks {
            all_fks.push(TableForeignKey {
                schema: schema_filter.to_string(),
                table: table.name.clone(),
                foreign_key: fk,
            });
        }
    }

    Ok(all_fks)
}
```

**実装メモ**: 既存の`get_foreign_keys(schema, table)`メソッドを活用することで、
重複コードを避け、保守性を向上させます。

#### 3.1.3 MySQL実装

```rust
// src-tauri/src/database/mysql_inspector.rs
async fn get_all_foreign_keys(
    &self,
    schema: Option<&str>,
) -> Result<Vec<TableForeignKey>, String> {
    let schema_filter = match schema {
        Some(s) => s.to_string(),
        None => {
            // デフォルトスキーマを取得
            let row: (String,) = sqlx::query_as("SELECT DATABASE()")
                .fetch_one(&*self.pool)
                .await
                .map_err(|e| format!("Failed to get default schema: {}", e))?;
            row.0
        }
    };

    // スキーマ内の全テーブルを取得
    let tables = self.get_tables(&schema_filter).await?;

    let mut all_fks = Vec::new();

    // 各テーブルの外部キーを取得
    for table in tables {
        let fks = self.get_foreign_keys(&schema_filter, &table.name).await?;

        for fk in fks {
            all_fks.push(TableForeignKey {
                schema: schema_filter.clone(),
                table: table.name.clone(),
                foreign_key: fk,
            });
        }
    }

    Ok(all_fks)
}
```

#### 3.1.4 SQLite実装

```rust
// src-tauri/src/database/sqlite_inspector.rs
async fn get_all_foreign_keys(
    &self,
    _schema: Option<&str>,
) -> Result<Vec<TableForeignKey>, String> {
    // SQLiteではスキーマ概念がないため、"main"固定
    let schema_name = "main";

    // 全テーブルを取得
    let tables = self.get_tables(schema_name).await?;

    let mut all_fks = Vec::new();

    // 各テーブルの外部キーを取得
    for table in tables {
        let fks = self.get_foreign_keys(schema_name, &table.name).await?;

        for fk in fks {
            all_fks.push(TableForeignKey {
                schema: schema_name.to_string(),
                table: table.name.clone(),
                foreign_key: fk,
            });
        }
    }

    Ok(all_fks)
}
```

### 3.2 JOIN提案エンジン

```rust
// src-tauri/src/services/join_suggestion_engine.rs
use crate::models::{
    join_suggestion::{JoinCondition, JoinSuggestion},
    database_structure::{ForeignKey, Column},
};
use crate::services::database_inspector::TableForeignKey;
use std::collections::HashMap;

pub struct JoinSuggestionEngine {
    /// テーブルごとの外部キー情報
    foreign_keys: Vec<TableForeignKey>,
    /// テーブル名 -> カラム情報のマップ
    table_columns: HashMap<String, Vec<Column>>,
}

impl JoinSuggestionEngine {
    pub fn new(
        foreign_keys: Vec<TableForeignKey>,
        table_columns: HashMap<String, Vec<Column>>,
    ) -> Self {
        Self {
            foreign_keys,
            table_columns,
        }
    }

    /// テーブル間のJOIN候補を提案
    pub fn suggest_joins(
        &self,
        from_table: &str,
        to_table: &str,
    ) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        // 1. 外部キー制約ベースの提案
        suggestions.extend(self.suggest_by_foreign_keys(from_table, to_table));

        // 2. カラム名ベースの提案
        suggestions.extend(self.suggest_by_column_names(from_table, to_table));

        // 信頼度順にソート
        suggestions.sort_by(|a, b| {
            b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal)
        });

        suggestions
    }

    /// 外部キー制約からJOINを提案
    fn suggest_by_foreign_keys(
        &self,
        from_table: &str,
        to_table: &str,
    ) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        for table_fk in &self.foreign_keys {
            let fk = &table_fk.foreign_key;

            // from_table → to_table のパターン
            if table_fk.table == from_table && fk.referenced_table == to_table {
                let mut conditions = Vec::new();

                // 複合外部キーに対応
                for (from_col, to_col) in fk.columns.iter().zip(fk.referenced_columns.iter()) {
                    conditions.push(JoinCondition {
                        left_column: format!("{}.{}", from_table, from_col),
                        operator: "=".to_string(),
                        right_column: format!("{}.{}", to_table, to_col),
                    });
                }

                suggestions.push(JoinSuggestion {
                    from_table: from_table.to_string(),
                    to_table: to_table.to_string(),
                    join_type: "LEFT JOIN".to_string(),
                    conditions,
                    confidence: 1.0,
                    reason: format!("外部キー制約 '{}' に基づく", fk.name),
                });
            }

            // to_table → from_table のパターン（逆方向）
            if table_fk.table == to_table && fk.referenced_table == from_table {
                let mut conditions = Vec::new();

                for (from_col, to_col) in fk.columns.iter().zip(fk.referenced_columns.iter()) {
                    conditions.push(JoinCondition {
                        left_column: format!("{}.{}", from_table, to_col),
                        operator: "=".to_string(),
                        right_column: format!("{}.{}", to_table, from_col),
                    });
                }

                suggestions.push(JoinSuggestion {
                    from_table: from_table.to_string(),
                    to_table: to_table.to_string(),
                    join_type: "INNER JOIN".to_string(),
                    conditions,
                    confidence: 1.0,
                    reason: format!("外部キー制約 '{}' に基づく（逆方向）", fk.name),
                });
            }
        }

        suggestions
    }

    /// カラム名からJOINを提案
    fn suggest_by_column_names(
        &self,
        from_table: &str,
        to_table: &str,
    ) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        // from_tableのカラムを取得
        let from_columns = self.get_table_columns(from_table);
        let to_columns = self.get_table_columns(to_table);

        for from_col in &from_columns {
            for to_col in &to_columns {
                // 完全一致
                if from_col.name == to_col.name {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "INNER JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.7,
                        reason: format!("カラム名の一致: '{}'", from_col.name),
                    });
                }

                // パターンマッチ: "user_id" ↔ "id" (to_tableが"user"の場合)
                if from_col.name == format!("{}_id", to_table) && to_col.name == "id" {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "LEFT JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.8,
                        reason: format!(
                            "カラム名パターン: '{}.{}' → '{}.{}'",
                            from_table, from_col.name, to_table, to_col.name
                        ),
                    });
                }

                // 逆パターン: "id" ↔ "xxx_id" (from_tableが"xxx"の場合)
                if from_col.name == "id" && to_col.name == format!("{}_id", from_table) {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "INNER JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.8,
                        reason: format!(
                            "カラム名パターン: '{}.{}' ← '{}.{}'",
                            from_table, from_col.name, to_table, to_col.name
                        ),
                    });
                }
            }
        }

        suggestions
    }

    /// テーブルのカラム情報を取得
    fn get_table_columns(&self, table_name: &str) -> &[Column] {
        self.table_columns
            .get(table_name)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }
}
```

### 3.3 Tauriコマンド

```rust
// src-tauri/src/commands/join_suggestions.rs
use crate::{
    models::{join_suggestion::JoinSuggestion, database_structure::Column},
    services::{
        connection_pool::ConnectionPool,
        database_inspector::DatabaseInspectorFactory,
        join_suggestion_engine::JoinSuggestionEngine,
    },
};
use std::collections::HashMap;

#[tauri::command]
pub async fn get_join_suggestions(
    connection_id: String,
    from_table: String,
    to_table: String,
    schema: Option<String>,
    pool_state: tauri::State<'_, ConnectionPool>,
) -> Result<Vec<JoinSuggestion>, String> {
    // 接続取得
    let connection = pool_state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // DatabaseInspectorを作成
    let inspector = DatabaseInspectorFactory::create(&connection, None).await?;

    // 外部キー情報を取得（スキーマ全体）
    let foreign_keys = inspector.get_all_foreign_keys(schema.as_deref()).await?;

    // テーブルのカラム情報を取得
    let schema_name = schema.as_deref().unwrap_or("public");
    let mut table_columns: HashMap<String, Vec<Column>> = HashMap::new();

    // from_tableとto_tableのカラムを取得
    for table_name in &[&from_table, &to_table] {
        let columns = inspector.get_columns(schema_name, table_name).await?;
        table_columns.insert(table_name.to_string(), columns);
    }

    // 提案エンジンを作成
    let engine = JoinSuggestionEngine::new(foreign_keys, table_columns);

    // JOIN提案を取得
    let suggestions = engine.suggest_joins(&from_table, &to_table);

    Ok(suggestions)
}
```

**変更点**:
1. `schema`パラメータを追加（PostgreSQL/MySQLでスキーマ指定可能に）
2. `get_all_foreign_keys()`を使用（新規追加メソッド）
3. `DatabaseStructure`全体ではなく、必要なテーブルのカラムのみ取得（パフォーマンス改善）
4. `DatabaseInspectorFactory::create()`に`password`パラメータ追加（既存実装に合わせる）

---

## 4. フロントエンド実装

### 4.1 API層

```typescript
// app/api/join-suggestions.ts
import { invoke } from '@tauri-apps/api/core';
import type { JoinSuggestion } from '~/types/join-suggestion';

export const joinSuggestionsApi = {
  /**
   * JOIN提案を取得
   */
  async getJoinSuggestions(
    connectionId: string,
    fromTable: string,
    toTable: string,
    schema?: string
  ): Promise<JoinSuggestion[]> {
    return await invoke<JoinSuggestion[]>('get_join_suggestions', {
      connectionId,
      fromTable,
      toTable,
      schema: schema || null,
    });
  },
};
```

### 4.2 Piniaストア拡張

```typescript
// app/stores/query-builder.ts（既存ファイルに追加）
import { joinSuggestionsApi } from '~/api/join-suggestions';
import type { JoinSuggestion } from '~/types/join-suggestion';
import type { JoinClause, JoinCondition as JoinConditionModel } from '~/types/query-model';

export const useQueryBuilderStore = defineStore('query-builder', () => {
  // 既存のstate...

  // 新規追加（stateセクション）
  const joinSuggestions = ref<JoinSuggestion[]>([]);
  const isLoadingSuggestions = ref(false);

  /**
   * JOIN提案を取得
   */
  const fetchJoinSuggestions = async (fromTable: string, toTable: string) => {
    const connectionStore = useConnectionStore();
    const currentConnection = connectionStore.currentConnection;

    if (!currentConnection) {
      console.warn('No active connection');
      return;
    }

    isLoadingSuggestions.value = true;

    try {
      // スキーマを取得（selectedTablesから）
      const schema = selectedTables.value[0]?.schema || 'public';

      joinSuggestions.value = await joinSuggestionsApi.getJoinSuggestions(
        currentConnection.id,
        fromTable,
        toTable,
        schema
      );
    } catch (error) {
      console.error('Failed to fetch join suggestions:', error);
      joinSuggestions.value = [];
    } finally {
      isLoadingSuggestions.value = false;
    }
  };

  /**
   * JOIN提案を適用（JoinConfigDialogで使用）
   * @returns 作成されたJOIN条件（id不要、ダイアログ側で割り当て）
   */
  const applyJoinSuggestion = (suggestion: JoinSuggestion): Omit<JoinClause, 'id'> => {
    // 提案の文字列形式（"table.column"）をパースしてJoinConditionに変換
    const conditions: JoinConditionModel[] = suggestion.conditions.map(cond => {
      const [leftTable, leftColumn] = cond.leftColumn.split('.');
      const [rightTable, rightColumn] = cond.rightColumn.split('.');

      return {
        left: {
          tableAlias: leftTable,
          columnName: leftColumn,
        },
        operator: cond.operator as '=' | '!=' | '>' | '>=' | '<' | '<=',
        right: {
          tableAlias: rightTable,
          columnName: rightColumn,
        },
      };
    });

    // 結合テーブル情報を取得
    const toTableInfo = selectedTables.value.find(t =>
      t.name === suggestion.toTable || t.alias === suggestion.toTable
    );

    if (!toTableInfo) {
      throw new Error(`Table ${suggestion.toTable} not found in selectedTables`);
    }

    return {
      type: suggestion.joinType as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS',
      table: {
        schema: toTableInfo.schema,
        name: toTableInfo.name,
        alias: toTableInfo.alias,
      },
      conditions,
      conditionLogic: 'AND',
    };
  };

  return {
    // 既存のreturn...
    joinSuggestions,
    isLoadingSuggestions,
    fetchJoinSuggestions,
    applyJoinSuggestion,
  };
});
```

**修正点**:
1. `QueryJoin` → `JoinClause`に修正（既存型に合わせる）
2. `generateId()`を削除（ダイアログ側で割り当てるため不要）
3. 提案の文字列形式を既存の`JoinCondition`型に変換するロジックを追加
4. 戻り値を`Omit<JoinClause, 'id'>`に変更（ダイアログで使いやすく）
5. `selectedTables`から結合テーブル情報を取得

### 4.3 コンポーネント実装

#### 4.3.1 JoinSuggestionItem.vue

```vue
<!-- app/components/query-builder/join/JoinSuggestionItem.vue -->
<script setup lang="ts">
import type { JoinSuggestion } from '~/types/join-suggestion';

const props = defineProps<{
  suggestion: JoinSuggestion;
}>();

const emit = defineEmits<{
  apply: [suggestion: JoinSuggestion];
}>();

// 信頼度を星の数に変換
const stars = computed(() => {
  const count = Math.round(props.suggestion.confidence * 5);
  return '★'.repeat(count) + '☆'.repeat(5 - count);
});

// 信頼度に応じた色
const confidenceColor = computed(() => {
  if (props.suggestion.confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (props.suggestion.confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
});

// ON条件のテキスト表示
const conditionText = computed(() => {
  return props.suggestion.conditions
    .map(c => `${c.leftColumn} ${c.operator} ${c.rightColumn}`)
    .join(' AND ');
});
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span :class="confidenceColor" class="text-sm font-medium">
            {{ stars }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ suggestion.reason }}
          </span>
        </div>
        <div class="text-sm font-mono text-gray-700 dark:text-gray-300">
          {{ suggestion.joinType }} {{ suggestion.toTable }}
        </div>
        <div class="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
          ON {{ conditionText }}
        </div>
      </div>
      <UButton
        size="xs"
        color="primary"
        @click="emit('apply', suggestion)"
      >
        適用
      </UButton>
    </div>
  </div>
</template>
```

#### 4.3.2 JoinSuggestionList.vue

```vue
<!-- app/components/query-builder/join/JoinSuggestionList.vue -->
<script setup lang="ts">
import type { JoinSuggestion } from '~/types/join-suggestion';

const props = defineProps<{
  suggestions: JoinSuggestion[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  apply: [suggestion: JoinSuggestion];
}>();
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2 mb-3">
      <Icon name="heroicons:sparkles" class="w-5 h-5 text-yellow-500" />
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        おすすめのJOIN条件
      </h3>
    </div>

    <div v-if="loading" class="text-center py-4">
      <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      <p class="text-sm text-gray-500 mt-2">提案を生成中...</p>
    </div>

    <div v-else-if="suggestions.length === 0" class="text-center py-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        JOIN条件の提案が見つかりませんでした。
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        手動で条件を設定してください。
      </p>
    </div>

    <div v-else class="space-y-2">
      <JoinSuggestionItem
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :suggestion="suggestion"
        @apply="emit('apply', suggestion)"
      />
    </div>
  </div>
</template>
```

#### 4.3.3 JoinConfigDialog.vue（拡張）

```vue
<!-- app/components/query-builder/dialog/JoinConfigDialog.vue -->
<script setup lang="ts">
// 既存のimport...
import JoinSuggestionList from '../join/JoinSuggestionList.vue';
import type { JoinSuggestion } from '@/types/join-suggestion';

// 既存のprops/state...

// 提案機能を追加
const queryBuilderStore = useQueryBuilderStore();
const { joinSuggestions, isLoadingSuggestions } = storeToRefs(queryBuilderStore);

// selectedTableが変更されたときに提案を取得
watch(() => state.value.selectedTable, async (toTable) => {
  if (isOpen.value && toTable) {
    // FROM側のテーブルを特定（最初のテーブル）
    const fromTable = store.selectedTables[0];
    if (fromTable) {
      await queryBuilderStore.fetchJoinSuggestions(
        fromTable.name,
        toTable.name
      );
    }
  }
}, { immediate: true });

// 提案を適用
const applySuggestion = (suggestion: JoinSuggestion) => {
  try {
    // ストアのヘルパーを使用して提案をJoinClause形式に変換
    const joinData = queryBuilderStore.applyJoinSuggestion(suggestion);

    // フォームステートに反映
    state.value.type = joinData.type;
    state.value.conditions = joinData.conditions;
    state.value.conditionLogic = joinData.conditionLogic;
  } catch (error) {
    console.error('Failed to apply join suggestion:', error);
  }
};
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? 'JOINの編集' : 'JOINの追加'"
    :description="'JOINの種類、対象テーブル、結合条件を設定してください。'"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- 既存のJOIN種別選択... -->
        <!-- 既存の結合テーブル選択... -->
        <!-- 既存のエイリアス入力... -->

        <!-- 提案セクション（テーブル選択後、CROSS JOIN以外で表示） -->
        <div
          v-if="state.selectedTable && state.type !== 'CROSS'"
          class="border-t border-gray-200 dark:border-gray-700 pt-4"
        >
          <JoinSuggestionList
            :suggestions="joinSuggestions"
            :loading="isLoadingSuggestions"
            @apply="applySuggestion"
          />
        </div>

        <!-- 既存のON条件設定UI（CROSS JOIN以外）... -->
        <!-- 既存の条件の結合方法... -->
      </div>
    </template>

    <template #footer>
      <!-- 既存のフッター... -->
    </template>
  </UModal>
</template>
```

**修正点**:
1. `watch`ターゲットを`modelValue`から`state.value.selectedTable`に変更
2. FROM側テーブルを`selectedTables[0]`から取得（`queryModel.tables`は存在しない）
3. `applySuggestion()`でストアの`applyJoinSuggestion()`を使用
4. 提案セクションの表示条件を`state.selectedTable && state.type !== 'CROSS'`に変更
5. 既存のJoinConfigDialog実装（L1-267）に合わせたテンプレート構造

---

## 5. テストコード

### 5.1 バックエンド単体テスト

```rust
// src-tauri/src/services/join_suggestion_engine.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_suggest_by_foreign_keys() {
        let fks = vec![
            ForeignKeyConstraint {
                constraint_name: "fk_orders_user_id".to_string(),
                from_schema: "public".to_string(),
                from_table: "orders".to_string(),
                from_column: "user_id".to_string(),
                to_schema: "public".to_string(),
                to_table: "users".to_string(),
                to_column: "id".to_string(),
            },
        ];

        let db_structure = create_test_db_structure();
        let engine = JoinSuggestionEngine::new(fks, db_structure);

        let suggestions = engine.suggest_joins("orders", "users");

        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].confidence, 1.0);
        assert_eq!(suggestions[0].join_type, "LEFT JOIN");
        assert_eq!(suggestions[0].conditions[0].left_column, "orders.user_id");
        assert_eq!(suggestions[0].conditions[0].right_column, "users.id");
    }

    #[test]
    fn test_suggest_by_column_names() {
        let fks = vec![];
        let db_structure = create_test_db_structure_with_matching_columns();
        let engine = JoinSuggestionEngine::new(fks, db_structure);

        let suggestions = engine.suggest_joins("orders", "customers");

        // "orders.customer_id" と "customers.id" が一致
        assert!(suggestions.len() > 0);
        assert_eq!(suggestions[0].confidence, 0.8);
    }

    fn create_test_db_structure() -> DatabaseStructure {
        // テスト用のダミーデータ構造を作成
        // ...
    }
}
```

### 5.2 フロントエンド単体テスト

```typescript
// app/components/query-builder/join/JoinSuggestionItem.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JoinSuggestionItem from './JoinSuggestionItem.vue';

describe('JoinSuggestionItem', () => {
  it('高信頼度の提案は緑色で表示される', () => {
    const suggestion = {
      fromTable: 'users',
      toTable: 'orders',
      joinType: 'LEFT JOIN',
      conditions: [
        {
          leftColumn: 'users.id',
          operator: '=',
          rightColumn: 'orders.user_id',
        },
      ],
      confidence: 1.0,
      reason: '外部キー制約に基づく',
    };

    const wrapper = mount(JoinSuggestionItem, {
      props: { suggestion },
    });

    expect(wrapper.find('.text-green-600').exists()).toBe(true);
    expect(wrapper.text()).toContain('★★★★★');
  });

  it('適用ボタンをクリックするとapplyイベントが発行される', async () => {
    const suggestion = {
      fromTable: 'users',
      toTable: 'orders',
      joinType: 'LEFT JOIN',
      conditions: [],
      confidence: 1.0,
      reason: 'テスト',
    };

    const wrapper = mount(JoinSuggestionItem, {
      props: { suggestion },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('apply')).toBeTruthy();
    expect(wrapper.emitted('apply')![0]).toEqual([suggestion]);
  });
});
```

---

## 6. 実装順序

### Phase 1: バックエンド基盤（タスク6C.1-6C.2）

1. **モデル定義**
   - `src-tauri/src/models/foreign_key.rs` 作成
   - `src-tauri/src/models/join_suggestion.rs` 作成

2. **外部キー取得API**
   - `DatabaseInspector`トレイトに`get_foreign_keys()`追加
   - PostgreSQL/MySQL/SQLite各Inspectorに実装

3. **JOIN提案エンジン**
   - `src-tauri/src/services/join_suggestion_engine.rs` 作成
   - 外部キーベースの提案ロジック実装
   - カラム名ベースの提案ロジック実装

4. **Tauriコマンド**
   - `src-tauri/src/commands/join_suggestions.rs` 作成
   - `get_join_suggestions`コマンド実装
   - `main.rs`に登録

### Phase 2: フロントエンド基盤（タスク6C.3）

5. **型定義とAPI**
   - `app/types/join-suggestion.ts` 作成
   - `app/api/join-suggestions.ts` 作成

6. **Piniaストア拡張**
   - `app/stores/query-builder.ts`に提案関連stateを追加
   - `fetchJoinSuggestions()`、`applyJoinSuggestion()`実装

7. **UIコンポーネント**
   - `app/components/query-builder/join/JoinSuggestionItem.vue` 作成
   - `app/components/query-builder/join/JoinSuggestionList.vue` 作成

### Phase 3: 統合（タスク6C.4）

8. **JoinConfigDialog拡張**
   - `JoinSuggestionList`を統合
   - 提案の自動取得ロジック実装
   - 適用ボタンの動作確認

9. **テスト**
   - バックエンド単体テスト作成
   - フロントエンド単体テスト作成
   - E2Eテスト作成

10. **ドキュメント更新**
    - 永続化ドキュメント更新（`docs/features/query-builder.md`）
    - WBS完了状態を反映

---

## 7. パフォーマンス最適化

### 7.1 外部キー情報のキャッシュ

```typescript
// app/stores/query-builder.ts
const foreignKeysCache = ref<Map<string, ForeignKeyConstraint[]>>(new Map());

const getForeignKeys = async (connectionId: string): Promise<ForeignKeyConstraint[]> => {
  if (foreignKeysCache.value.has(connectionId)) {
    return foreignKeysCache.value.get(connectionId)!;
  }

  const fks = await joinSuggestionsApi.getForeignKeys(connectionId);
  foreignKeysCache.value.set(connectionId, fks);
  return fks;
};
```

### 7.2 提案の debounce

```typescript
// JoinConfigDialog.vue
const debouncedFetchSuggestions = useDebounceFn(async (fromTable: string, toTable: string) => {
  await queryBuilderStore.fetchJoinSuggestions(fromTable, toTable);
}, 300);
```

---

## 8. エラーハンドリング

### 8.1 外部キー取得失敗時

```rust
// join_suggestion_engine.rs
pub fn new_fallback(db_structure: DatabaseStructure) -> Self {
    Self {
        foreign_keys: Vec::new(), // 外部キーなしで初期化
        db_structure,
    }
}
```

### 8.2 提案が0件の場合

```vue
<!-- JoinSuggestionList.vue -->
<div v-if="suggestions.length === 0">
  <p>JOIN条件の提案が見つかりませんでした。</p>
  <p>手動で条件を設定してください。</p>
</div>
```

---

## 9. 将来拡張

### 9.1 機械学習ベースの提案

- 過去のクエリ履歴から学習
- ユーザーごとの傾向を分析
- クエリパフォーマンスを考慮した提案

### 9.2 複数テーブル間の最適パス提案

```rust
pub fn suggest_join_path(
    &self,
    tables: &[String],
) -> Option<Vec<JoinSuggestion>> {
    // グラフ探索アルゴリズムで最短パスを計算
}
```

### 9.3 インデックス情報を考慮した提案

- インデックスが張られているカラムを優先
- クエリパフォーマンスの予測

---

## 10. レビューチェックリスト

### バックエンド
- [ ] 外部キー取得がPostgreSQL/MySQL/SQLiteすべてで動作する
- [ ] JOIN提案エンジンの単体テストが全て通る
- [ ] エラーハンドリングが適切に実装されている
- [ ] パフォーマンステストで5秒以内に応答する

### フロントエンド
- [ ] 提案UIが直感的で理解しやすい
- [ ] 適用ボタンをクリックすると正しくJOINが設定される
- [ ] ローディング状態が適切に表示される
- [ ] エラー時にユーザーフレンドリーなメッセージが表示される

### 統合
- [ ] JoinConfigDialogで提案が自動取得される
- [ ] 提案を適用後、手動編集が可能
- [ ] 保存したクエリを読み込んでも提案が表示される
