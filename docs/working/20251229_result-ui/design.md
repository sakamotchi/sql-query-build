# 設計書: 結果表示UI

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Nuxt)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           QueryBuilderLayout.vue                     │    │
│  │  ┌─────────────────────────────────────────────────┐│    │
│  │  │              ResultPanel.vue                    ││    │
│  │  │  ┌───────────────────────────────────────────┐ ││    │
│  │  │  │          ResultTable.vue                  │ ││    │
│  │  │  │  ┌─────────────────────────────────────┐  │ ││    │
│  │  │  │  │    ResultColumnHeader.vue           │  │ ││    │
│  │  │  │  ├─────────────────────────────────────┤  │ ││    │
│  │  │  │  │    ResultRow.vue × N                │  │ ││    │
│  │  │  │  └─────────────────────────────────────┘  │ ││    │
│  │  │  └───────────────────────────────────────────┘ ││    │
│  │  │  ┌───────────────────────────────────────────┐ ││    │
│  │  │  │       ResultPagination.vue               │ ││    │
│  │  │  └───────────────────────────────────────────┘ ││    │
│  │  └─────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             query-builder.ts store                   │    │
│  │               executeQuery()                         │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             queryApi.executeQuery()                  │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │ invoke("execute_query", {...})
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                      │
│                      execute_query                           │
└─────────────────────────────────────────────────────────────┘
```

## データ構造

### フロントエンド型定義（app/types/query-result.ts）

```typescript
/**
 * クエリ実行結果（Rust側QueryResultと対応）
 */
export interface QueryExecuteResult {
  /** カラム情報 */
  columns: QueryResultColumn[]
  /** 行データ */
  rows: QueryResultRow[]
  /** 取得行数 */
  rowCount: number
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
  /** 警告メッセージ */
  warnings: string[]
}

/**
 * カラム情報
 */
export interface QueryResultColumn {
  /** カラム名 */
  name: string
  /** データ型 */
  dataType: string
  /** NULL許容 */
  nullable: boolean
}

/**
 * 行データ
 */
export interface QueryResultRow {
  /** 値の配列（カラム順） */
  values: QueryValue[]
}

/**
 * 値の型
 */
export type QueryValue = null | boolean | number | string | number[]

/**
 * クエリ実行リクエスト
 */
export interface QueryExecuteRequest {
  /** 接続ID */
  connectionId: string
  /** 実行するSQL */
  sql: string
  /** タイムアウト（秒） */
  timeoutSeconds?: number
}

/**
 * クエリ実行レスポンス
 */
export interface QueryExecuteResponse {
  /** クエリID（キャンセル用） */
  queryId: string
  /** 実行結果 */
  result: QueryExecuteResult
}

/**
 * クエリエラー
 */
export interface QueryExecuteError {
  /** エラーコード */
  code: QueryErrorCode
  /** エラーメッセージ */
  message: string
  /** 詳細情報 */
  details?: QueryErrorDetails
}

export type QueryErrorCode =
  | 'connection_failed'
  | 'query_timeout'
  | 'query_cancelled'
  | 'syntax_error'
  | 'permission_denied'
  | 'table_not_found'
  | 'column_not_found'
  | 'unknown'

export interface QueryErrorDetails {
  /** エラー位置（行） */
  line?: number
  /** エラー位置（列） */
  column?: number
  /** エラー発生箇所のSQL */
  sqlSnippet?: string
}
```

### ストア状態拡張（app/stores/query-builder.ts）

```typescript
interface QueryBuilderState {
  // 既存の状態...

  /** クエリ実行結果 */
  queryResult: QueryExecuteResult | null
  /** 現在のページ（1始まり） */
  currentPage: number
  /** 1ページあたりの行数 */
  pageSize: number
  /** 実行中のクエリID（キャンセル用） */
  executingQueryId: string | null
}
```

## コンポーネント設計

### ResultPanel.vue（拡張）

```vue
<script setup lang="ts">
import { useQueryBuilderStore } from '@/stores/query-builder'

