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

### 2.0 全体構成の変更（改善版）

**重要な設計変更**: JOINタブとの一貫性を保つため、SELECT句の項目追加UIを統一的なダイアログ方式に変更します。

#### 変更の理由
- ✅ JOINタブと同じUIパターンで学習コストを低減
- ✅ すべての項目追加方法を1つのダイアログに集約
- ✅ Phase 3（サブクエリ）への拡張が容易
- ✅ 明確な操作フロー（ボタン → ダイアログ → 追加完了）

#### 新しいUI構成

```
[SELECTタブ]
  ├─ 「項目を追加」ボタン
  │   ↓ クリック
  ├─ SelectColumnDialog（新規コンポーネント）
  │   ├─ タイプ選択（4つの選択肢）
  │   │   1. テーブルから選択
  │   │   2. データベース関数
  │   │   3. サブクエリ（Phase 3で実装）
  │   │   4. 式の組み合わせ（自由入力）
  │   ├─ 選択肢に応じた入力エリア
  │   │   ├─ テーブルカラム選択UI
  │   │   ├─ FunctionBuilder（既存を再利用）
  │   │   ├─ SubqueryBuilder（Phase 3）
  │   │   └─ 式の自由入力（テキストエリア）
  │   └─ エイリアス入力（共通）
  └─ 選択済み項目リスト
```

### 2.1 SelectColumnDialog コンポーネント（新規）

**ファイル**: `app/components/query-builder/SelectColumnDialog.vue`

このコンポーネントは、SELECT句に追加する項目の種類を選択し、それぞれに応じた入力UIを表示するダイアログです。

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ExpressionNode, FunctionCall } from '~/types/expression-node'
import type { AvailableColumn } from '~/stores/query-builder'

const emit = defineEmits<{
  (e: 'apply', type: 'table' | 'function' | 'subquery' | 'expression', data: any, alias?: string): void
  (e: 'cancel'): void
}>()

const selectedType = ref<'table' | 'function' | 'subquery' | 'expression'>('table')
const alias = ref('')

const typeOptions = [
  {
    value: 'table',
    label: 'テーブルから選択',
    icon: 'i-heroicons-table-cells',
    description: 'テーブルのカラムを選択します'
  },
  {
    value: 'function',
    label: 'データベース関数',
    icon: 'i-heroicons-calculator',
    description: 'UPPER、CONCAT等の関数を使用します'
  },
  {
    value: 'subquery',
    label: 'サブクエリ',
    icon: 'i-heroicons-queue-list',
    description: 'サブクエリで値を取得します',
    disabled: true,  // Phase 3で有効化
    badge: 'Phase 3'
  },
  {
    value: 'expression',
    label: '式の組み合わせ（自由入力）',
    icon: 'i-heroicons-code-bracket',
    description: 'SQL式を直接入力します（例: price * quantity）'
  }
]

// テーブルカラム選択用
const selectedColumns = ref<AvailableColumn[]>([])

// 関数用
const functionNode = ref<FunctionCall | null>(null)

// 式入力用
const expressionText = ref('')

const canSubmit = computed(() => {
  switch (selectedType.value) {
    case 'table':
      return selectedColumns.value.length > 0
    case 'function':
      return functionNode.value !== null
    case 'expression':
      return expressionText.value.trim().length > 0
    case 'subquery':
      return false  // Phase 3で実装
    default:
      return false
  }
})

function handleApply() {
  let data: any

  switch (selectedType.value) {
    case 'table':
      data = selectedColumns.value
      break
    case 'function':
      data = functionNode.value
      break
    case 'expression':
      data = expressionText.value.trim()
      break
  }

  emit('apply', selectedType.value, data, alias.value.trim() || undefined)
}

function handleFunctionApply(func: FunctionCall) {
  functionNode.value = func
}
</script>

