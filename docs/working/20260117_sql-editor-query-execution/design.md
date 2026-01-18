# 設計書 - SQLエディタ Phase 3: クエリ実行機能

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
├── SqlEditorToolbar.vue (実行・停止ボタン)
├── SqlTextEditor.vue (キーボードショートカット、選択範囲取得、エラーハイライト)
├── ResultPanel.vue (結果表示)
└── sql-editor.ts (Pinia Store: 実行ロジック、状態管理)
    ↓ invoke()
Tauri API
    ↓
Rust Backend (既存を流用)
    ├── execute_query (既存コマンド)
    ├── cancel_query (既存コマンド)
    └── analyze_query (既存コマンド)
    ↓
外部データベースサーバー (PostgreSQL/MySQL/SQLite)
```

### 影響範囲

#### フロントエンド

**新規作成**:
- `app/components/sql-editor/ResultPanel.vue` - 結果パネルコンポーネント

**既存ファイルの更新**:
- `app/components/sql-editor/SqlEditorToolbar.vue` - 実行・停止ボタンの実装
- `app/components/sql-editor/SqlTextEditor.vue` - キーボードショートカット、選択範囲取得、エラーハイライト
- `app/components/sql-editor/SqlEditorLayout.vue` - 結果パネルの配置
- `app/stores/sql-editor.ts` - 実行ロジック、状態管理の追加
- `app/pages/sql-editor.vue` - 結果パネルの統合

#### バックエンド

- **変更なし** - 既存の `execute_query`, `cancel_query`, `analyze_query` コマンドを流用

## 実装方針

### 概要

Phase 3では、既存のクエリ実行APIを活用して、SQLエディタにクエリ実行機能を追加します。新規のバックエンド実装は不要で、フロントエンド側のUI・状態管理を強化します。

### 詳細

1. **実行ボタン・停止ボタンの実装** (SqlEditorToolbar.vue)
   - ストアの `canExecute` getterを使用してボタンの有効/無効を制御
   - 実行ボタンクリック時に `executeQuery()` アクションを呼び出し
   - 停止ボタンクリック時に `cancelQuery()` アクションを呼び出し

2. **キーボードショートカットの実装** (SqlTextEditor.vue)
   - Monaco Editorの `addAction()` APIを使用
   - Ctrl/Cmd+Enter: クエリ実行
   - Escape: 実行キャンセル

3. **選択範囲実行機能** (SqlTextEditor.vue, sql-editor.ts)
   - Monaco Editorの `getSelection()` で選択範囲を取得
   - 選択範囲がある場合は選択部分のみ実行、なければ全体を実行

4. **結果パネルの実装** (ResultPanel.vue)
   - 既存の `app/components/query-builder/ResultPanel.vue` を参考
   - または新規に作成（シンプル版）
   - SELECT結果: テーブル形式で表示
   - INSERT/UPDATE/DELETE結果: 影響行数を表示

5. **ストア実装** (sql-editor.ts)
   - `executeQuery()` アクション:
     - `app/api/query.ts` の `executeQuery()` を呼び出し
     - 実行状態を管理 (isExecuting = true)
     - 結果を `result` に保存
     - エラー時は `error` に保存
   - `cancelQuery()` アクション:
     - `app/api/query.ts` の `cancelQuery()` を呼び出し

6. **エラー表示・行ハイライト** (SqlTextEditor.vue)
   - ストアの `error` を監視
   - エラー行番号が取得できる場合、Monaco Editorの `deltaDecorations()` を使用してハイライト

7. **実行時間・影響行数の表示** (ResultPanel.vue)
   - `QueryExecuteResponse` の `execution_time_ms`, `rows_affected` を表示

## データ構造

### 型定義（TypeScript）

#### app/types/sql-editor.ts (既存の拡張)

```typescript
import type * as monaco from 'monaco-editor'
import type { QueryExecuteError, QueryExecuteResult } from './query-result'

/**
 * SQLエディタの状態 (既存)
 */
export interface SqlEditorState {
  /** 接続ID */
  connectionId: string | null
  /** 現在のSQL文字列 */
  sql: string
  /** エディタが変更されたか */
  isDirty: boolean
  /** 実行中フラグ */
  isExecuting: boolean
  /** 実行結果 */
  result: QueryExecuteResult | null
  /** エラー情報 */
  error: QueryExecuteError | null
}

