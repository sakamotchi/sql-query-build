# Phase 2 設計書: 関数ビルダーUI

**SELECT句拡張プロジェクト - Phase 2**

このドキュメントは Phase 2（関数ビルダーUI）の詳細設計を記載します。

- プロジェクト全体概要: [../../design.md](../../design.md)
- Phase 1 設計書: [../phase1/design.md](../phase1/design.md)
- Phase 2 タスクリスト: [tasklist.md](tasklist.md)
- Phase 2 テスト手順: [testing.md](testing.md)

---

## 1. Phase 2 の目標

Phase 2では、Phase 1で構築した式ツリー基盤を使って、**関数ビルダーUI**を実装します。
ユーザーがGUIで一般的なデータベース関数を選択し、引数を設定できるようにします。

### 1.1 実装範囲

- ✅ FunctionBuilderコンポーネント（関数選択と引数設定）
- ✅ 関数マスタデータ（サポートする関数の定義）
- ✅ Piniaストアの拡張（ExpressionNode管理）
- ✅ プレビュー表示UI
- ✅ UIからExpressionNodeへの変換ロジック

### 1.2 実装しないもの（Phase 3）

- ❌ サブクエリビルダーUI
- ❌ 相関サブクエリ対応

---

## 2. UIコンポーネント設計

### 2.1 FunctionBuilder コンポーネント

**ファイル**: `app/components/query-builder/FunctionBuilder.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FunctionCall, ExpressionNode } from '~/types/expression-node'
import { getFunctionCatalog } from '~/data/function-catalog'
import { useConnectionStore } from '~/stores/connection'

const props = defineProps<{
  modelValue?: FunctionCall
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FunctionCall]
  'cancel': []
}>()

const connectionStore = useConnectionStore()

// 選択中のカテゴリと関数
const selectedCategory = ref<string>('string')
const selectedFunction = ref<string>('')
const functionArgs = ref<ExpressionNode[]>([])

// 現在のデータベース種別
const currentDbType = computed(() => connectionStore.currentConnection?.dbType || 'postgresql')

// 現在のDBでサポートされている関数カタログ
const availableFunctions = computed(() => {
  return getFunctionCatalog(currentDbType.value)
})

// カテゴリリスト（現在のDBでサポートされているもののみ）
const categories = computed(() => {
  const uniqueCategories = [...new Set(availableFunctions.value.map(f => f.category))]
  return uniqueCategories.map(cat => ({
    value: cat,
    label: getCategoryLabel(cat)
  }))
})

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'string': '文字列関数',
    'date': '日付関数',
    'numeric': '数値関数',
    'conditional': '条件関数',
    'aggregate': '集計関数'
  }
  return labels[category] || category
}

// 選択中のカテゴリの関数リスト（現在のDBでサポートされているもののみ）
const functions = computed(() => {
  return availableFunctions.value
    .filter(f => f.category === selectedCategory.value)
    .map(f => ({
      value: f.name,
      label: `${f.name} - ${f.description}`
    }))
})

// 選択中の関数定義
const functionDef = computed(() => {
  return availableFunctions.value.find(f => f.name === selectedFunction.value)
})

// 引数の追加
function addArgument() {
  functionArgs.value.push({
    type: 'column',
    column: ''
  })
}

// 引数の削除
function removeArgument(index: number) {
  functionArgs.value.splice(index, 1)
}

// 関数の構築
function buildFunction() {
  if (!selectedFunction.value) return

  const func: FunctionCall = {
    type: 'function',
    name: selectedFunction.value,
    category: selectedCategory.value as any,
    arguments: functionArgs.value
  }

  emit('update:modelValue', func)
}

// プレビューSQL
const previewSql = computed(() => {
  if (!selectedFunction.value || functionArgs.value.length === 0) {
    return ''
  }

  const argsStr = functionArgs.value
    .map(arg => arg.type === 'column' ? arg.column : JSON.stringify(arg))
    .join(', ')

  return `${selectedFunction.value}(${argsStr})`
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">関数ビルダー</h3>
    </template>

    <div class="space-y-4">
      <!-- カテゴリ選択 -->
      <UFormField label="カテゴリ" name="category">
        <USelect v-model="selectedCategory" :items="categories" />
      </UFormField>

      <!-- 関数選択 -->
      <UFormField label="関数" name="function">
        <USelectMenu
          v-model="selectedFunction"
          :items="functions"
          searchable
          placeholder="関数を選択..."
        />
      </UFormField>

      <!-- 関数の説明 -->
      <div v-if="functionDef" class="p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ functionDef.description }}
        </p>
        <p class="text-xs text-gray-500 mt-1">
          引数: {{ functionDef.paramCount }} 個
        </p>
      </div>

      <!-- 引数設定 -->
      <div v-if="selectedFunction">
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium">引数</label>
          <UButton size="xs" @click="addArgument">引数を追加</UButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="(arg, index) in functionArgs"
            :key="index"
            class="flex gap-2 items-center"
          >
            <ArgumentEditor
              v-model="functionArgs[index]"
              :index="index"
            />
            <UButton
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="removeArgument(index)"
            />
          </div>
        </div>
      </div>

      <!-- プレビュー -->
      <div v-if="previewSql" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">プレビュー:</p>
        <code class="text-sm text-blue-600 dark:text-blue-400">{{ previewSql }}</code>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">キャンセル</UButton>
        <UButton @click="buildFunction" :disabled="!selectedFunction || functionArgs.length === 0">
          追加
        </UButton>
      </div>
    </template>
  </UCard>
</template>
```