<template>
  <UModal :open="true" @close="emit('cancel')">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">SELECT項目を追加</h3>
      </template>

      <div class="space-y-4">
        <!-- タイプ選択 -->
        <UFormField label="項目タイプ" name="type">
          <USelectMenu
            v-model="selectedType"
            :items="typeOptions"
            value-attribute="value"
            option-attribute="label"
          >
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <UIcon :name="option.icon" class="w-4 h-4" />
                <div class="flex-1">
                  <div class="font-medium">{{ option.label }}</div>
                  <div class="text-xs text-gray-500">{{ option.description }}</div>
                </div>
                <UBadge v-if="option.badge" size="xs" color="gray">
                  {{ option.badge }}
                </UBadge>
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- タイプ別の入力エリア -->
        <div class="border-t pt-4">
          <!-- 1. テーブルから選択 -->
          <div v-if="selectedType === 'table'" class="space-y-2">
            <label class="text-sm font-medium">カラムを選択</label>
            <ColumnSelector v-model="selectedColumns" :multiple="true" />
            <p class="text-xs text-gray-500">
              複数選択可能です。Ctrl/Cmd+クリックで複数選択できます。
            </p>
          </div>

          <!-- 2. データベース関数 -->
          <div v-else-if="selectedType === 'function'">
            <FunctionBuilder
              :model-value="functionNode"
              :show-alias="false"
              @apply="handleFunctionApply"
            />
          </div>

          <!-- 3. サブクエリ（Phase 3） -->
          <div v-else-if="selectedType === 'subquery'" class="p-6 bg-gray-50 dark:bg-gray-800 rounded text-center">
            <UIcon name="i-heroicons-clock" class="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p class="text-sm text-gray-600 dark:text-gray-400">Phase 3で実装予定</p>
            <p class="text-xs text-gray-500 mt-1">サブクエリビルダーはPhase 3で追加されます</p>
          </div>

          <!-- 4. 式の組み合わせ -->
          <div v-else-if="selectedType === 'expression'" class="space-y-2">
            <UFormField
              label="SQL式"
              name="expression"
              description="例: price * quantity, CASE WHEN ... END"
            >
              <UTextarea
                v-model="expressionText"
                placeholder="price * quantity"
                :rows="4"
              />
            </UFormField>
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p class="text-xs text-gray-600 dark:text-gray-400">
                <strong>ヒント:</strong> 式の組み合わせでは、算術演算子（+, -, *, /）や
                CASE文などの複雑なSQL式を直接入力できます。
              </p>
            </div>
          </div>
        </div>

        <!-- エイリアス（共通） -->
        <UFormField
          v-if="selectedType !== 'subquery'"
          label="エイリアス（オプション）"
          name="alias"
          description="AS句で指定する別名"
        >
          <UInput
            v-model="alias"
            placeholder="例: total_price, upper_name"
          />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="emit('cancel')">
            キャンセル
          </UButton>
          <UButton
            :disabled="!canSubmit"
            @click="handleApply"
          >
            追加
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

### 2.2 FunctionBuilder コンポーネント（既存・改修）

**ファイル**: `app/components/query-builder/FunctionBuilder.vue`

**変更点**:
- `show-alias` プロパティを追加: SelectColumnDialog から使用時はエイリアス入力を非表示
- `apply` イベントを変更: エイリアスを別途返すよう修正（エイリアスはダイアログ側で管理）
- ダイアログ内に埋め込まれる想定で、カード構造はそのまま維持（UModal内で表示される）

**主要なプロパティ**:
```typescript
const props = defineProps<{
  modelValue?: FunctionCall | null  // 編集対象の関数（新規時はnull）
  showAlias?: boolean  // エイリアス入力欄を表示するか（デフォルト: true）
  allowNested?: boolean  // ネストした関数を許可するか（デフォルト: true）
}>()

const emit = defineEmits<{
  'apply': [func: FunctionCall, alias?: string | null]  // エイリアスも含めて返す
  'cancel': []
}>()
```

**実装済みの機能**:
- データベース種別に応じた関数カタログの動的切り替え
- カテゴリ・関数選択UI
- 引数の追加・削除・編集（ArgumentEditor経由）
- リアルタイムSQLプレビュー
- バリデーション（引数数チェック、引数内容チェック）

**SelectColumnDialog統合時の使用例**:
```vue
<FunctionBuilder
  :model-value="functionNode"
  :show-alias="false"
  :allow-nested="true"
  @apply="handleFunctionApply"
  @cancel="handleCancel"
/>
```