/**
 * 実行統計情報 (新規)
 */
export interface ExecutionStats {
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
  /** 影響行数（INSERT/UPDATE/DELETE時） */
  rowsAffected?: number
  /** 取得件数（SELECT時） */
  rowCount?: number
}
```

#### app/types/query-result.ts (既存を流用)

```typescript
/**
 * クエリ実行リクエスト
 */
export interface QueryExecuteRequest {
  connectionId: string
  sql: string
  limit?: number
  offset?: number
}

/**
 * クエリ実行レスポンス
 */
export interface QueryExecuteResponse {
  columns: ColumnInfo[]
  rows: Row[]
  total_count: number
  execution_time_ms: number
  rows_affected?: number
}

/**
 * クエリ実行エラー
 */
export interface QueryExecuteError {
  message: string
  line?: number
  column?: number
  hint?: string
}

/**
 * クエリ実行結果（ストア保存用）
 */
export interface QueryExecuteResult {
  columns: ColumnInfo[]
  rows: Row[]
  totalCount: number
  executionTimeMs: number
  rowsAffected?: number
}

interface ColumnInfo {
  name: string
  type: string
}

type Row = Record<string, any>
```

### 型定義（Rust）

**変更なし** - 既存のコマンドをそのまま使用

## API設計

### Tauriコマンド（既存を流用）

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `execute_query` | `QueryExecuteRequest` | `Result<QueryExecuteResponse, String>` | クエリ実行 |
| `cancel_query` | `query_id: String` | `Result<bool, String>` | クエリキャンセル |
| `analyze_query` | `sql: String, dialect: String` | `Result<QueryAnalysisResult, String>` | クエリ分析 |

### フロントエンドAPI（既存を流用）

#### app/api/query.ts

```typescript
export const queryApi = {
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

  /**
   * クエリを解析して危険度を判定
   */
  async analyzeQuery(sql: string, dialect: string): Promise<QueryAnalysisResult> {
    return await invoke<QueryAnalysisResult>('analyze_query', { sql, dialect })
  },
}
```

## UI設計

### 画面構成

```
┌──────────────────────────────────────────────────────────┐
│  SqlEditorToolbar                                         │
│  [▶実行] [■停止] ... | DB名 | 環境                       │
├────────────────┬─────────────────────────────────────────┤
│                │                                         │
│  サイドパネル   │  SqlTextEditor (Monaco Editor)           │
│  (Phase 4-5)   │  ┌─────────────────────────────────────┐ │
│                │  │ 1 │ SELECT * FROM users            │ │
│                │  │ 2 │ WHERE id = 1;                  │ │
│                │  │ 3 │                                │ │
│                │  └─────────────────────────────────────┘ │
│                │                                         │
├────────────────┴─────────────────────────────────────────┤
│  ResultPanel                                             │
│  実行時間: 0.023秒 | 100件                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ id │ name  │ email                                 │  │
│  │ 1  │ Alice │ alice@example.com                     │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### コンポーネント構成

```
SqlEditorLayout.vue
├── SqlEditorToolbar.vue
│   ├── 実行ボタン (UButton)
│   ├── 停止ボタン (UButton)
│   └── 保存ボタン (UButton) ※Phase 4で実装
├── div.flex (メインコンテンツエリア)
│   ├── サイドパネル (Phase 4-5で実装)
│   └── SqlTextEditor.vue (Monaco Editor)
└── ResultPanel.vue
    ├── 統計情報表示 (実行時間、件数等)
    ├── ResultTable.vue (または既存のResultTableを流用)
    └── エラー表示エリア (UAlert)
```

## 実装詳細

### 1. SqlEditorToolbar.vue

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

const store = useSqlEditorStore()
const { canExecute, isExecuting } = storeToRefs(store)

async function handleExecute() {
  await store.executeQuery()
}

async function handleStop() {
  await store.cancelQuery()
}

function handleSave() {
  // Phase 4で実装
  console.log('Save button clicked (not implemented yet)')
}
</script>