### 2.2 ArgumentEditor コンポーネント

**ファイル**: `app/components/query-builder/ArgumentEditor.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ExpressionNode } from '~/types/expression-node'
import { useQueryBuilderStore } from '~/stores/query-builder'

const props = defineProps<{
  modelValue: ExpressionNode
  index: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExpressionNode]
}>()

const store = useQueryBuilderStore()

// 引数の種類
const argType = ref<'column' | 'literal' | 'function'>(props.modelValue.type as any)

// 引数の種類の選択肢
const argTypes = [
  { value: 'column', label: 'カラム' },
  { value: 'literal', label: 'リテラル値' },
  { value: 'function', label: '関数' }
]

// カラム選択肢（現在のテーブルのカラムリスト）
const columnItems = computed(() => {
  return store.availableColumns.map(col => ({
    value: col.name,
    label: `${col.table}.${col.name}`
  }))
})

// リテラル値の型
const literalType = ref<'string' | 'number'>('string')
const literalValue = ref<string | number>('')

// 引数の種類が変更されたとき
function onTypeChange() {
  if (argType.value === 'column') {
    emit('update:modelValue', {
      type: 'column',
      column: ''
    })
  } else if (argType.value === 'literal') {
    emit('update:modelValue', {
      type: 'literal',
      valueType: literalType.value,
      value: literalValue.value
    })
  }
}
</script>

<template>
  <div class="flex gap-2 flex-1">
    <!-- 引数の種類 -->
    <USelect
      v-model="argType"
      :items="argTypes"
      class="w-32"
      @update:model-value="onTypeChange"
    />

    <!-- カラム選択 -->
    <USelectMenu
      v-if="argType === 'column'"
      v-model="modelValue.column"
      :items="columnItems"
      searchable
      placeholder="カラムを選択..."
      class="flex-1"
    />

    <!-- リテラル値入力 -->
    <div v-else-if="argType === 'literal'" class="flex gap-2 flex-1">
      <USelect
        v-model="literalType"
        :items="[
          { value: 'string', label: '文字列' },
          { value: 'number', label: '数値' }
        ]"
        class="w-24"
      />
      <UInput
        v-model="literalValue"
        :type="literalType === 'number' ? 'number' : 'text'"
        placeholder="値を入力..."
        class="flex-1"
      />
    </div>

    <!-- ネストした関数（TODO: Phase 2後半で実装） -->
    <UButton
      v-else-if="argType === 'function'"
      variant="outline"
      size="sm"
      class="flex-1"
    >
      関数を選択...
    </UButton>
  </div>
</template>
```

---

## 3. 関数マスタデータ

### 3.1 関数カタログ設計方針

関数カタログは**データベース種別ごとに分割**して管理します。これにより：
- ✅ 現在接続中のDBでサポートされている関数のみ表示
- ✅ DB固有の関数を明確に管理
- ✅ 関数シグネチャの違いに対応（例: MySQLとPostgreSQLでの引数の違い）

### 3.2 関数カタログ型定義