**既存の実装**:

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExpressionNode, FunctionCall } from '~/types/expression-node'
import { getFunctionCatalog } from '~/data/function-catalog'
import { generatePreviewSql } from '~/utils/expression-preview'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import ArgumentEditor from './ArgumentEditor.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: FunctionCall | null
    showAlias?: boolean
    allowNested?: boolean
  }>(),
  {
    modelValue: null,
    showAlias: true,
    allowNested: true,
  }
)

const emit = defineEmits<{
  (e: 'apply', value: FunctionCall, alias?: string | null): void
  (e: 'cancel'): void
}>()

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()

// 選択中のカテゴリと関数
const selectedCategory = ref<string>('string')
const selectedFunction = ref<string>('')
const functionArgs = ref<ExpressionNode[]>([])
const aliasValue = ref<string>('')

// 現在のデータベース種別を取得
const currentDbType = computed(() => {
  const active = connectionStore.activeConnection
  if (active?.type) return active.type

  const connectionId = windowStore.currentConnectionId
  const fallback = connectionStore.connections.find((c) => c.id === connectionId)
  return fallback?.type || 'postgresql'
})

// 現在のDBでサポートされている関数カタログ
const availableFunctions = computed(() => getFunctionCatalog(currentDbType.value))

// ... 以下、既存の実装
```

**ポイント**:
1. `showAlias` が `false` の場合、テンプレート内でエイリアス入力欄（UFormField）を非表示
2. `apply` イベントで関数とエイリアスを両方返す（SelectColumnDialogで共通エイリアス欄と統合）
3. `allowNested` は ArgumentEditor に引き渡され、ネスト関数の可否を制御

### 2.3 ArgumentEditor コンポーネント（既存）

**ファイル**: `app/components/query-builder/ArgumentEditor.vue`

**役割**: 関数の引数を編集するコンポーネント

**実装済みの機能**:
- 引数タイプ選択（カラム、リテラル値、関数）
- カラム選択（テーブル.カラム形式）
- リテラル値入力（文字列・数値）
- ネストした関数の編集（モーダルでFunctionBuilderを再利用）

**プロパティ**:
```typescript
const props = withDefaults(
  defineProps<{
    modelValue: ExpressionNode
    index: number
    allowFunction?: boolean  // 関数をネストできるか（デフォルト: true）
  }>(),
  {
    allowFunction: true,
  }
)
```

**実装済みの内容**:
- 3つの引数タイプ切り替え（column / literal / function）
- カラム選択: availableColumns から選択
- リテラル値: 文字列・数値の型選択と値入力
- 関数: モーダルでネストしたFunctionBuilderを表示（allow-nested="false"で無限ネスト防止）

**SelectColumnDialog統合時の影響**: なし（そのまま利用）

### 2.4 SelectTab コンポーネント（改修）

**ファイル**: `app/components/query-builder/SelectTab.vue`

**改修内容**:

**変更前**:
- 左側: テーブルカラム一覧カード
- 右側: 関数ビルダーUI（直接埋め込み）

**変更後**:
- 上部: 「項目を追加」ボタン
- 中央: 選択済みSELECT項目の一覧表示
- ダイアログ: SelectColumnDialog（項目タイプ選択 → 各入力UI）

**新しい構造**:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useQueryBuilderStore } from '~/stores/query-builder'
import SelectColumnDialog from './SelectColumnDialog.vue'
import type { SelectColumn } from '~/types/query-model'

const store = useQueryBuilderStore()
const dialogOpen = ref(false)

function openDialog() {
  dialogOpen.value = true
}

function handleDialogApply(column: SelectColumn) {
  store.addSelectColumn(column)
  dialogOpen.value = false
}

function handleDialogCancel() {
  dialogOpen.value = false
}

function removeColumn(index: number) {
  store.removeSelectColumn(index)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 追加ボタン -->
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">SELECT句の項目</h3>
      <UButton
        icon="i-heroicons-plus"
        @click="openDialog"
      >
        項目を追加
      </UButton>
    </div>

    <!-- 選択済み項目リスト -->
    <div class="space-y-2">
      <UCard
        v-for="(column, index) in store.selectColumns"
        :key="index"
        class="flex items-center justify-between"
      >
        <div class="flex-1">
          <p class="font-mono text-sm">{{ store.getColumnPreviewSql(column) }}</p>
          <p v-if="column.alias" class="text-xs text-gray-500">AS {{ column.alias }}</p>
        </div>
        <UButton
          icon="i-heroicons-trash"
          variant="ghost"
          color="red"
          size="xs"
          @click="removeColumn(index)"
        />
      </UCard>

      <div v-if="store.selectColumns.length === 0" class="text-center py-8 text-gray-500">
        「項目を追加」ボタンから SELECT 句の項目を追加してください
      </div>
    </div>

    <!-- SelectColumnDialog -->
    <SelectColumnDialog
      v-if="dialogOpen"
      @apply="handleDialogApply"
      @cancel="handleDialogCancel"
    />
  </div>
</template>
```