<template>
  <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-play"
        label="実行"
        :disabled="!canExecute"
        color="primary"
        @click="handleExecute"
      />

      <UButton
        icon="i-heroicons-stop"
        label="停止"
        :disabled="!isExecuting"
        color="neutral"
        variant="soft"
        @click="handleStop"
      />

      <div class="flex-1" />

      <UButton
        icon="i-heroicons-bookmark"
        label="保存"
        :disabled="true"
        color="neutral"
        variant="soft"
        @click="handleSave"
      />
    </div>
  </div>
</template>
```

### 2. SqlTextEditor.vue（キーボードショートカット追加）

```vue
<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useThemeStore } from '~/stores/theme'

const store = useSqlEditorStore()
const themeStore = useThemeStore()
const { sql, error } = storeToRefs(store)
const { isDark } = storeToRefs(themeStore)

const editorRef = ref<HTMLDivElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let decorations: string[] = []

onMounted(() => {
  if (!editorRef.value) return

  // エディタ初期化
  editor = monaco.editor.create(editorRef.value, {
    value: sql.value,
    language: 'sql',
    theme: isDark.value ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    fontSize: 14,
  })

  // キーボードショートカット: Ctrl/Cmd+Enter で実行
  editor.addAction({
    id: 'execute-query',
    label: 'Execute Query',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: async () => {
      await store.executeQuery(getSelectedSql())
    },
  })

  // キーボードショートカット: Escape でキャンセル
  editor.addAction({
    id: 'cancel-query',
    label: 'Cancel Query',
    keybindings: [monaco.KeyCode.Escape],
    run: async () => {
      await store.cancelQuery()
    },
  })

  // テキスト変更時にストアを更新
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() || ''
    store.updateSql(value)
  })
})

/**
 * 選択範囲のSQLを取得、選択がない場合は全体を返す
 */
function getSelectedSql(): string {
  if (!editor) return sql.value

  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) {
    return sql.value
  }

  const model = editor.getModel()
  if (!model) return sql.value

  return model.getValueInRange(selection)
}

/**
 * エラー行をハイライト
 */
watch(error, (newError) => {
  if (!editor) return

  // 既存のデコレーションをクリア
  decorations = editor.deltaDecorations(decorations, [])

  if (newError && newError.line) {
    // エラー行をハイライト
    decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(newError.line, 1, newError.line, 1),
        options: {
          isWholeLine: true,
          className: 'error-line',
          glyphMarginClassName: 'error-glyph',
        },
      },
    ])
  }
})

/**
 * テーマ変更時にエディタのテーマを更新
 */
watch(isDark, (dark) => {
  if (editor) {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
  }
})
</script>

<template>
  <div ref="editorRef" class="h-full" />
</template>

<style scoped>
:deep(.error-line) {
  background-color: rgba(255, 0, 0, 0.1);
}
:deep(.error-glyph) {
  background-color: red;
}
</style>
```

### 3. ResultPanel.vue（新規作成）

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { computed } from 'vue'

const store = useSqlEditorStore()
const { result, error, isExecuting } = storeToRefs(store)

const stats = computed(() => {
  if (!result.value) return null
  return {
    executionTime: (result.value.executionTimeMs / 1000).toFixed(3),
    rowCount: result.value.totalCount,
    rowsAffected: result.value.rowsAffected,
  }
})

const hasResult = computed(() => result.value && result.value.rows.length > 0)
</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <!-- ローディング状態 -->
    <div v-if="isExecuting" class="flex items-center gap-2">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      <span>実行中...</span>
    </div>

    <!-- エラー表示 -->
    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      :title="error.message"
      :description="error.hint"
    />

    <!-- 結果表示 -->
    <div v-if="hasResult" class="space-y-4">
      <!-- 統計情報 -->
      <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>実行時間: {{ stats.executionTime }}秒</span>
        <span v-if="stats.rowCount !== undefined">{{ stats.rowCount }}件</span>
        <span v-if="stats.rowsAffected !== undefined">{{ stats.rowsAffected }}行を更新しました</span>
      </div>

      <!-- テーブル表示 -->
      <div class="overflow-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                v-for="column in result.columns"
                :key="column.name"
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ column.name }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="(row, index) in result.rows" :key="index">
              <td
                v-for="column in result.columns"
                :key="column.name"
                class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
              >
                <span v-if="row[column.name] === null" class="text-gray-400 italic">NULL</span>
                <span v-else>{{ row[column.name] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 結果なし -->
    <div v-if="!isExecuting && !error && !hasResult" class="text-center text-gray-500 dark:text-gray-400">
      クエリを実行してください
    </div>
  </div>
</template>
```