**ファイル**: `app/data/function-catalog.ts`

```typescript
export interface FunctionDefinition {
  name: string
  category: 'string' | 'date' | 'numeric' | 'conditional' | 'aggregate'
  description: string
  paramCount: number | 'variable'  // 固定数 or 可変長
  example: string
  dbSpecificSyntax?: string  // DB固有の構文（オプション）
}

/**
 * データベース種別に応じた関数カタログを取得
 */
export function getFunctionCatalog(dbType: 'postgresql' | 'mysql' | 'sqlite'): FunctionDefinition[] {
  switch (dbType) {
    case 'postgresql':
      return POSTGRESQL_FUNCTIONS
    case 'mysql':
      return MYSQL_FUNCTIONS
    case 'sqlite':
      return SQLITE_FUNCTIONS
    default:
      return COMMON_FUNCTIONS  // 共通関数のみ
  }
}

/**
 * すべてのDBで共通して使える関数
 */
export const COMMON_FUNCTIONS: FunctionDefinition[] = [
  // 文字列関数
  {
    name: 'UPPER',
    category: 'string',
    description: '文字列を大文字に変換',
    paramCount: 1,
    example: "UPPER('hello') → 'HELLO'"
  },
  {
    name: 'LOWER',
    category: 'string',
    description: '文字列を小文字に変換',
    paramCount: 1,
    example: "LOWER('HELLO') → 'hello'"
  },
  {
    name: 'TRIM',
    category: 'string',
    description: '前後の空白を削除',
    paramCount: 1,
    example: "TRIM('  hello  ') → 'hello'"
  },
  {
    name: 'LENGTH',
    category: 'string',
    description: '文字列の長さを取得',
    paramCount: 1,
    example: "LENGTH('hello') → 5"
  },

  // 数値関数
  {
    name: 'ROUND',
    category: 'numeric',
    description: '数値を四捨五入',
    paramCount: 2,
    example: "ROUND(123.456, 2) → 123.46"
  },
  {
    name: 'CEIL',
    category: 'numeric',
    description: '数値を切り上げ',
    paramCount: 1,
    example: "CEIL(123.45) → 124"
  },
  {
    name: 'FLOOR',
    category: 'numeric',
    description: '数値を切り捨て',
    paramCount: 1,
    example: "FLOOR(123.45) → 123"
  },
  {
    name: 'ABS',
    category: 'numeric',
    description: '絶対値を取得',
    paramCount: 1,
    example: "ABS(-123) → 123"
  },

  // 条件関数
  {
    name: 'COALESCE',
    category: 'conditional',
    description: '最初のNULLでない値を返す',
    paramCount: 'variable',
    example: "COALESCE(null, null, 'default') → 'default'"
  },
  {
    name: 'NULLIF',
    category: 'conditional',
    description: '2つの値が等しい場合NULLを返す',
    paramCount: 2,
    example: "NULLIF(value1, value2)"
  },

  // 集計関数
  {
    name: 'COUNT',
    category: 'aggregate',
    description: '行数をカウント',
    paramCount: 1,
    example: "COUNT(*) → 100"
  },
  {
    name: 'SUM',
    category: 'aggregate',
    description: '合計を計算',
    paramCount: 1,
    example: "SUM(price)"
  },
  {
    name: 'AVG',
    category: 'aggregate',
    description: '平均を計算',
    paramCount: 1,
    example: "AVG(price)"
  },
  {
    name: 'MIN',
    category: 'aggregate',
    description: '最小値を取得',
    paramCount: 1,
    example: "MIN(price)"
  },
  {
    name: 'MAX',
    category: 'aggregate',
    description: '最大値を取得',
    paramCount: 1,
    example: "MAX(price)"
  }
]

/**
 * PostgreSQL専用関数カタログ
 */
export const POSTGRESQL_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,

  // PostgreSQL専用文字列関数
  {
    name: 'CONCAT',
    category: 'string',
    description: '文字列を連結',
    paramCount: 'variable',
    example: "CONCAT('Hello', ' ', 'World') → 'Hello World'"
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTRING('hello', 1, 3) → 'hel'"
  },

  // PostgreSQL専用日付関数
  {
    name: 'NOW',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 0,
    example: "NOW() → '2026-01-03 10:30:00'"
  },
  {
    name: 'CURRENT_DATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 0,
    example: "CURRENT_DATE → '2026-01-03'"
  },
  {
    name: 'EXTRACT',
    category: 'date',
    description: '日付から特定の部分を抽出',
    paramCount: 2,
    example: "EXTRACT(YEAR FROM date)",
    dbSpecificSyntax: 'EXTRACT(field FROM source)'
  },
  {
    name: 'TO_CHAR',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "TO_CHAR(date, 'YYYY-MM-DD')"
  }
]

/**
 * MySQL専用関数カタログ
 */
export const MYSQL_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,

  // MySQL専用文字列関数
  {
    name: 'CONCAT',
    category: 'string',
    description: '文字列を連結',
    paramCount: 'variable',
    example: "CONCAT('Hello', ' ', 'World') → 'Hello World'"
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTRING('hello', 1, 3) → 'hel'"
  },

  // MySQL専用日付関数
  {
    name: 'NOW',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 0,
    example: "NOW() → '2026-01-03 10:30:00'"
  },
  {
    name: 'CURDATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 0,
    example: "CURDATE() → '2026-01-03'"
  },
  {
    name: 'DATE_FORMAT',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "DATE_FORMAT(date, '%Y-%m-%d')"
  },
  {
    name: 'YEAR',
    category: 'date',
    description: '年を抽出',
    paramCount: 1,
    example: "YEAR(date) → 2026"
  },
  {
    name: 'MONTH',
    category: 'date',
    description: '月を抽出',
    paramCount: 1,
    example: "MONTH(date) → 1"
  },
  {
    name: 'DAY',
    category: 'date',
    description: '日を抽出',
    paramCount: 1,
    example: "DAY(date) → 3"
  }
]

/**
 * SQLite専用関数カタログ
 */
export const SQLITE_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,

  // SQLite専用文字列関数
  {
    name: 'SUBSTR',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTR('hello', 1, 3) → 'hel'",
    dbSpecificSyntax: 'SUBSTR(string, start, length)'
  },
  {
    name: '||',
    category: 'string',
    description: '文字列を連結（演算子）',
    paramCount: 2,
    example: "'Hello' || ' ' || 'World' → 'Hello World'",
    dbSpecificSyntax: "string1 || string2"
  },

  // SQLite専用日付関数
  {
    name: 'DATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 1,
    example: "DATE('now') → '2026-01-03'"
  },
  {
    name: 'DATETIME',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 1,
    example: "DATETIME('now') → '2026-01-03 10:30:00'"
  },
  {
    name: 'STRFTIME',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "STRFTIME('%Y-%m-%d', date)"
  }
]
```

