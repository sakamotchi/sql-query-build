# Phase 6A: 基本的なJOIN機能 - 設計書

**作成日**: 2025-12-30
**フェーズ**: 6A

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│ QueryBuilder.vue                                        │
│  ├─ TabNavigation (既存: SELECT, WHERE, GROUP BY...)   │
│  │   └─ JOINタブ (新規)                                 │
│  └─ JoinPanel.vue (新規) - タブコンテンツ               │
│       └─ JOIN一覧リスト + [新規JOIN]ボタン              │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ JoinConfigDialog.vue (新規) - ダイアログ                │
│  └─ JoinConditionRow.vue (既存) x N                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ query-builder.ts (Pinia Store)                          │
│  - joins: JoinClause[]                                  │
│  - addJoin(join)                                        │
│  - updateJoin(id, join)                                 │
│  - removeJoin(id)                                       │
│  - regenerateSql() (既存を拡張)                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Tauri IPC                                               │
│  - generate_sql(query_model) (既存を拡張)               │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Rust: SQL Generator                                     │
│  - src-tauri/src/sql_generator/                         │
│    ├─ mod.rs (JOIN句の生成ロジックを追加)               │
│    ├─ postgres_dialect.rs (JOIN対応)                   │
│    ├─ mysql_dialect.rs (JOIN対応)                      │
│    └─ sqlite_dialect.rs (JOIN対応)                     │
└─────────────────────────────────────────────────────────┘
```

**設計方針変更**:
- 当初は2カラムレイアウト（一覧＋設定パネル）を計画していたが、狭いウィンドウ幅での表示問題を考慮して**リスト表示＋ダイアログ**方式に変更
- JOINタブ: JOIN一覧のリスト表示のみ（狭い幅でも問題なし）
- JOIN追加・編集: 専用ダイアログで広々と編集可能
- 既存のJoinConditionRow.vueコンポーネントを再利用

---

## 2. コンポーネント設計

### 2.1 JoinPanel.vue

**責務**: JOINタブのメインコンテンツ - JOIN一覧の表示とダイアログ制御

**UI構成**:
```
┌──────────────────────────────────────┐
│ JOINタブ                              │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ [+ 新規JOIN]                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ INNER JOIN users (u)        [編] │ │
│ │ ON orders.user_id = u.id    [×] │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ LEFT JOIN products (p)      [編] │ │
│ │ ON orders.product_id = p.id [×] │ │
│ └──────────────────────────────────┘ │
│                                      │
│ (空状態時)                           │
│ 「JOINを追加してください」           │
└──────────────────────────────────────┘
```

**実装例**:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useQueryBuilderStore } from '~/stores/query-builder'
import JoinConfigDialog from '../dialog/JoinConfigDialog.vue'
import type { JoinClause, JoinCondition } from '~/types/query-model'

const store = useQueryBuilderStore()

// ダイアログ状態
const isDialogOpen = ref(false)
const editingJoin = ref<JoinClause | undefined>(undefined)

// テーブルが2つ以上選択されているかチェック
const hasEnoughTables = computed(() => store.selectedTables.length >= 2)

// JOIN追加ダイアログを開く
const handleAddJoin = () => {
  if (!hasEnoughTables.value) return
  editingJoin.value = undefined
  isDialogOpen.value = true
}

// JOIN編集ダイアログを開く
const handleEditJoin = (join: JoinClause) => {
  editingJoin.value = join
  isDialogOpen.value = true
}

// JOIN削除
const handleRemoveJoin = (id: string) => {
  store.removeJoin(id)
}

// JOINを保存（追加または更新）
const handleSaveJoin = (join: JoinClause | Omit<JoinClause, 'id'>) => {
  if ('id' in join) {
    // 更新
    const { id, ...updates } = join
    store.updateJoin(id, updates)
  } else {
    // 追加
    store.addJoin(join)
  }
}

// JOIN条件をフォーマットして表示
const formatConditions = (conditions: JoinCondition[], logic: 'AND' | 'OR') => {
  if (conditions.length === 0) return '(条件なし)'
  return conditions
    .map(c => `${c.left.tableAlias}.${c.left.columnName} ${c.operator} ${c.right.tableAlias}.${c.right.columnName}`)
    .join(` ${logic} `)
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <!-- テーブルが不足している場合 -->
    <div v-if="!hasEnoughTables" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-link-slash" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">JOINを設定するには2つ以上のテーブルが必要です</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        左パネルからテーブルを追加してください
      </p>
    </div>

    <!-- JOIN一覧 -->
    <div v-else class="h-full overflow-y-auto p-4">
      <div class="space-y-3">
        <!-- 新規JOINボタン -->
        <UButton
          icon="i-heroicons-plus"
          size="sm"
          color="primary"
          variant="soft"
          block
          label="新規JOIN"
          @click="handleAddJoin"
        />

        <!-- 空状態 -->
        <div v-if="store.joins.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-heroicons-link" class="text-4xl text-gray-300 dark:text-gray-600 mb-3" />
          <p class="text-sm text-gray-500 dark:text-gray-400">JOINが設定されていません</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            上のボタンからJOINを追加してください
          </p>
        </div>

        <!-- JOIN一覧 -->
        <UCard
          v-for="join in store.joins"
          :key="join.id"
          :ui="{ body: { padding: 'p-3' } }"
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">
                {{ join.type }} JOIN {{ join.table.name }} ({{ join.table.alias }})
              </div>
              <div class="text-xs text-gray-500 mt-1 truncate">
                ON {{ formatConditions(join.conditions, join.conditionLogic) }}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <UButton
                icon="i-heroicons-pencil"
                size="xs"
                color="gray"
                variant="ghost"
                @click="handleEditJoin(join)"
              />
              <UButton
                icon="i-heroicons-x-mark"
                size="xs"
                color="red"
                variant="ghost"
                @click="handleRemoveJoin(join.id)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- JOIN設定ダイアログ -->
    <JoinConfigDialog
      v-model="isDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    />
  </div>
</template>
```