**ポイント**:
1. JOINタブと同様の「項目を追加」ボタン方式
2. 選択済み項目はカード形式でリスト表示
3. SQLプレビューは store.getColumnPreviewSql() で取得
4. 削除ボタンで項目を削除可能

### 2.5 SQL Preview ユーティリティ（既存）

**ファイル**: `app/utils/expression-preview.ts`

**実装済みの機能**:
- ExpressionNode を SQL 文字列に変換（フロントエンド表示用）
- 再帰的な式ツリーの走査
- リテラル値のエスケープ処理（シングルクォート対策）
- 各ノードタイプに対応（column, literal, function, binary, unary, subquery）

**使用箇所**:
- FunctionBuilder: プレビュー表示
- SelectColumnDialog: プレビュー表示
- SelectTab: 選択済み項目の表示
- query-builder store: getColumnPreviewSql getter

**実装済み**:
```typescript
export function generatePreviewSql(node: ExpressionNode): string {
  switch (node.type) {
    case 'column':
      return node.table ? `${node.table}.${node.column}` : node.column
    case 'literal':
      return formatLiteral(node)
    case 'function':
      return formatFunction(node)
    case 'binary':
      return `(${generatePreviewSql(node.left)} ${node.operator} ${generatePreviewSql(node.right)})`
    case 'unary':
      return `${node.operator}(${generatePreviewSql(node.operand)})`
    case 'subquery':
      return '(SUBQUERY)'
    default:
      return ''
  }
}
```

**SelectColumnDialog統合時の影響**: なし（そのまま利用）

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

**新しいUI設計に伴う変更点**:
- `selectColumns` state を追加: SELECT句の項目リスト
- `addSelectColumn()` action を追加: SelectColumnDialog から項目を追加
- `removeSelectColumn()` action を追加: 項目を削除
- `getColumnPreviewSql()` getter を追加: 項目のSQLプレビュー表示用

**実装例**:

```typescript
import { defineStore } from 'pinia'
import type { ExpressionNode } from '~/types/expression-node'
import type { SelectColumn } from '~/types/query-model'
import { generatePreviewSql } from '~/utils/expression-preview'

export const useQueryBuilderStore = defineStore('query-builder', {
  state: () => ({
    // 既存のstate...
    selectColumns: [] as SelectColumn[],  // SELECT句の項目リスト
  }),

  getters: {
    // 利用可能なカラムリスト（現在選択中のテーブルから）
    availableColumns: (state) => {
      // FROM句とJOIN句のテーブルからカラムリストを取得
      const tables = state.tables || []
      const columns: { id: string; label: string; table: string; column: string }[] = []

      tables.forEach(table => {
        if (table.schema?.columns) {
          table.schema.columns.forEach(column => {
            columns.push({
              id: `${table.alias}.${column.name}`,
              label: `${table.alias}.${column.name}`,
              table: table.alias,
              column: column.name
            })
          })
        }
      })

      return columns
    },

    // ExpressionNodeを含むSelectColumnのプレビューSQL
    getColumnPreviewSql: (state) => (column: SelectColumn) => {
      if (column.expression) {
        // ExpressionNode 形式の場合
        return generatePreviewSql(column.expression)
      } else if (column.table && column.column) {
        // 通常のカラム参照の場合
        return `${column.table}.${column.column}`
      } else if (column.column) {
        // テーブル指定なしのカラム参照
        return column.column
      }
      return ''
    }
  },

  actions: {
    // SELECT句に項目を追加
    addSelectColumn(column: SelectColumn) {
      this.selectColumns.push(column)
    },

    // SELECT句の項目を削除
    removeSelectColumn(index: number) {
      this.selectColumns.splice(index, 1)
    },

    // SELECT句をクリア
    clearSelectColumns() {
      this.selectColumns = []
    }
  }
})
```