### 3.3 データベース固有の考慮事項

| データベース | 特徴 | 注意点 |
|------------|------|--------|
| **PostgreSQL** | 標準SQLに準拠、豊富な関数 | EXTRACTの特殊構文 |
| **MySQL** | 独自の日付関数が豊富 | DATE_FORMAT、YEAR/MONTH/DAY等 |
| **SQLite** | 最小限の関数セット | CONCAT→`||`演算子、SUBSTR関数名 |
```

---

## 4. Piniaストア拡張

### 4.1 query-builder ストアの拡張

**ファイル**: `app/stores/query-builder.ts`（拡張）

```typescript
import { defineStore } from 'pinia'
import type { ExpressionNode, FunctionCall } from '~/types/expression-node'
import type { SelectColumn } from '~/types/query-model'

export const useQueryBuilderStore = defineStore('query-builder', {
  state: () => ({
    // 既存のstate...
    selectedColumns: [] as SelectColumn[],

    // Expression Node編集用の一時state
    editingExpression: null as ExpressionNode | null,
    expressionDialogOpen: false
  }),

  getters: {
    // 利用可能なカラムリスト（現在選択中のテーブルから）
    availableColumns: (state) => {
      // TODO: 選択中のテーブルからカラムリストを取得
      return []
    },

    // ExpressionNodeを含むSelectColumnのプレビューSQL
    getColumnPreviewSql: (state) => (column: SelectColumn) => {
      if (column.type === 'expression_node' && column.expressionNode) {
        return generatePreviewSql(column.expressionNode)
      }
      return ''
    }
  },

  actions: {
    // ExpressionNodeを含むSelectColumnを追加
    addExpressionColumn(expressionNode: ExpressionNode, alias?: string) {
      const column: SelectColumn = {
        type: 'expression_node',
        expressionNode,
        alias
      }
      this.selectedColumns.push(column)
    },

    // 関数ビルダーダイアログを開く
    openFunctionBuilder() {
      this.editingExpression = null
      this.expressionDialogOpen = true
    },

    // 関数ビルダーダイアログを閉じる
    closeFunctionBuilder() {
      this.editingExpression = null
      this.expressionDialogOpen = false
    },

    // 関数を追加
    addFunction(func: FunctionCall, alias?: string) {
      this.addExpressionColumn(func, alias)
      this.closeFunctionBuilder()
    }
  }
})