---

### 2.2 JoinConfigDialog.vue

**責務**: JOIN設定ダイアログ - JOIN種別、テーブル、ON条件を設定

**Props**:
```typescript
interface Props {
  join?: JoinClause  // 編集時は既存JOIN、追加時はundefined
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'save', join: JoinClause | Omit<JoinClause, 'id'>): void
}
```

**UI構成**:
```
┌─────────────────────────────────────────┐
│ JOINの追加/編集                    [×]  │
├─────────────────────────────────────────┤
│                                         │
│ JOIN種別 *                              │
│ [INNER ▼]                               │
│                                         │
│ 結合テーブル *                          │
│ [users ▼]                               │
│                                         │
│ エイリアス *                            │
│ [u                ]                     │
│                                         │
│ ON条件 *                                │
│ ┌─────────────────────────────────────┐ │
│ │ [orders ▼].[ user_id ▼]         │ │
│ │ [= ▼]                                │ │
│ │ [users  ▼].[id       ▼]     [×] │ │
│ └─────────────────────────────────────┘ │
│ [+ 条件を追加]                          │
│                                         │
│ 条件の結合                              │
│ ○ AND  ○ OR                             │
│                                         │
├─────────────────────────────────────────┤
│              [キャンセル] [保存]        │
└─────────────────────────────────────────┘
```

**実装**: 既存の [app/components/query-builder/dialog/JoinConfigDialog.vue](app/components/query-builder/dialog/JoinConfigDialog.vue) の実装を参考にする（削除済みなので復元が必要）

---

### 2.3 JoinConditionRow.vue

**責務**: JOIN条件の1行を表示・編集

**実装**: 既存の[JoinConditionRow.vue](app/components/query-builder/dialog/JoinConditionRow.vue:1-175)を使用（USelectベース、Nuxt UI v4対応済み）

**Props**:
```typescript
interface Props {
  condition: JoinCondition
  availableTables: SelectedTable[]
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'update', condition: JoinCondition): void
  (e: 'remove'): void
}
```

**UI構成**:
```
┌───────────────────────────────────────────────────────┐
│ [orders ▼] . [user_id ▼] [= ▼] [users ▼] . [id ▼] [×]│
└───────────────────────────────────────────────────────┘
```

---
## 3. ストア設計（query-builder.ts）