**SelectColumn型の定義**:

```typescript
// app/types/query-model.ts

export interface SelectColumn {
  // 通常のカラム参照
  table?: string
  column?: string

  // ExpressionNode（関数、式など）
  expression?: ExpressionNode

  // エイリアス（AS句）
  alias?: string | null
}
```

**使用例（SelectTab から）**:

```typescript
// テーブルカラムを追加
store.addSelectColumn({
  table: 'users',
  column: 'id',
  alias: null
})

// 関数を追加
store.addSelectColumn({
  expression: {
    type: 'function',
    name: 'UPPER',
    category: 'string',
    arguments: [{ type: 'column', table: 'users', column: 'name' }]
  },
  alias: 'upper_name'
})

// 式を追加
store.addSelectColumn({
  expression: {
    type: 'binary',
    operator: '*',
    left: { type: 'column', table: 'orders', column: 'price' },
    right: { type: 'column', table: 'orders', column: 'quantity' }
  },
  alias: 'total_price'
})
```

---

## 5. UIフロー設計

### 5.1 新しいUIフロー（統一ダイアログ方式）

```
1. ユーザーがSELECTタブで「項目を追加」ボタンをクリック
   ↓
2. SelectColumnDialog が表示される
   ↓
3. ユーザーが項目タイプを選択（4つの選択肢）
   ├─ 1. テーブルから選択
   │   ↓
   │   利用可能なカラムリストから複数選択
   │   ↓
   │   エイリアス入力（オプション）
   │
   ├─ 2. データベース関数
   │   ↓
   │   FunctionBuilder コンポーネントが表示される（エイリアス欄なし）
   │   ↓
   │   カテゴリ選択 → 関数選択 → 引数設定
   │   ↓
   │   プレビューSQL確認
   │   ↓
   │   エイリアス入力（ダイアログ共通欄）
   │
   ├─ 3. サブクエリ（Phase 3で実装）
   │   ↓
   │   サブクエリビルダー表示（Phase 3）
   │
   └─ 4. 式の組み合わせ
       ↓
       SQL式を直接入力（UTextarea）
       ↓
       エイリアス入力（ダイアログ共通欄）
   ↓
4. 「追加」ボタンをクリック
   ↓
5. SelectColumn が構築され、query-builder store に追加
   ↓
6. ダイアログが閉じ、選択済み項目リストに表示される
   ↓
7. プレビューペインでSQLが更新される
```

### 5.2 各項目タイプの処理フロー

#### 1. テーブルから選択

```typescript
// SelectColumnDialog.vue
function handleTableColumnApply() {
  selectedTableColumns.value.forEach(columnId => {
    const [table, column] = columnId.split('.')
    const selectColumn: SelectColumn = {
      table,
      column,
      alias: alias.value || null
    }
    emit('apply', selectColumn)
  })
}
```

#### 2. データベース関数

```typescript
// SelectColumnDialog.vue
function handleFunctionApply(func: FunctionCall) {
  const selectColumn: SelectColumn = {
    expression: func,
    alias: alias.value || null
  }
  emit('apply', selectColumn)
}
```

#### 3. 式の組み合わせ

```typescript
// SelectColumnDialog.vue
function handleExpressionApply() {
  // Phase 4で実装予定: SQL式をパースしてExpressionNodeに変換
  // 現在は文字列として保存（バックエンドで処理）
  const selectColumn: SelectColumn = {
    expression: {
      type: 'raw',  // 生SQL式（仮）
      value: expressionText.value
    } as any,
    alias: alias.value || null
  }
  emit('apply', selectColumn)
}
```

### 5.3 エラーハンドリング

#### バリデーション