const store = useQueryBuilderStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 計算プロパティ
const hasResult = computed(() => store.queryResult !== null)
const isLoading = computed(() => store.isExecuting)
const executionInfo = computed(() => {
  if (!store.queryResult) return null
  return {
    rowCount: store.queryResult.rowCount,
    executionTimeMs: store.queryResult.executionTimeMs,
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-table-cells" class="text-lg" />
        <span class="text-sm font-medium">実行結果</span>
        <!-- 実行情報 -->
        <template v-if="executionInfo">
          <span class="text-xs text-gray-500">
            {{ executionInfo.rowCount }}行
          </span>
          <span class="text-xs text-gray-400">
            ({{ executionInfo.executionTimeMs }}ms)
          </span>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          color="gray"
          variant="ghost"
          title="エクスポート"
          :disabled="!hasResult"
        />
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          color="gray"
          variant="ghost"
          title="閉じる"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- コンテンツ -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- ローディング -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        <span class="ml-2 text-gray-500">実行中...</span>
      </div>

      <!-- 結果なし -->
      <div v-else-if="!hasResult" class="flex-1 flex flex-col items-center justify-center">
        <UIcon name="i-heroicons-table-cells" class="text-4xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">クエリを実行してください</p>
      </div>

      <!-- 結果表示 -->
      <template v-else>
        <div class="flex-1 overflow-auto">
          <ResultTable
            :columns="store.queryResult!.columns"
            :rows="store.paginatedRows"
          />
        </div>
        <div class="border-t border-gray-200 dark:border-gray-800">
          <ResultPagination
            :current-page="store.currentPage"
            :page-size="store.pageSize"
            :total-rows="store.queryResult!.rowCount"
            @page-change="store.setCurrentPage"
            @page-size-change="store.setPageSize"
          />
        </div>
      </template>
    </div>
  </div>
</template>
```

### ResultTable.vue

```vue
<script setup lang="ts">
import type { QueryResultColumn, QueryResultRow } from '@/types/query-result'

const props = defineProps<{
  columns: QueryResultColumn[]
  rows: QueryResultRow[]
}>()
</script>

<template>
  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
      <tr>
        <ResultColumnHeader
          v-for="column in columns"
          :key="column.name"
          :column="column"
        />
      </tr>
    </thead>
    <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
      <ResultRow
        v-for="(row, index) in rows"
        :key="index"
        :row="row"
        :columns="columns"
      />
      <!-- 結果が0件の場合 -->
      <tr v-if="rows.length === 0">
        <td
          :colspan="columns.length"
          class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
        >
          結果が0件です
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

### ResultColumnHeader.vue

```vue
<script setup lang="ts">
import type { QueryResultColumn } from '@/types/query-result'

const props = defineProps<{
  column: QueryResultColumn
}>()

// データ型の表示名マッピング
const dataTypeDisplay = computed(() => {
  const typeMap: Record<string, string> = {
    'INT4': 'integer',
    'INT8': 'bigint',
    'FLOAT4': 'real',
    'FLOAT8': 'double',
    'TEXT': 'text',
    'VARCHAR': 'varchar',
    'BOOL': 'boolean',
    'TIMESTAMP': 'timestamp',
    'DATE': 'date',
    'TIMESTAMPTZ': 'timestamptz',
    'UUID': 'uuid',
    'JSONB': 'jsonb',
    'JSON': 'json',
  }
  return typeMap[props.column.dataType] || props.column.dataType.toLowerCase()
})
</script>

<template>
  <th
    scope="col"
    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
  >
    <div class="flex flex-col gap-0.5">
      <span class="text-gray-900 dark:text-gray-100">{{ column.name }}</span>
      <span class="text-gray-400 dark:text-gray-500 font-normal normal-case">
        {{ dataTypeDisplay }}
      </span>
    </div>
  </th>
</template>
```

### ResultRow.vue

```vue
<script setup lang="ts">
import type { QueryResultColumn, QueryResultRow, QueryValue } from '@/types/query-result'

const props = defineProps<{
  row: QueryResultRow
  columns: QueryResultColumn[]
}>()

// 値の表示フォーマット
function formatValue(value: QueryValue, column: QueryResultColumn): string {
  if (value === null) {
    return '' // NULLは別途スタイルで表示
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    // バイナリデータ
    return `[${value.length} bytes]`
  }
  return String(value)
}

function isNull(value: QueryValue): boolean {
  return value === null
}
</script>

<template>
  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
    <td
      v-for="(value, index) in row.values"
      :key="index"
      class="px-4 py-2 text-sm whitespace-nowrap"
      :class="{
        'text-gray-400 dark:text-gray-500 italic': isNull(value),
        'text-gray-900 dark:text-gray-100': !isNull(value),
      }"
    >
      <template v-if="isNull(value)">
        <span class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">NULL</span>
      </template>
      <template v-else>
        {{ formatValue(value, columns[index]) }}
      </template>
    </td>
  </tr>
</template>
```

### ResultPagination.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  currentPage: number
  pageSize: number
  totalRows: number
}>()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
  (e: 'page-size-change', size: number): void
}>()

const totalPages = computed(() => Math.ceil(props.totalRows / props.pageSize))

const pageSizeOptions = [10, 25, 50, 100]

const startRow = computed(() => (props.currentPage - 1) * props.pageSize + 1)
const endRow = computed(() => Math.min(props.currentPage * props.pageSize, props.totalRows))

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit('page-change', page)
  }
}

