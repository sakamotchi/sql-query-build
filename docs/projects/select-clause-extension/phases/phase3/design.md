# Phase 3 設計書: サブクエリビルダーUI

**SELECT句拡張プロジェクト - Phase 3**

このドキュメントは Phase 3（サブクエリビルダーUI）の詳細設計を記載します。

- プロジェクト全体概要: [../../design.md](../../design.md)
- Phase 1 設計書: [../phase1/design.md](../phase1/design.md)
- Phase 2 設計書: [../phase2/design.md](../phase2/design.md)
- Phase 3 タスクリスト: [tasklist.md](tasklist.md)
- Phase 3 テスト手順: [testing.md](testing.md)

---

## 1. Phase 3 の目標

Phase 3では、**サブクエリビルダーUI**を実装し、SELECT句でスカラーサブクエリを使用できるようにします。
特に相関サブクエリ（外部クエリのカラムを参照するサブクエリ）に対応します。

### 1.1 実装範囲

- ✅ SubqueryBuilderコンポーネント（ミニクエリビルダー）
- ✅ 相関サブクエリ対応（外部カラム参照）
- ✅ スカラー値バリデーション（単一カラムのみ）
- ✅ 集計サブクエリ対応
- ✅ パフォーマンス最適化

### 1.2 実装しないもの（将来的な拡張）

- ❌ FROM句のサブクエリ（派生テーブル）
- ❌ EXISTS/IN句のサブクエリ（WHERE句では既存実装）
- ❌ CTEサポート（WITH句）

---

## 2. UIコンポーネント設計

### 2.1 SubqueryBuilder コンポーネント