| 項目タイプ | バリデーション | エラー時の挙動 |
|-----------|--------------|--------------|
| テーブルから選択 | 1つ以上のカラムを選択 | 「追加」ボタンを無効化 |
| データベース関数 | 関数選択済み、引数数・内容が正しい | 「追加」ボタンを無効化 |
| サブクエリ | サブクエリが有効 | 「追加」ボタンを無効化 |
| 式の組み合わせ | 空文字ではない | 「追加」ボタンを無効化 |

#### エラーメッセージ

```typescript
const canSubmit = computed(() => {
  if (selectedType.value === 'table') {
    return selectedTableColumns.value.length > 0
  } else if (selectedType.value === 'function') {
    return functionNode.value !== null && isFunctionValid(functionNode.value)
  } else if (selectedType.value === 'subquery') {
    return false  // Phase 3で実装
  } else if (selectedType.value === 'expression') {
    return expressionText.value.trim().length > 0
  }
  return false
})

function isFunctionValid(func: FunctionCall): boolean {
  // 関数名が選択されているか
  if (!func.name) return false

  // 引数がすべて有効か
  return func.arguments.every(arg => {
    if (arg.type === 'column') return Boolean(arg.column)
    if (arg.type === 'literal') return arg.valueType !== undefined
    if (arg.type === 'function') return Boolean(arg.name)
    return true
  })
}
```

---

## 6. テストコード

### 6.1 SelectColumnDialog テスト

**ファイル**: `app/components/query-builder/SelectColumnDialog.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectColumnDialog from './SelectColumnDialog.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('SelectColumnDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('4つの項目タイプを選択できる', () => {
    const wrapper = mount(SelectColumnDialog)

    const typeOptions = wrapper.findAll('[data-test="type-option"]')
    expect(typeOptions).toHaveLength(4)
    expect(typeOptions[0].text()).toContain('テーブルから選択')
    expect(typeOptions[1].text()).toContain('データベース関数')
    expect(typeOptions[2].text()).toContain('サブクエリ')
    expect(typeOptions[3].text()).toContain('式の組み合わせ')
  })

  it('テーブルタイプを選択するとカラムリストが表示される', async () => {
    const wrapper = mount(SelectColumnDialog)

    await wrapper.find('[value="table"]').trigger('click')
    expect(wrapper.find('[data-test="table-column-list"]').exists()).toBe(true)
  })

  it('関数タイプを選択するとFunctionBuilderが表示される', async () => {
    const wrapper = mount(SelectColumnDialog)

    await wrapper.find('[value="function"]').trigger('click')
    expect(wrapper.findComponent({ name: 'FunctionBuilder' }).exists()).toBe(true)
  })

  it('サブクエリタイプはPhase 3未実装メッセージを表示', async () => {
    const wrapper = mount(SelectColumnDialog)

    await wrapper.find('[value="subquery"]').trigger('click')
    expect(wrapper.text()).toContain('Phase 3で実装予定')
  })

  it('バリデーション: 何も選択していない場合は追加ボタンが無効', () => {
    const wrapper = mount(SelectColumnDialog)

    const submitButton = wrapper.find('[data-test="submit-button"]')
    expect(submitButton.attributes('disabled')).toBe('true')
  })
})
```

### 6.2 FunctionBuilder テスト（既存）

**ファイル**: `app/components/query-builder/FunctionBuilder.test.ts`

既存のテストに加えて、`showAlias` プロパティのテストを追加:

```typescript
describe('FunctionBuilder - showAlias prop', () => {
  it('showAlias=false の場合、エイリアス入力欄が非表示', () => {
    const wrapper = mount(FunctionBuilder, {
      props: { showAlias: false }
    })

    expect(wrapper.find('[name="alias"]').exists()).toBe(false)
  })

  it('showAlias=true の場合、エイリアス入力欄が表示', () => {
    const wrapper = mount(FunctionBuilder, {
      props: { showAlias: true }
    })

    expect(wrapper.find('[name="alias"]').exists()).toBe(true)
  })
})
```

### 6.3 query-builder ストアテスト