### 3.1 追加する状態

```typescript
// 既存の状態に追加
joins: [] as JoinClause[],
```

### 3.2 追加するアクション

```typescript
/**
 * JOINを追加
 */
addJoin(join: Omit<JoinClause, 'id'>) {
  const newJoin: JoinClause = {
    ...join,
    id: generateId(),  // uuidv4等で生成
  }
  this.joins.push(newJoin)
  this.regenerateSql()
},

/**
 * JOINを更新
 */
updateJoin(id: string, updates: Partial<Omit<JoinClause, 'id'>>) {
  const index = this.joins.findIndex(j => j.id === id)
  if (index !== -1) {
    this.joins[index] = {
      ...this.joins[index],
      ...updates,
    }
    this.regenerateSql()
  }
},

/**
 * JOINを削除
 */
removeJoin(id: string) {
  this.joins = this.joins.filter(j => j.id !== id)
  this.regenerateSql()
},

/**
 * テーブル削除時にそのテーブルを参照するJOINも削除
 */
removeTable(tableId: string) {
  // 既存のロジック
  this.selectedTables = this.selectedTables.filter(t => t.id !== tableId)

  // JOINの削除（追加）
  const removedTable = this.selectedTables.find(t => t.id === tableId)
  if (removedTable) {
    this.joins = this.joins.filter(
      j => j.table.alias !== removedTable.alias
    )
  }

  this.regenerateSql()
},
```

---

## 4. Rust側設計（SQL生成エンジン）

### 4.1 ディレクトリ構成

想定されるパス（実際のパスは実装時に確認）:

```
src-tauri/src/
├─ sql_generator/
│  ├─ mod.rs              # JOIN句生成ロジックを追加
│  ├─ postgres_dialect.rs # PostgreSQL方言
│  ├─ mysql_dialect.rs    # MySQL方言
│  └─ sqlite_dialect.rs   # SQLite方言
└─ models/
   └─ query_model.rs      # QueryModel型定義（JOIN対応）
```

### 4.2 JOIN句の生成ロジック

**疑似コード**:

```rust
// mod.rs
fn generate_join_clause(joins: &[JoinClause], dialect: &dyn SqlDialect) -> String {
    joins.iter()
        .map(|join| generate_single_join(join, dialect))
        .collect::<Vec<_>>()
        .join("\n")
}

fn generate_single_join(join: &JoinClause, dialect: &dyn SqlDialect) -> String {
    let join_type = match join.join_type {
        JoinType::Inner => "INNER JOIN",
        JoinType::Left => "LEFT JOIN",
        JoinType::Right => "RIGHT JOIN",
        JoinType::Full => "FULL OUTER JOIN",
        JoinType::Cross => "CROSS JOIN",
    };

    let table_ref = format!(
        "{}.{} AS {}",
        dialect.quote_identifier(&join.table.schema),
        dialect.quote_identifier(&join.table.name),
        dialect.quote_identifier(&join.table.alias)
    );

    if join.join_type == JoinType::Cross {
        return format!("{} {}", join_type, table_ref);
    }

    let conditions = generate_join_conditions(&join.conditions, join.condition_logic);
    format!("{} {} ON {}", join_type, table_ref, conditions)
}

fn generate_join_conditions(conditions: &[JoinCondition], logic: &str) -> String {
    conditions.iter()
        .map(|c| {
            format!(
                "{}.{} {} {}.{}",
                c.left.table_alias,
                c.left.column_name,
                c.operator,
                c.right.table_alias,
                c.right.column_name
            )
        })
        .collect::<Vec<_>>()
        .join(&format!(" {} ", logic))
}
```

### 4.3 SQL生成例

**入力（QueryModel）**:
```json
{
  "from": {
    "table": {
      "schema": "public",
      "name": "orders",
      "alias": "o"
    }
  },
  "joins": [
    {
      "id": "join-1",
      "type": "INNER",
      "table": {
        "schema": "public",
        "name": "users",
        "alias": "u"
      },
      "conditions": [
        {
          "left": { "tableAlias": "o", "columnName": "user_id" },
          "operator": "=",
          "right": { "tableAlias": "u", "columnName": "id" }
        }
      ],
      "conditionLogic": "AND"
    },
    {
      "id": "join-2",
      "type": "LEFT",
      "table": {
        "schema": "public",
        "name": "products",
        "alias": "p"
      },
      "conditions": [
        {
          "left": { "tableAlias": "o", "columnName": "product_id" },
          "operator": "=",
          "right": { "tableAlias": "p", "columnName": "id" }
        }
      ],
      "conditionLogic": "AND"
    }
  ]
}
```