**ファイル**: `app/components/query-builder/SubqueryBuilder.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SubqueryExpression, SubqueryModel, ExpressionNode } from '~/types/expression-node'
import { useQueryBuilderStore } from '~/stores/query-builder'

const props = defineProps<{
  modelValue?: SubqueryExpression
  parentTables?: string[]  // 外部クエリのテーブルリスト（相関サブクエリ用）
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SubqueryExpression]
  'cancel': []
}>()

const store = useQueryBuilderStore()

// サブクエリの状態
const selectedTable = ref<string>('')
const tableAlias = ref<string>('')
const selectExpression = ref<ExpressionNode | null>(null)
const whereConditions = ref<any[]>([])

// 利用可能なテーブルリスト
const availableTables = computed(() => {
  return store.availableTables.map(t => ({
    value: t.name,
    label: t.name
  }))
})

// 選択中のテーブルのカラムリスト
const tableColumns = computed(() => {
  if (!selectedTable.value) return []

  const table = store.availableTables.find(t => t.name === selectedTable.value)
  if (!table) return []

  return table.columns.map(c => ({
    value: c.name,
    label: `${c.name} (${c.type})`
  }))
})

// 外部クエリのカラムリスト（相関サブクエリ用）
const parentColumns = computed(() => {
  if (!props.parentTables || props.parentTables.length === 0) return []

  const columns: any[] = []
  for (const tableName of props.parentTables) {
    const table = store.availableTables.find(t => t.name === tableName)
    if (table) {
      table.columns.forEach(col => {
        columns.push({
          value: `${table.alias || tableName}.${col.name}`,
          label: `外部: ${table.alias || tableName}.${col.name}`
        })
      })
    }
  }
  return columns
})

// SELECT句の種類選択
const selectType = ref<'column' | 'aggregate'>('aggregate')

const selectTypes = [
  { value: 'column', label: '単一カラム' },
  { value: 'aggregate', label: '集計関数' }
]

// 集計関数の選択
const aggregateFunction = ref<string>('COUNT')
const aggregateColumn = ref<string>('*')

const aggregateFunctions = [
  { value: 'COUNT', label: 'COUNT - 行数' },
  { value: 'SUM', label: 'SUM - 合計' },
  { value: 'AVG', label: 'AVG - 平均' },
  { value: 'MIN', label: 'MIN - 最小値' },
  { value: 'MAX', label: 'MAX - 最大値' }
]

// WHERE条件の追加
function addWhereCondition() {
  whereConditions.value.push({
    column: '',
    operator: '=',
    value: '',
    isCorrelated: false  // 相関サブクエリかどうか
  })
}

// WHERE条件の削除
function removeWhereCondition(index: number) {
  whereConditions.value.splice(index, 1)
}

// サブクエリの構築
function buildSubquery() {
  if (!selectedTable.value) return

  // SELECT句の構築
  let selectNode: ExpressionNode

  if (selectType.value === 'aggregate') {
    selectNode = {
      type: 'function',
      name: aggregateFunction.value,
      category: 'aggregate',
      arguments: aggregateColumn.value === '*'
        ? []
        : [
            {
              type: 'column',
              table: tableAlias.value,
              column: aggregateColumn.value
            }
          ]
    }
  } else {
    selectNode = {
      type: 'column',
      table: tableAlias.value,
      column: aggregateColumn.value
    }
  }

  const subquery: SubqueryExpression = {
    type: 'subquery',
    query: {
      select: selectNode,
      from: selectedTable.value,
      alias: tableAlias.value || undefined,
      where_clause: whereConditions.value.length > 0
        ? buildWhereClause()
        : undefined
    }
  }

  emit('update:modelValue', subquery)
}

// WHERE句の構築（簡易版）
function buildWhereClause() {
  // TODO: 実際のWhereClause型に変換
  return {} as any
}

// プレビューSQL
const previewSql = computed(() => {
  if (!selectedTable.value) return ''

  const alias = tableAlias.value || selectedTable.value.charAt(0)
  const selectPart = selectType.value === 'aggregate'
    ? `${aggregateFunction.value}(${aggregateColumn.value === '*' ? '*' : `${alias}.${aggregateColumn.value}`})`
    : `${alias}.${aggregateColumn.value}`

  let sql = `(SELECT ${selectPart} FROM ${selectedTable.value} ${alias}`

  if (whereConditions.value.length > 0) {
    const whereParts = whereConditions.value
      .filter(c => c.column)
      .map(c => `${alias}.${c.column} ${c.operator} ${c.value}`)
    if (whereParts.length > 0) {
      sql += ` WHERE ${whereParts.join(' AND ')}`
    }
  }

  sql += ')'
  return sql
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">サブクエリビルダー</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        スカラー値を返すサブクエリを構築します
      </p>
    </template>

    <div class="space-y-4">
      <!-- FROM句: テーブル選択 -->
      <UFormField label="テーブル" name="table" required>
        <USelectMenu
          v-model="selectedTable"
          :items="availableTables"
          searchable
          placeholder="テーブルを選択..."
        />
      </UFormField>

      <!-- テーブルエイリアス -->
      <UFormField label="エイリアス（オプション）" name="alias">
        <UInput
          v-model="tableAlias"
          placeholder="例: o"
        />
      </UFormField>

      <!-- SELECT句: カラムまたは集計 -->
      <div v-if="selectedTable">
        <UFormField label="SELECT句" name="selectType">
          <USelect v-model="selectType" :items="selectTypes" />
        </UFormField>

        <!-- 集計関数 -->
        <div v-if="selectType === 'aggregate'" class="mt-2 space-y-2">
          <UFormField label="集計関数" name="aggregateFunction">
            <USelect
              v-model="aggregateFunction"
              :items="aggregateFunctions"
            />
          </UFormField>

          <UFormField label="カラム" name="aggregateColumn">
            <USelectMenu
              v-model="aggregateColumn"
              :items="[
                { value: '*', label: '* (全件)' },
                ...tableColumns
              ]"
              searchable
            />
          </UFormField>
        </div>

        <!-- 単一カラム -->
        <div v-else class="mt-2">
          <UFormField label="カラム" name="column">
            <USelectMenu
              v-model="aggregateColumn"
              :items="tableColumns"
              searchable
            />
          </UFormField>
        </div>
      </div>

      <!-- WHERE句 -->
      <div v-if="selectedTable">
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium">WHERE条件</label>
          <UButton size="xs" @click="addWhereCondition">条件を追加</UButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="(condition, index) in whereConditions"
            :key="index"
            class="flex gap-2 items-start"
          >
            <CorrelatedConditionEditor
              v-model="whereConditions[index]"
              :table-columns="tableColumns"
              :parent-columns="parentColumns"
            />
            <UButton
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="removeWhereCondition(index)"
            />
          </div>
        </div>
      </div>

      <!-- プレビュー -->
      <div v-if="previewSql" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">プレビュー:</p>
        <code class="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{{ previewSql }}</code>
      </div>

      <!-- スカラー値の警告 -->
      <UAlert
        v-if="selectType === 'column'"
        color="yellow"
        variant="soft"
        title="注意"
        description="サブクエリは必ずスカラー値（単一の値）を返す必要があります。複数行が返される場合はエラーになります。"
      />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">キャンセル</UButton>
        <UButton
          @click="buildSubquery"
          :disabled="!selectedTable"
        >
          追加
        </UButton>
      </div>
    </template>
  </UCard>
</template>
```

### 2.2 CorrelatedConditionEditor コンポーネント

**ファイル**: `app/components/query-builder/CorrelatedConditionEditor.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: {
    column: string
    operator: string
    value: string
    isCorrelated: boolean
  }
  tableColumns: { value: string; label: string }[]
  parentColumns: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// 値の種類（リテラル値 or 外部カラム参照）
const valueType = ref<'literal' | 'parent_column'>(
  props.modelValue.isCorrelated ? 'parent_column' : 'literal'
)

const valueTypes = [
  { value: 'literal', label: 'リテラル値' },
  { value: 'parent_column', label: '外部カラム参照（相関）' }
]

const operators = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' }
]

// 値の種類が変更されたとき
function onValueTypeChange() {
  emit('update:modelValue', {
    ...props.modelValue,
    isCorrelated: valueType.value === 'parent_column',
    value: ''
  })
}
</script>

<template>
  <div class="flex gap-2 flex-1">
    <!-- カラム選択 -->
    <USelectMenu
      :model-value="modelValue.column"
      @update:model-value="emit('update:modelValue', { ...modelValue, column: $event })"
      :items="tableColumns"
      searchable
      placeholder="カラム..."
      class="w-40"
    />

    <!-- 演算子 -->
    <USelect
      :model-value="modelValue.operator"
      @update:model-value="emit('update:modelValue', { ...modelValue, operator: $event })"
      :items="operators"
      class="w-20"
    />

    <!-- 値の種類 -->
    <USelect
      v-model="valueType"
      :items="valueTypes"
      class="w-36"
      @update:model-value="onValueTypeChange"
    />

    <!-- リテラル値入力 -->
    <UInput
      v-if="valueType === 'literal'"
      :model-value="modelValue.value"
      @update:model-value="emit('update:modelValue', { ...modelValue, value: $event })"
      placeholder="値..."
      class="flex-1"
    />

    <!-- 外部カラム参照 -->
    <USelectMenu
      v-else
      :model-value="modelValue.value"
      @update:model-value="emit('update:modelValue', { ...modelValue, value: $event })"
      :items="parentColumns"
      searchable
      placeholder="外部カラムを選択..."
      class="flex-1"
    />
  </div>
</template>
```

---

## 3. 相関サブクエリの設計

### 3.1 相関サブクエリとは

相関サブクエリは、外部クエリのカラムを参照するサブクエリです。

**例**:
```sql
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u
```

この例では、サブクエリ内の `o.user_id = u.id` が外部クエリのカラム `u.id` を参照しています。

### 3.2 実装方針

1. **外部テーブル情報の受け渡し**
   - メインクエリビルダーから、現在選択中のテーブルリスト（エイリアス付き）をサブクエリビルダーに渡す
   - `parentTables: ['u', 'p']` のような形式

2. **WHERE条件での外部カラム参照**
   - CorrelatedConditionEditorで、値の種類として「外部カラム参照」を選択可能
   - 外部カラムのリストを表示し、選択できるようにする

3. **バリデーション**
   - サブクエリがスカラー値（単一値）を返すことを確認
   - 複数行が返される可能性がある場合は警告

---

## 4. スカラー値バリデーション

### 4.1 バリデーションルール

サブクエリがスカラー値を返すための条件:
1. SELECT句で単一カラムまたは単一の集計関数のみ
2. GROUP BY句がある場合、結果が1行になることを保証
3. WHERE句で外部クエリのキーを参照（相関サブクエリの場合）

### 4.2 実装

**ファイル**: `src-tauri/src/validators/subquery_validator.rs`

```rust
use crate::models::expression_node::SubqueryExpression;
use crate::error::QueryBuilderError;

pub struct SubqueryValidator;

impl SubqueryValidator {
    /// サブクエリがスカラー値を返すか検証
    pub fn validate_scalar(subquery: &SubqueryExpression) -> Result<(), QueryBuilderError> {
        // SELECT句が単一式であることを確認
        // （ExpressionNodeは単一の式を表すので、この時点でOK）

        // 警告: WHERE句がない場合、複数行が返される可能性がある
        if subquery.query.where_clause.is_none() {
            // 警告のみ（エラーではない）
            log::warn!("Subquery without WHERE clause may return multiple rows");
        }

        Ok(())
    }
}
```

---

## 5. パフォーマンス最適化

### 5.1 サブクエリのパフォーマンス考慮事項

サブクエリは外部クエリの各行ごとに実行されるため、パフォーマンスに影響します。

**最適化手法**:
1. **インデックスの利用**: WHERE句でインデックスが効くカラムを使用
2. **集計のみのサブクエリ**: カラム取得よりも集計の方が効率的
3. **LIMIT句の追加**: 複数行が返る可能性がある場合、LIMIT 1を追加

### 5.2 実装

サブクエリビルダーUIで、自動的にLIMIT 1を追加するオプションを提供:

```typescript
const autoLimit = ref(true)  // デフォルトでLIMIT 1を追加

const previewSql = computed(() => {
  // ... SQLを構築

  if (autoLimit.value && selectType.value === 'column') {
    sql += ' LIMIT 1'
  }

  return sql
})
```

---

## 6. 集計サブクエリのサポート

### 6.1 一般的な使用例

```sql
-- ユーザーごとの注文数
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u

-- ユーザーごとの合計購入金額
SELECT
  u.name,
  (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id) AS total_spent
FROM users u

-- 最新の注文日
SELECT
  u.name,
  (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_date
FROM users u
```

### 6.2 実装

SubqueryBuilder で集計関数（COUNT, SUM, AVG, MIN, MAX）を選択できるようにし、自動的にFunctionCall型のExpressionNodeを生成します。

---

## 7. エラーハンドリング

### 7.1 エラーケース

1. **サブクエリが複数行を返す**: 実行時エラー（データベース側）
2. **外部カラムが存在しない**: SQL生成時エラー
3. **循環参照**: サブクエリ内でさらにサブクエリを参照

### 7.2 エラーメッセージ

```typescript
const errorMessages = {
  'multiple_rows': 'サブクエリが複数行を返しています。WHERE句を追加してください。',
  'column_not_found': '指定されたカラムが見つかりません。',
  'circular_reference': 'サブクエリの循環参照が検出されました。'
}
```

---

## 8. テストコード

### 8.1 コンポーネントテスト

**ファイル**: `app/components/query-builder/SubqueryBuilder.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SubqueryBuilder from './SubqueryBuilder.vue'

describe('SubqueryBuilder', () => {
  it('テーブルを選択できる', async () => {
    const wrapper = mount(SubqueryBuilder, {
      props: {
        parentTables: ['u']
      }
    })

    await wrapper.find('[name="table"]').setValue('orders')
    expect(wrapper.find('[name="alias"]').exists()).toBe(true)
  })

  it('集計関数を選択できる', async () => {
    const wrapper = mount(SubqueryBuilder, {
      props: {
        parentTables: ['u']
      }
    })

    await wrapper.find('[name="table"]').setValue('orders')
    await wrapper.find('[name="selectType"]').setValue('aggregate')
    await wrapper.find('[name="aggregateFunction"]').setValue('COUNT')

    expect(wrapper.text()).toContain('COUNT')
  })

  it('相関条件を追加できる', async () => {
    const wrapper = mount(SubqueryBuilder, {
      props: {
        parentTables: ['u']
      }
    })

    await wrapper.find('[name="table"]').setValue('orders')
    await wrapper.find('button:contains("条件を追加")').trigger('click')

    expect(wrapper.findAll('.correlated-condition-editor')).toHaveLength(1)
  })

  it('プレビューSQLが表示される', async () => {
    const wrapper = mount(SubqueryBuilder, {
      props: {
        parentTables: ['u']
      }
    })

    await wrapper.find('[name="table"]').setValue('orders')
    await wrapper.find('[name="aggregateFunction"]').setValue('COUNT')

    expect(wrapper.text()).toContain('SELECT COUNT(*) FROM orders')
  })
})
```

### 8.2 相関サブクエリのE2Eテスト

**ファイル**: `app/tests/e2e/subquery.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { invoke } from '@tauri-apps/api/core'

describe('相関サブクエリE2Eテスト', () => {
  it('ユーザーごとの注文数を取得できる', async () => {
    const query = {
      select: [
        { type: 'column', column: 'name', alias: 'user_name' },
        {
          type: 'expression_node',
          expressionNode: {
            type: 'subquery',
            query: {
              select: {
                type: 'function',
                name: 'COUNT',
                category: 'aggregate',
                arguments: []
              },
              from: 'orders',
              alias: 'o',
              where_clause: {
                conditions: [{
                  column: 'user_id',
                  operator: '=',
                  value: 'u.id',  // 外部カラム参照
                  isCorrelated: true
                }]
              }
            }
          },
          alias: 'order_count'
        }
      ],
      from: 'users',
      alias: 'u'
    }

    const sql = await invoke('generate_sql', { query })

    expect(sql).toContain('(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id)')
  })
})
```

---

## 9. プロジェクト完了確認

Phase 3完了により、SELECT句拡張プロジェクト全体が完了します。

### 9.1 完了基準

- ✅ Phase 1〜3のすべてのタスクが完了
- ✅ 統合テストがすべて合格
- ✅ E2Eテストがすべて合格
- ✅ パフォーマンステストが合格
- ✅ 3つのデータベース（PostgreSQL, MySQL, SQLite）で動作確認完了
- ✅ ドキュメントがすべて更新済み

### 9.2 次の展開

将来的な拡張候補：
- ウィンドウ関数サポート（ROW_NUMBER, RANKなど）
- CTEサポート（WITH句）
- FROM句のサブクエリ（派生テーブル）

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-01-03 | 1.0 | Phase 3詳細設計書を作成 | Claude |
