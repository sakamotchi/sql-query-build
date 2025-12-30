# Phase 6A: 基本的なJOIN機能 - 設計書

**作成日**: 2025-12-30
**フェーズ**: 6A

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│ QueryBuilder.vue                                        │
│  ├─ TableSelectionPanel.vue                            │
│  │   ├─ SelectedTableCard.vue (既存)                   │
│  │   ├─ JoinList.vue (新規)                            │
│  │   └─ "Add JOIN" ボタン                               │
│  └─ JoinConfigDialog.vue (新規)                        │
│       └─ JoinConditionRow.vue (新規) x N               │
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

---

## 2. コンポーネント設計

### 2.1 JoinConfigDialog.vue

**責務**: JOIN設定のモーダルダイアログ

**Props**:
```typescript
interface Props {
  modelValue: boolean  // ダイアログの開閉状態
  join?: JoinClause    // 編集対象のJOIN（新規作成時はundefined）
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', join: JoinClause): void
}
```

**State**:
```typescript
const state = reactive({
  joinType: 'INNER' as JoinClause['type'],
  selectedTable: null as SelectedTable | null,
  tableAlias: '',
  conditions: [] as JoinCondition[],
  conditionLogic: 'AND' as 'AND' | 'OR',
})
```

**UI構成**:
```
┌─────────────────────────────────────────┐
│ JOIN設定                          [×]   │
├─────────────────────────────────────────┤
│ JOIN種別: [INNER ▼]                     │
│                                         │
│ 結合テーブル: [users ▼]                 │
│ エイリアス: [u]                          │
│                                         │
│ ON条件:                                  │
│ ┌─────────────────────────────────────┐ │
│ │ orders.user_id = users.id      [×] │ │
│ └─────────────────────────────────────┘ │
│ [+ 条件を追加]                           │
│                                         │
│ 条件の結合: ○ AND  ○ OR                  │
│                                         │
│              [キャンセル]  [保存]        │
└─────────────────────────────────────────┘
```

**実装例**:
```vue
<template>
  <UModal v-model="isOpen" title="JOIN設定">
    <div class="space-y-4 p-4">
      <!-- JOIN種別 -->
      <UFormGroup label="JOIN種別">
        <USelectMenu
          v-model="state.joinType"
          :options="joinTypes"
        />
      </UFormGroup>

      <!-- 結合テーブル -->
      <UFormGroup label="結合テーブル">
        <USelectMenu
          v-model="state.selectedTable"
          :options="availableTables"
          option-attribute="name"
        />
      </UFormGroup>

      <!-- エイリアス -->
      <UFormGroup label="エイリアス">
        <UInput v-model="state.tableAlias" />
      </UFormGroup>

      <!-- CROSS JOIN以外の場合のみON条件を表示 -->
      <template v-if="state.joinType !== 'CROSS'">
        <!-- ON条件 -->
        <UFormGroup label="ON条件">
          <div class="space-y-2">
            <JoinConditionRow
              v-for="(condition, index) in state.conditions"
              :key="index"
              :condition="condition"
              :available-tables="allTables"
              @update="updateCondition(index, $event)"
              @remove="removeCondition(index)"
            />
            <UButton
              icon="i-heroicons-plus"
              color="gray"
              variant="soft"
              @click="addCondition"
            >
              条件を追加
            </UButton>
          </div>
        </UFormGroup>

        <!-- 条件の結合方法 -->
        <UFormGroup label="条件の結合">
          <URadioGroup
            v-model="state.conditionLogic"
            :options="[
              { label: 'AND', value: 'AND' },
              { label: 'OR', value: 'OR' }
            ]"
          />
        </UFormGroup>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="gray" variant="ghost" @click="cancel">
          キャンセル
        </UButton>
        <UButton color="primary" @click="save">
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

### 2.2 JoinConditionRow.vue

**責務**: JOIN条件の1行を表示・編集

**Props**:
```typescript
interface Props {
  condition: JoinCondition
  availableTables: SelectedTable[]  // 選択可能なテーブル一覧
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

**実装例**:
```vue
<template>
  <div class="flex items-center gap-2">
    <!-- 左側テーブル -->
    <USelectMenu
      :model-value="condition.left.tableAlias"
      :options="tableOptions"
      @update:model-value="updateLeftTable"
    />
    <span class="text-gray-500">.</span>

    <!-- 左側カラム -->
    <USelectMenu
      :model-value="condition.left.columnName"
      :options="leftColumnOptions"
      @update:model-value="updateLeftColumn"
    />

    <!-- 演算子 -->
    <USelectMenu
      :model-value="condition.operator"
      :options="operatorOptions"
      @update:model-value="updateOperator"
    />

    <!-- 右側テーブル -->
    <USelectMenu
      :model-value="condition.right.tableAlias"
      :options="tableOptions"
      @update:model-value="updateRightTable"
    />
    <span class="text-gray-500">.</span>

    <!-- 右側カラム -->
    <USelectMenu
      :model-value="condition.right.columnName"
      :options="rightColumnOptions"
      @update:model-value="updateRightColumn"
    />

    <!-- 削除ボタン -->
    <UButton
      icon="i-heroicons-x-mark"
      color="red"
      variant="ghost"
      size="xs"
      @click="$emit('remove')"
    />
  </div>
</template>
```

---

### 2.3 JoinList.vue

**責務**: 設定済みJOINの一覧表示（TableSelectionPanel内に配置）

**UI構成**:
```
┌─────────────────────────────────────┐
│ JOIN                                │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ INNER JOIN users (u)       [×] │ │
│ │   ON orders.user_id = u.id     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ LEFT JOIN products (p)     [×] │ │
│ │   ON orders.product_id = p.id  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ JOINを追加]                       │
└─────────────────────────────────────┘
```

**実装例**:
```vue
<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-sm">JOIN</h3>
      <UButton
        icon="i-heroicons-plus"
        size="xs"
        color="primary"
        variant="soft"
        @click="$emit('add-join')"
      >
        追加
      </UButton>
    </div>

    <div class="space-y-2">
      <UCard
        v-for="join in joins"
        :key="join.id"
        class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="$emit('edit-join', join)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="font-medium text-sm">
              {{ join.type }} JOIN {{ join.table.name }} ({{ join.table.alias }})
            </div>
            <div class="text-xs text-gray-500 mt-1">
              ON {{ formatConditions(join.conditions, join.conditionLogic) }}
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            size="xs"
            color="red"
            variant="ghost"
            @click.stop="$emit('remove-join', join.id)"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
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