**出力（PostgreSQL）**:
```sql
SELECT ...
FROM "public"."orders" AS "o"
INNER JOIN "public"."users" AS "u" ON "o"."user_id" = "u"."id"
LEFT JOIN "public"."products" AS "p" ON "o"."product_id" = "p"."id"
WHERE ...
```

---

## 5. データフロー

### 5.1 JOIN追加フロー

```
User: "JOINを追加"ボタンクリック
  ↓
QueryBuilder.vue: showJoinDialog = true
  ↓
JoinConfigDialog.vue: ダイアログ表示
  ↓
User: JOIN種別、テーブル、ON条件を設定
  ↓
User: "保存"ボタンクリック
  ↓
JoinConfigDialog.vue: emit('save', joinData)
  ↓
QueryBuilder.vue: queryBuilderStore.addJoin(joinData)
  ↓
query-builder.ts: joins配列に追加
  ↓
query-builder.ts: regenerateSql()
  ↓
Tauri IPC: generate_sql(queryModel)
  ↓
Rust: SQL生成（JOIN句を含む）
  ↓
query-builder.ts: generatedSql更新
  ↓
QueryBuilder.vue: 生成されたSQLを表示
```

---

## 6. バリデーション

### 6.1 フロントエンド側

- エイリアスの重複チェック
- ON条件が1つ以上あることのチェック（CROSS JOIN除く）
- 左右のテーブルとカラムが選択されていることのチェック

### 6.2 Rust側

- QueryModelのバリデーション（必要に応じて）
- SQL生成時のエスケープ処理

---

## 7. テストコード

### 7.1 単体テスト

**JoinConfigDialog.vue**:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JoinConfigDialog from '~/components/query-builder/dialog/JoinConfigDialog.vue'

describe('JoinConfigDialog', () => {
  it('新規作成時は空の状態で表示される', () => {
    const wrapper = mount(JoinConfigDialog, {
      props: {
        modelValue: true,
      },
    })
    // アサーション
  })

  it('編集時は既存のJOIN設定が表示される', () => {
    const join: JoinClause = {
      id: 'join-1',
      type: 'INNER',
      table: { schema: 'public', name: 'users', alias: 'u' },
      conditions: [
        {
          left: { tableAlias: 'o', columnName: 'user_id' },
          operator: '=',
          right: { tableAlias: 'u', columnName: 'id' },
        },
      ],
      conditionLogic: 'AND',
    }
    const wrapper = mount(JoinConfigDialog, {
      props: {
        modelValue: true,
        join,
      },
    })
    // アサーション
  })

  it('保存ボタンをクリックするとsaveイベントが発火する', async () => {
    const wrapper = mount(JoinConfigDialog, {
      props: {
        modelValue: true,
      },
    })
    // 設定を入力
    // 保存ボタンをクリック
    // saveイベントが発火したことを確認
  })
})
```

**query-builder.ts**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from '~/stores/query-builder'

describe('query-builder store - JOIN機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('JOINを追加できる', () => {
    const store = useQueryBuilderStore()
    const join = {
      type: 'INNER' as const,
      table: { schema: 'public', name: 'users', alias: 'u' },
      conditions: [
        {
          left: { tableAlias: 'o', columnName: 'user_id' },
          operator: '=' as const,
          right: { tableAlias: 'u', columnName: 'id' },
        },
      ],
      conditionLogic: 'AND' as const,
    }

    store.addJoin(join)

    expect(store.joins).toHaveLength(1)
    expect(store.joins[0]).toMatchObject(join)
    expect(store.joins[0].id).toBeDefined()
  })

  it('JOINを更新できる', () => {
    const store = useQueryBuilderStore()
    const join = {
      type: 'INNER' as const,
      table: { schema: 'public', name: 'users', alias: 'u' },
      conditions: [],
      conditionLogic: 'AND' as const,
    }

    store.addJoin(join)
    const joinId = store.joins[0].id

    store.updateJoin(joinId, { type: 'LEFT' })

    expect(store.joins[0].type).toBe('LEFT')
  })

  it('JOINを削除できる', () => {
    const store = useQueryBuilderStore()
    const join = {
      type: 'INNER' as const,
      table: { schema: 'public', name: 'users', alias: 'u' },
      conditions: [],
      conditionLogic: 'AND' as const,
    }

    store.addJoin(join)
    const joinId = store.joins[0].id

    store.removeJoin(joinId)

    expect(store.joins).toHaveLength(0)
  })
})
```