### 4. sql-editor.ts（ストアのアクション実装）

```typescript
import { defineStore } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { queryApi } from '~/api/query'
import type { SqlEditorState, ExecutionStats } from '~/types/sql-editor'
import type { QueryExecuteRequest, QueryExecuteResponse } from '~/types/query-result'

export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => ({
    connectionId: null,
    sql: '',
    isDirty: false,
    isExecuting: false,
    result: null,
    error: null,
  }),

  getters: {
    currentConnection(state) {
      if (!state.connectionId) return null
      const connectionStore = useConnectionStore()
      return connectionStore.getConnectionById(state.connectionId) || null
    },

    canExecute(state): boolean {
      return !state.isExecuting && state.sql.trim().length > 0
    },
  },

  actions: {
    setConnection(connectionId: string) {
      this.connectionId = connectionId
    },

    updateSql(sql: string) {
      if (this.sql === sql) return
      this.sql = sql
      this.isDirty = true
    },

    reset() {
      this.sql = ''
      this.isDirty = false
      this.result = null
      this.error = null
    },

    /**
     * クエリ実行
     */
    async executeQuery(sqlToExecute?: string) {
      if (!this.connectionId) {
        this.error = { message: '接続が選択されていません' }
        return
      }

      const sql = sqlToExecute || this.sql
      if (!sql.trim()) {
        this.error = { message: '実行するSQLが空です' }
        return
      }

      this.isExecuting = true
      this.error = null
      this.result = null

      try {
        const request: QueryExecuteRequest = {
          connectionId: this.connectionId,
          sql: sql.trim(),
        }

        const response: QueryExecuteResponse = await queryApi.executeQuery(request)

        this.result = {
          columns: response.columns,
          rows: response.rows,
          totalCount: response.total_count,
          executionTimeMs: response.execution_time_ms,
          rowsAffected: response.rows_affected,
        }
      } catch (err: any) {
        this.error = {
          message: err.message || 'クエリ実行に失敗しました',
          hint: err.hint,
          line: err.line,
          column: err.column,
        }
      } finally {
        this.isExecuting = false
      }
    },

    /**
     * クエリキャンセル
     */
    async cancelQuery() {
      if (!this.isExecuting) return

      try {
        // NOTE: queryIdの管理が必要な場合は、executeQuery時に保存する
        // 現時点では簡易的にフラグのみ更新
        await queryApi.cancelQuery('') // 空文字は暫定
        this.isExecuting = false
      } catch (err: any) {
        console.error('Failed to cancel query:', err)
      }
    },
  },
})
```

## テストコード

### ユニットテスト例

#### sql-editor.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { queryApi } from '~/api/query'

vi.mock('~/api/query')