// プレビューSQL生成（簡易版、実際のSQL生成はバックエンドで行う）
function generatePreviewSql(node: ExpressionNode): string {
  switch (node.type) {
    case 'column':
      return node.table ? `${node.table}.${node.column}` : node.column
    case 'literal':
      return node.valueType === 'string' ? `'${node.value}'` : String(node.value)
    case 'function':
      const args = node.arguments.map(generatePreviewSql).join(', ')
      return `${node.name}(${args})`
    default:
      return ''
  }
}
```

---

## 5. UIフロー設計

### 5.1 関数追加フロー

```
1. ユーザーがSELECTタブで「関数を追加」ボタンをクリック
   ↓
2. FunctionBuilderダイアログが表示される
   ↓
3. ユーザーがカテゴリを選択（例: 文字列関数）
   ↓
4. ユーザーが関数を選択（例: UPPER）
   ↓
5. 関数定義が表示される（説明、引数数など）
   ↓
6. ユーザーが引数を追加・設定
   - カラム選択
   - リテラル値入力
   - ネストした関数選択（Phase 2後半）
   ↓
7. プレビューSQLがリアルタイムで表示される
   ↓
8. 「追加」ボタンをクリック
   ↓
9. ExpressionNode が構築され、SELECT句に追加される
   ↓
10. プレビューペインでSQLが更新される
```

### 5.2 エラーハンドリング

- 引数が不足している場合: 「追加」ボタンを無効化
- サポートされていないDB関数の場合: 警告表示
- 引数の型が不正な場合: エラーメッセージ表示

---

## 6. テストコード

### 6.1 コンポーネントテスト

**ファイル**: `app/components/query-builder/FunctionBuilder.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FunctionBuilder from './FunctionBuilder.vue'

describe('FunctionBuilder', () => {
  it('関数カテゴリを選択できる', async () => {
    const wrapper = mount(FunctionBuilder)

    // カテゴリ選択
    await wrapper.find('[name="category"]').setValue('string')

    // 文字列関数が表示されることを確認
    expect(wrapper.text()).toContain('UPPER')
    expect(wrapper.text()).toContain('LOWER')
  })

  it('関数を選択すると説明が表示される', async () => {
    const wrapper = mount(FunctionBuilder)

    await wrapper.find('[name="category"]').setValue('string')
    await wrapper.find('[name="function"]').setValue('UPPER')

    expect(wrapper.text()).toContain('文字列を大文字に変換')
  })

  it('引数を追加・削除できる', async () => {
    const wrapper = mount(FunctionBuilder)

    await wrapper.find('[name="category"]').setValue('string')
    await wrapper.find('[name="function"]').setValue('UPPER')

    // 引数を追加
    await wrapper.find('button:contains("引数を追加")').trigger('click')
    expect(wrapper.findAll('.argument-editor')).toHaveLength(1)

    // 引数を削除
    await wrapper.find('[icon="i-heroicons-trash"]').trigger('click')
    expect(wrapper.findAll('.argument-editor')).toHaveLength(0)
  })
})
```

---

## 7. パフォーマンス考慮事項

- 関数カタログのフィルタリング: 計算プロパティで最適化
- プレビューSQL生成: デバウンス処理（300ms）
- カラムリストの取得: キャッシュ化

---

## 8. 次のステップ（Phase 3）

Phase 2完了後、Phase 3で以下を実装：
- SubqueryBuilderコンポーネント
- ミニクエリビルダー
- 相関サブクエリ対応

詳細: [Phase 3 設計書](../phase3/design.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-01-03 | 1.0 | Phase 2詳細設計書を作成 | Claude |