**ファイル**: `app/stores/query-builder.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from './query-builder'
import type { SelectColumn } from '~/types/query-model'

describe('query-builder store - SELECT column management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addSelectColumn: カラムを追加できる', () => {
    const store = useQueryBuilderStore()
    const column: SelectColumn = {
      table: 'users',
      column: 'id',
      alias: null
    }

    store.addSelectColumn(column)
    expect(store.selectColumns).toHaveLength(1)
    expect(store.selectColumns[0]).toEqual(column)
  })

  it('removeSelectColumn: カラムを削除できる', () => {
    const store = useQueryBuilderStore()
    store.addSelectColumn({ table: 'users', column: 'id' })
    store.addSelectColumn({ table: 'users', column: 'name' })

    store.removeSelectColumn(0)
    expect(store.selectColumns).toHaveLength(1)
    expect(store.selectColumns[0].column).toBe('name')
  })

  it('getColumnPreviewSql: 通常カラムのプレビューを生成', () => {
    const store = useQueryBuilderStore()
    const column: SelectColumn = {
      table: 'users',
      column: 'name',
      alias: 'user_name'
    }

    const preview = store.getColumnPreviewSql(column)
    expect(preview).toBe('users.name')
  })

  it('getColumnPreviewSql: 関数のプレビューを生成', () => {
    const store = useQueryBuilderStore()
    const column: SelectColumn = {
      expression: {
        type: 'function',
        name: 'UPPER',
        category: 'string',
        arguments: [{ type: 'column', table: 'users', column: 'name' }]
      },
      alias: 'upper_name'
    }

    const preview = store.getColumnPreviewSql(column)
    expect(preview).toBe('UPPER(users.name)')
  })
})
```

---

## 7. 実装チェックリスト

### Phase 2 - UI改善版

- [ ] **SelectColumnDialog コンポーネント作成**
  - [ ] 4つの項目タイプ選択UI
  - [ ] テーブルカラム選択（複数選択対応）
  - [ ] FunctionBuilder 統合（show-alias="false"）
  - [ ] サブクエリプレースホルダー（Phase 3）
  - [ ] 式の組み合わせ入力
  - [ ] 共通エイリアス入力欄
  - [ ] バリデーション実装
  - [ ] テストコード作成

- [ ] **SelectTab コンポーネント改修**
  - [ ] 「項目を追加」ボタン追加
  - [ ] 選択済み項目リスト表示
  - [ ] SQLプレビュー表示
  - [ ] 項目削除機能
  - [ ] SelectColumnDialog 統合

- [ ] **FunctionBuilder コンポーネント改修**
  - [x] `showAlias` プロパティ追加（実装済み）
  - [x] `apply` イベントでエイリアスも返す（実装済み）
  - [ ] showAlias=false 時の表示確認

- [ ] **query-builder ストア拡張**
  - [ ] `selectColumns` state 追加
  - [ ] `addSelectColumn()` action 実装
  - [ ] `removeSelectColumn()` action 実装
  - [ ] `getColumnPreviewSql()` getter 実装
  - [ ] `availableColumns` getter 実装
  - [ ] テストコード追加

- [ ] **型定義更新**
  - [ ] SelectColumn 型を query-model.ts に追加
  - [ ] expression フィールドを追加

- [ ] **動作確認**
  - [ ] テーブルカラムを追加できる
  - [ ] データベース関数を追加できる
  - [ ] 式の組み合わせを追加できる
  - [ ] エイリアスが正しく設定される
  - [ ] SQLプレビューが正しく表示される
  - [ ] 項目を削除できる

---

## 8. パフォーマンス考慮事項

- 関数カタログのフィルタリング: 計算プロパティで最適化
- プレビューSQL生成: フロントエンドは軽量な文字列結合のみ
- カラムリストの取得: availableColumns getter でキャッシュ化
- ダイアログの遅延ロード: SelectColumnDialog は v-if で条件付きレンダリング

---

## 9. 次のステップ（Phase 3）

Phase 2完了後、Phase 3で以下を実装：
- SubqueryBuilderコンポーネント
- SelectColumnDialog の「サブクエリ」タイプ実装
- ミニクエリビルダー（FROM, WHERE のみ）
- 相関サブクエリ対応

詳細: [Phase 3 設計書](../phase3/design.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-01-03 | 1.0 | Phase 2詳細設計書を作成 | Claude |
| 2026-01-03 | 2.0 | UI設計を統一ダイアログ方式に変更（セクション2.0追加） | Claude |