describe('SqlEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty state', () => {
    const store = useSqlEditorStore()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.isExecuting).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })

  it('should update SQL and set dirty flag', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT * FROM users')
    expect(store.sql).toBe('SELECT * FROM users')
    expect(store.isDirty).toBe(true)
  })

  it('should execute query successfully', async () => {
    const store = useSqlEditorStore()
    store.setConnection('test-connection-id')
    store.updateSql('SELECT * FROM users')

    const mockResponse = {
      columns: [{ name: 'id', type: 'integer' }, { name: 'name', type: 'text' }],
      rows: [{ id: 1, name: 'Alice' }],
      total_count: 1,
      execution_time_ms: 23,
    }

    vi.mocked(queryApi.executeQuery).mockResolvedValue(mockResponse)

    await store.executeQuery()

    expect(store.isExecuting).toBe(false)
    expect(store.result).toBeTruthy()
    expect(store.result?.rows).toHaveLength(1)
    expect(store.error).toBeNull()
  })

  it('should handle query execution error', async () => {
    const store = useSqlEditorStore()
    store.setConnection('test-connection-id')
    store.updateSql('INVALID SQL')

    vi.mocked(queryApi.executeQuery).mockRejectedValue(new Error('Syntax error'))

    await store.executeQuery()

    expect(store.isExecuting).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeTruthy()
    expect(store.error?.message).toContain('Syntax error')
  })

  it('canExecute should return false when executing', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')
    expect(store.canExecute).toBe(true)

    store.isExecuting = true
    expect(store.canExecute).toBe(false)
  })
})
```

### E2Eテスト例

#### sql-editor.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('SQL Editor Query Execution', () => {
  test.beforeEach(async ({ page }) => {
    // ランチャーからSQLエディタを起動
    await page.goto('/')
    await page.click('[data-test="connection-card-sql-editor-button"]')
    await expect(page).toHaveTitle(/SQL Editor/)
  })

  test('should execute simple SELECT query', async ({ page }) => {
    // SQLを入力
    await page.fill('.monaco-editor textarea', 'SELECT 1 as num')

    // 実行ボタンをクリック
    await page.click('button:has-text("実行")')

    // 結果が表示されるまで待機
    await expect(page.locator('[data-test="result-table"]')).toBeVisible()

    // 結果を確認
    await expect(page.locator('th:has-text("num")')).toBeVisible()
    await expect(page.locator('td:has-text("1")')).toBeVisible()
  })

  test('should execute query with Ctrl+Enter', async ({ page }) => {
    await page.fill('.monaco-editor textarea', 'SELECT 1')

    // Ctrl+Enter を押下
    await page.keyboard.press('Control+Enter')

    await expect(page.locator('[data-test="result-table"]')).toBeVisible()
  })

  test('should display error for invalid SQL', async ({ page }) => {
    await page.fill('.monaco-editor textarea', 'INVALID SQL')
    await page.click('button:has-text("実行")')

    // エラーメッセージが表示される
    await expect(page.locator('[role="alert"]')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toContainText('Syntax error')
  })

  test('should execute selected SQL only', async ({ page }) => {
    // 複数行のSQLを入力
    await page.fill('.monaco-editor textarea', 'SELECT 1;\nSELECT 2;')

    // 1行目を選択
    // TODO: Monaco Editorの選択操作を実装

    await page.keyboard.press('Control+Enter')

    // 結果に「1」のみが表示される
    await expect(page.locator('td:has-text("1")')).toBeVisible()
    await expect(page.locator('td:has-text("2")')).not.toBeVisible()
  })
})
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| 既存のクエリ実行APIを流用 | バックエンドの変更不要、実装工数削減 | 新規にSQL Editor専用のコマンド作成（オーバーエンジニアリング） |
| Monaco Editorを使用 | WBSでPhase 2で採用決定済み、VSCode同等の機能 | CodeMirror 6（軽量だが機能が限定的） |
| 選択範囲実行を標準動作に | 大きなSQLファイルの一部のみ実行する用途が多い | 常に全体実行（不便） |
| 結果パネルを新規作成 | クエリビルダーのResultPanelと要件が異なる（エクスポート不要、シンプル化） | 既存ResultPanelをそのまま流用（オーバースペック） |
| エラー行のハイライト | ユーザビリティ向上、Monaco Editorの機能を活用 | エラーメッセージのみ表示（エラー箇所が分かりにくい） |

## 未解決事項

- [ ] queryIdの管理方法（現状、cancelQueryに空文字を渡している）
- [ ] 長時間クエリのタイムアウト設定（バックエンド側で設定済みか確認）
- [ ] ページネーション実装の要否（Phase 3で10,000件まで表示可能か確認）
- [ ] NULL値の表示方法の統一（既存のResultPanelとの整合性）

## Phase 4以降への引き継ぎ事項

- クエリ保存機能（SaveQueryDialog.vue、保存済みクエリパネル）
- クエリ履歴機能（QueryHistoryPanel.vue、履歴の自動保存）
- タブ機能（複数クエリの同時編集）
- SQLフォーマット機能（monaco-editor用のSQLフォーマッタープラグイン）