### 7.2 Rust側テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_inner_join() {
        let join = JoinClause {
            id: "join-1".to_string(),
            join_type: JoinType::Inner,
            table: TableReference {
                schema: "public".to_string(),
                name: "users".to_string(),
                alias: "u".to_string(),
            },
            conditions: vec![JoinCondition {
                left: ColumnReference {
                    table_alias: "o".to_string(),
                    column_name: "user_id".to_string(),
                },
                operator: "=".to_string(),
                right: ColumnReference {
                    table_alias: "u".to_string(),
                    column_name: "id".to_string(),
                },
            }],
            condition_logic: "AND".to_string(),
        };

        let dialect = PostgresDialect;
        let sql = generate_single_join(&join, &dialect);

        assert_eq!(
            sql,
            r#"INNER JOIN "public"."users" AS "u" ON "o"."user_id" = "u"."id""#
        );
    }

    #[test]
    fn test_generate_cross_join() {
        let join = JoinClause {
            id: "join-1".to_string(),
            join_type: JoinType::Cross,
            table: TableReference {
                schema: "public".to_string(),
                name: "users".to_string(),
                alias: "u".to_string(),
            },
            conditions: vec![],
            condition_logic: "AND".to_string(),
        };

        let dialect = PostgresDialect;
        let sql = generate_single_join(&join, &dialect);

        assert_eq!(sql, r#"CROSS JOIN "public"."users" AS "u""#);
    }
}
```

---

## 8. 実装順序

1. **Rust側のJOIN SQL生成機能** (6A.4)
   - SQL生成エンジンにJOIN対応を追加
   - 単体テスト実装

2. **JoinConditionRow.vue** (6A.2)
   - ON条件1行のコンポーネント
   - 単体テスト実装

3. **JoinConfigDialog.vue** (6A.1)
   - JOIN設定ダイアログ
   - 単体テスト実装

4. **query-builderストアにJOIN機能追加** (6A.3)
   - addJoin/updateJoin/removeJoinアクション
   - テーブル削除時のJOIN削除処理
   - 単体テスト実装

5. **JoinList.vueとQueryBuilder.vueの統合**
   - TableSelectionPanel内にJOINリスト表示
   - JOINを追加ボタンの配置
   - ダイアログとの連携

6. **総合テスト**
   - 実際にJOINを設定してSQLが生成されることを確認
   - PostgreSQL/MySQL/SQLiteで実行可能なことを確認

---

## 9. マイルストーン

| マイルストーン | 成果物 | 完了条件 |
|--------------|--------|---------|
| MS1 | Rust側JOIN SQL生成 | 単体テストが全てパス |
| MS2 | JoinConditionRow | 単体テストが全てパス |
| MS3 | JoinConfigDialog | 単体テストが全てパス |
| MS4 | ストア統合 | 単体テストが全てパス |
| MS5 | UI統合 | JOINの追加・編集・削除が動作する |
| MS6 | Phase 6A完了 | 全ての完了条件を満たす |

---

## 10. 完了条件（再掲）

- ✅ JOIN設定ダイアログでINNER/LEFT/RIGHT/FULL OUTERを選択できる
- ✅ ON条件を複数設定できる（AND/OR対応）
- ✅ 設定したJOINが正しいSQLに変換される
- ✅ 保存したクエリにJOIN設定が含まれる
- ✅ PostgreSQL/MySQL/SQLiteで実行可能なSQLが生成される