function onPageSizeChange(size: number) {
  emit('page-size-change', size)
  // ページサイズ変更時は1ページ目に戻る
  emit('page-change', 1)
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800">
    <!-- 左側: 表示件数 -->
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span>表示:</span>
      <USelect
        :model-value="pageSize"
        :items="pageSizeOptions.map(n => ({ value: n, label: `${n}件` }))"
        size="xs"
        class="w-20"
        @update:model-value="onPageSizeChange"
      />
      <span class="text-gray-500">
        {{ startRow }} - {{ endRow }} / {{ totalRows }}件
      </span>
    </div>

    <!-- 右側: ページナビゲーション -->
    <div class="flex items-center gap-1">
      <UButton
        icon="i-heroicons-chevron-double-left"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === 1"
        @click="goToPage(1)"
      />
      <UButton
        icon="i-heroicons-chevron-left"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      />
      <span class="px-2 text-sm text-gray-600 dark:text-gray-400">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <UButton
        icon="i-heroicons-chevron-right"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      />
      <UButton
        icon="i-heroicons-chevron-double-right"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === totalPages"
        @click="goToPage(totalPages)"
      />
    </div>
  </div>
</template>
```

## API設計

### queryApi.ts 追加

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { QueryExecuteRequest, QueryExecuteResponse, QueryExecuteError } from '@/types/query-result'

export const queryApi = {
  // 既存のメソッド...

  /**
   * クエリを実行
   */
  async executeQuery(request: QueryExecuteRequest): Promise<QueryExecuteResponse> {
    return await invoke<QueryExecuteResponse>('execute_query', { request })
  },

  /**
   * クエリをキャンセル
   */
  async cancelQuery(queryId: string): Promise<boolean> {
    return await invoke<boolean>('cancel_query', { queryId })
  },
}
```

## ストア設計

### query-builder.ts 拡張

```typescript
// 状態追加
interface QueryBuilderState {
  // 既存...

  /** クエリ実行結果 */
  queryResult: QueryExecuteResult | null
  /** 現在のページ（1始まり） */
  currentPage: number
  /** 1ページあたりの行数 */
  pageSize: number
  /** 実行中のクエリID */
  executingQueryId: string | null
}

// ゲッター追加
getters: {
  // 既存...

  /**
   * 現在ページの行データ
   */
  paginatedRows(state): QueryResultRow[] {
    if (!state.queryResult) return []
    const start = (state.currentPage - 1) * state.pageSize
    const end = start + state.pageSize
    return state.queryResult.rows.slice(start, end)
  },
},

// アクション追加
actions: {
  // 既存...

  /**
   * クエリを実行
   */
  async executeQuery() {
    if (!this.canExecuteQuery) return
    if (!this.generatedSql) return

    this.isExecuting = true
    this.error = null
    this.queryResult = null
    this.currentPage = 1

    try {
      const connectionStore = useConnectionStore()
      const windowStore = useWindowStore()
      const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

      if (!connectionId) {
        throw new Error('接続が選択されていません')
      }

      const response = await queryApi.executeQuery({
        connectionId,
        sql: this.generatedSql,
        timeoutSeconds: 30,
      })

      this.executingQueryId = response.queryId
      this.queryResult = response.result
      this.queryInfo = {
        rowCount: response.result.rowCount,
        executionTime: response.result.executionTimeMs,
        lastExecutedAt: new Date(),
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error = error.message
      } else if (typeof error === 'string') {
        // Rust側からのエラーはJSON文字列の可能性
        try {
          const parsed = JSON.parse(error) as QueryExecuteError
          this.error = parsed.message
        } catch {
          this.error = error
        }
      } else {
        this.error = 'Unknown error'
      }
    } finally {
      this.isExecuting = false
      this.executingQueryId = null
    }
  },

  /**
   * 実行中のクエリをキャンセル
   */
  async cancelQuery() {
    if (!this.executingQueryId) return

    try {
      await queryApi.cancelQuery(this.executingQueryId)
    } catch (error) {
      console.error('Failed to cancel query:', error)
    }
  },

  /**
   * 現在ページを設定
   */
  setCurrentPage(page: number) {
    this.currentPage = page
  },

  /**
   * ページサイズを設定
   */
  setPageSize(size: number) {
    this.pageSize = size
    this.currentPage = 1
  },

  /**
   * 結果をクリア
   */
  clearResult() {
    this.queryResult = null
    this.currentPage = 1
    this.error = null
  },
}
```

## ファイル構成

```
app/
├── api/
│   └── query.ts              # executeQuery, cancelQuery追加
├── types/
│   ├── query.ts              # 既存
│   └── query-result.ts       # 新規: QueryExecuteResult等
├── stores/
│   └── query-builder.ts      # executeQuery実装、状態追加
└── components/
    └── query-builder/
        ├── ResultPanel.vue   # 拡張
        └── result/
            ├── ResultTable.vue
            ├── ResultColumnHeader.vue
            ├── ResultRow.vue
            └── ResultPagination.vue
```

## テストコード

### コンポーネントテスト

```typescript
// app/components/query-builder/result/__tests__/ResultTable.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultTable from '../ResultTable.vue'

describe('ResultTable', () => {
  const mockColumns = [
    { name: 'id', dataType: 'INT4', nullable: false },
    { name: 'name', dataType: 'TEXT', nullable: true },
  ]

  const mockRows = [
    { values: [1, 'Alice'] },
    { values: [2, null] },
  ]

  it('renders column headers', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('id')
    expect(wrapper.text()).toContain('name')
  })

  it('renders rows correctly', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('displays NULL indicator for null values', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('NULL')
  })

  it('shows empty message when no rows', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: [] },
    })

    expect(wrapper.text()).toContain('結果が0件です')
  })
})
```

### ResultPagination テスト

```typescript
// app/components/query-builder/result/__tests__/ResultPagination.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultPagination from '../ResultPagination.vue'

describe('ResultPagination', () => {
  it('calculates total pages correctly', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 95,
      },
    })

    expect(wrapper.text()).toContain('1 / 10')
  })

  it('emits page-change event when navigating', async () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 50,
      },
    })

    // 次ページボタンをクリック
    const nextButton = wrapper.findAll('button')[3] // chevron-right
    await nextButton.trigger('click')

    expect(wrapper.emitted('page-change')).toBeTruthy()
    expect(wrapper.emitted('page-change')![0]).toEqual([2])
  })

  it('disables previous button on first page', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 50,
      },
    })

    const firstButton = wrapper.findAll('button')[0]
    expect(firstButton.attributes('disabled')).toBeDefined()
  })

  it('disables next button on last page', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 5,
        pageSize: 10,
        totalRows: 50,
      },
    })

    const lastButton = wrapper.findAll('button')[4]
    expect(lastButton.attributes('disabled')).toBeDefined()
  })
})
```

### ストアテスト

```typescript
// app/stores/__tests__/query-builder.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from '../query-builder'

// Mock queryApi
vi.mock('@/api/query', () => ({
  queryApi: {
    executeQuery: vi.fn(),
    cancelQuery: vi.fn(),
  },
}))

describe('query-builder store - executeQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets isExecuting during query execution', async () => {
    const store = useQueryBuilderStore()

    // executeQueryが呼ばれたときの状態を確認
    // (実際のテストではモックを使用)
  })

  it('handles successful query execution', async () => {
    const store = useQueryBuilderStore()
    // テスト実装
  })

  it('handles query error', async () => {
    const store = useQueryBuilderStore()
    // テスト実装
  })

  it('calculates paginated rows correctly', () => {
    const store = useQueryBuilderStore()
    store.queryResult = {
      columns: [],
      rows: Array.from({ length: 50 }, (_, i) => ({ values: [i] })),
      rowCount: 50,
      executionTimeMs: 10,
      warnings: [],
    }
    store.pageSize = 10
    store.currentPage = 2

    expect(store.paginatedRows.length).toBe(10)
    expect(store.paginatedRows[0].values[0]).toBe(10)
  })
})
```

## UI/UX考慮事項

### NULL値の表示

- `NULL`はグレーの背景に斜体で表示
- 空文字列との区別を明確に

### データ型の表示

- カラムヘッダーにデータ型を小さく表示
- ユーザーがデータの型を認識しやすくする

### ローディング状態

- スピナーアイコンと「実行中...」テキストを表示
- キャンセルボタン（将来対応）

### エラー表示

- エラーメッセージを目立つ色で表示
- エラー詳細（行番号等）があれば表示

## 依存関係

### 前提条件

- Phase 2.1 クエリ実行基盤（Rust）が完成していること
- `execute_query` Tauriコマンドが利用可能であること

### 外部依存

- Nuxt UI v4（UButton, USelect, UIcon）
- Pinia（状態管理）
- @tauri-apps/api/core（invoke）
