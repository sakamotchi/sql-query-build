# 設計書 - SQLエディタ Phase 2: エディタUI基本構築

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓
Monaco Editor (エディタライブラリ)
    ↓
Pinia Store (状態管理)
    ↓
Local State (エディタ内容)
```

### 影響範囲

- **フロントエンド**:
  - `app/pages/sql-editor.vue` - 既存ページの更新（Phase 1の空ページに内容を追加）
  - `app/components/sql-editor/` - 新規コンポーネントディレクトリ
  - `app/stores/sql-editor.ts` - 新規ストア
  - `app/types/sql-editor.ts` - 新規型定義
  - `package.json` - Monaco Editor関連パッケージの追加
  - `nuxt.config.ts` - Monaco Editorのビルド設定追加

- **バックエンド**: なし（Phase 2ではバックエンド実装不要）

## 実装方針

### 概要

Monaco EditorをVue 3環境に統合し、VSCode同等のSQL編集機能を提供します。Phase 2ではエディタUIのみを実装し、クエリ実行機能はPhase 3で実装します。

### 詳細

1. **パッケージ導入**
   - Monaco Editor本体をインストール
   - Vite用のMonaco Editorプラグインを導入
   - SQL言語サポートは標準搭載されているため追加不要

2. **コンポーネント設計**
   - レイアウト、ツールバー、テキストエディタの3層構造
   - 各コンポーネントは単一責任の原則に従う
   - Nuxt UI v4コンポーネントを使用してUIを構築

3. **状態管理**
   - Piniaストアでエディタの状態を一元管理
   - 接続情報、SQL文字列、将来の実行結果を保持

4. **テーマ統合**
   - Nuxt UIのカラースキーム（ライト/ダーク）に追従
   - Monaco Editorのテーマを動的に切り替え

5. **段階的実装**
   - まずエディタUIの基本機能を実装
   - ツールバーのボタンは無効状態で配置（Phase 3で有効化）

## データ構造

### 型定義（TypeScript）

```typescript
// app/types/sql-editor.ts

import type * as monaco from 'monaco-editor'
import type { QueryExecuteResult, QueryExecuteError } from './query-result'

/**
 * SQLエディタの状態
 */
export interface SqlEditorState {
  /** 接続ID */
  connectionId: string | null
  /** 現在のSQL文字列 */
  sql: string
  /** エディタが変更されたか（保存判定用） */
  isDirty: boolean
  /** 実行中フラグ（Phase 3で使用） */
  isExecuting: boolean
  /** 実行結果（Phase 3で使用） */
  result: QueryExecuteResult | null
  /** エラー情報（Phase 3で使用） */
  error: QueryExecuteError | null
}

/**
 * SQLエディタタブ（Phase 6で使用）
 */
export interface SqlEditorTab {
  /** タブID */
  id: string
  /** タブ名 */
  name: string
  /** SQL文字列 */
  sql: string
  /** 変更フラグ */
  isDirty: boolean
  /** 作成日時 */
  createdAt: string
}

/**
 * Monaco Editorオプション
 */
export interface MonacoEditorOptions {
  /** テーマ */
  theme: 'vs' | 'vs-dark'
  /** 言語 */
  language: 'sql'
  /** 自動レイアウト */
  automaticLayout: boolean
  /** ミニマップ表示 */
  minimap: { enabled: boolean }
  /** 行番号表示 */
  lineNumbers: 'on' | 'off'
  /** フォントサイズ */
  fontSize: number
  /** 読み取り専用 */
  readOnly: boolean
}
```

### Piniaストア構造

```typescript
// app/stores/sql-editor.ts

import { defineStore } from 'pinia'
import type { SqlEditorState } from '@/types/sql-editor'
import type * as monaco from 'monaco-editor'

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
    /**
     * 現在の接続情報を取得
     */
    currentConnection(state) {
      if (!state.connectionId) return null
      const connectionStore = useConnectionStore()
      return connectionStore.getConnectionById(state.connectionId)
    },

    /**
     * 実行可能かどうか（Phase 3で使用）
     */
    canExecute(state): boolean {
      return !state.isExecuting && state.sql.trim().length > 0
    },
  },

  actions: {
    /**
     * 接続を設定
     */
    setConnection(connectionId: string) {
      this.connectionId = connectionId
    },

    /**
     * SQL文字列を更新
     */
    updateSql(sql: string) {
      this.sql = sql
      this.isDirty = true
    },

    /**
     * エディタをリセット
     */
    reset() {
      this.sql = ''
      this.isDirty = false
      this.result = null
      this.error = null
    },

    /**
     * クエリ実行（Phase 3で実装）
     */
    async executeQuery() {
      // Phase 3で実装
      throw new Error('Not implemented yet')
    },
  },
})
```

## コンポーネント設計

### コンポーネント構成

```
sql-editor.vue (ページ)
└── SqlEditorLayout.vue
    ├── SqlEditorToolbar.vue
    ├── SqlTextEditor.vue
    └── <div> (結果パネル用プレースホルダー)
```

### 1. SqlEditorLayout.vue

**責務**: エディタの全体レイアウトを管理

```vue
<script setup lang="ts">
// レイアウトの構造のみを管理
// ツールバー、エディタ、結果パネルの配置
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- ツールバー -->
    <SqlEditorToolbar class="flex-shrink-0" />

    <!-- メインコンテンツ（エディタ + 結果パネル） -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- エディタエリア -->
      <div class="flex-1 min-h-0">
        <SqlTextEditor />
      </div>

      <!-- 結果パネル（Phase 3で実装） -->
      <div class="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
        <div class="h-full flex items-center justify-center text-gray-400">
          <p>結果パネル（Phase 3で実装）</p>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. SqlEditorToolbar.vue

**責務**: ツールバーUI（ボタンは無効状態で配置）

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

const sqlEditorStore = useSqlEditorStore()
const { isExecuting } = storeToRefs(sqlEditorStore)

// Phase 3で実装
function handleExecute() {
  console.log('Execute button clicked (not implemented yet)')
}

function handleStop() {
  console.log('Stop button clicked (not implemented yet)')
}

function handleSave() {
  console.log('Save button clicked (not implemented yet)')
}
</script>

<template>
  <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
    <div class="flex items-center gap-2">
      <!-- 実行ボタン -->
      <UButton
        icon="i-heroicons-play"
        label="実行"
        :disabled="true"
        color="primary"
        @click="handleExecute"
      />

      <!-- 停止ボタン -->
      <UButton
        icon="i-heroicons-stop"
        label="停止"
        :disabled="true"
        color="gray"
        variant="soft"
        @click="handleStop"
      />

      <div class="flex-1" />

      <!-- 保存ボタン -->
      <UButton
        icon="i-heroicons-bookmark"
        label="保存"
        :disabled="true"
        color="gray"
        variant="soft"
        @click="handleSave"
      />
    </div>
  </div>
</template>
```

### 3. SqlTextEditor.vue

**責務**: Monaco Editorの統合とSQL編集機能の提供

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useColorMode } from '#app'

const sqlEditorStore = useSqlEditorStore()
const { sql: currentSql } = storeToRefs(sqlEditorStore)
const colorMode = useColorMode()

const editorElement = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!editorElement.value) return

  // Monaco Editorの初期化
  editor = monaco.editor.create(editorElement.value, {
    value: currentSql.value,
    language: 'sql',
    theme: colorMode.value === 'dark' ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    fontSize: 14,
    readOnly: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  })

  // 内容変更時のハンドラー
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() || ''
    sqlEditorStore.updateSql(value)
  })
})

// カラーモード変更時のテーマ切り替え
watch(() => colorMode.value, (mode) => {
  if (!editor) return

  const newTheme = mode === 'dark' ? 'vs-dark' : 'vs'
  monaco.editor.setTheme(newTheme)
})

// ストアのSQL変更を監視（外部からの変更を反映）
watch(() => currentSql.value, (newSql) => {
  if (!editor) return
  const currentValue = editor.getValue()
  if (newSql !== currentValue) {
    editor.setValue(newSql)
  }
})

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})
</script>

<template>
  <div
    ref="editorElement"
    class="h-full w-full"
  />
</template>
```

### 4. sql-editor.vue（ページ更新）

**既存ページの更新**: Phase 1の空ページにレイアウトを組み込む

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { Connection } from '~/types'

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const sqlEditorStore = useSqlEditorStore()
const { currentConnectionId } = storeToRefs(windowStore)

const connection = computed<Connection | null>(() => {
  if (!currentConnectionId.value) {
    return null
  }
  return connectionStore.getConnectionById(currentConnectionId.value) || null
})

watch(connection, (value) => {
  if (value) {
    windowStore.setConnectionContext(value.id, value.environment)
    sqlEditorStore.setConnection(value.id)
  }
}, { immediate: true })

onMounted(async () => {
  if (connectionStore.connections.length === 0) {
    try {
      await connectionStore.loadConnections()
    } catch (error) {
      console.warn('[SqlEditor] Failed to load connections:', error)
    }
  }
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <EnvironmentHeader
      v-if="connection"
      :environment="connection.environment"
    />

    <div class="flex-1 min-h-0">
      <SqlEditorLayout />
    </div>
  </div>
</template>
```

## UI設計

### 画面構成

```
┌─────────────────────────────────────────────────┐
│ EnvironmentHeader (既存)                       │
├─────────────────────────────────────────────────┤
│ SqlEditorToolbar                                │
│ [▶ 実行] [⏹ 停止]            [🔖 保存]        │
├─────────────────────────────────────────────────┤
│ SqlTextEditor (Monaco Editor)                   │
│   1  SELECT *                                    │
│   2  FROM users                                  │
│   3  WHERE id = 1;                               │
│   4                                              │
│   5                                              │
├─────────────────────────────────────────────────┤
│ 結果パネル（Phase 3で実装）                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

### カラー設計

Monaco Editorの標準テーマを使用します。

#### ライトモード（`vs`テーマ）
- エディタ背景: 白
- エディタテキスト: 黒
- 行番号: グレー
- キーワード: 青
- 文字列: 赤
- コメント: 緑

#### ダークモード（`vs-dark`テーマ）
- エディタ背景: ダークグレー
- エディタテキスト: 白
- 行番号: グレー
- キーワード: ライトブルー
- 文字列: オレンジ
- コメント: 緑

## パッケージ導入

### package.json への追加

```json
{
  "dependencies": {
    "monaco-editor": "^0.45.0"
  },
  "devDependencies": {
    "vite-plugin-monaco-editor": "^1.1.0"
  }
}
```

### nuxt.config.ts の更新

```typescript
import { defineNuxtConfig } from 'nuxt/config'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineNuxtConfig({
  // ...existing config...

  vite: {
    plugins: [
      monacoEditorPlugin({
        // SQLは専用ワーカーがないため editorWorkerService のみ使用
        languageWorkers: ['editorWorkerService'],
      }),
    ],
    optimizeDeps: {
      include: ['monaco-editor'],
    },
  },
})
```

### Monaco Worker設定（Nuxtプラグイン）

Nuxt環境でMonacoのWeb Workerが取得できない場合があるため、
`MonacoEnvironment.getWorker` を明示的に定義します。
SQLは専用ワーカーがないため、デフォルトは editor worker を使用します。

```typescript
// app/plugins/monaco.client.ts
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

export default defineNuxtPlugin(() => {
  const monacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') return new jsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
      if (label === 'typescript' || label === 'javascript') return new tsWorker()
      return new editorWorker()
    },
  }

  ;(globalThis as any).MonacoEnvironment = monacoEnvironment
})
```

### インストールコマンド

```bash
npm install monaco-editor
npm install -D vite-plugin-monaco-editor
```

## テストコード

### ユニットテスト例

```typescript
// tests/stores/sql-editor.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '@/stores/sql-editor'

describe('useSqlEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態が正しく設定される', () => {
    const store = useSqlEditorStore()

    expect(store.connectionId).toBeNull()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.isExecuting).toBe(false)
  })

  it('setConnection でconnectionIdが設定される', () => {
    const store = useSqlEditorStore()
    const connectionId = 'test-connection-id'

    store.setConnection(connectionId)

    expect(store.connectionId).toBe(connectionId)
  })

  it('updateSql でSQLが更新され、isDirtyがtrueになる', () => {
    const store = useSqlEditorStore()
    const sql = 'SELECT * FROM users'

    store.updateSql(sql)

    expect(store.sql).toBe(sql)
    expect(store.isDirty).toBe(true)
  })

  it('reset で状態がリセットされる', () => {
    const store = useSqlEditorStore()

    store.setConnection('test-id')
    store.updateSql('SELECT * FROM users')

    store.reset()

    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })

  it('canExecute は isExecuting=false かつ sql非空の時のみtrue', () => {
    const store = useSqlEditorStore()

    // 初期状態（sql空）
    expect(store.canExecute).toBe(false)

    // SQL設定後
    store.updateSql('SELECT 1')
    expect(store.canExecute).toBe(true)

    // 実行中
    store.isExecuting = true
    expect(store.canExecute).toBe(false)
  })
})
```

### コンポーネントテスト例

```typescript
// tests/components/sql-editor/SqlEditorToolbar.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SqlEditorToolbar from '@/components/sql-editor/SqlEditorToolbar.vue'

describe('SqlEditorToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('正しくレンダリングされる', () => {
    const wrapper = mount(SqlEditorToolbar)

    // ボタンが存在する
    expect(wrapper.find('[label="実行"]').exists()).toBe(true)
    expect(wrapper.find('[label="停止"]').exists()).toBe(true)
    expect(wrapper.find('[label="保存"]').exists()).toBe(true)
  })

  it('Phase 2では全てのボタンが無効状態', () => {
    const wrapper = mount(SqlEditorToolbar)

    const executeButton = wrapper.find('[label="実行"]')
    const stopButton = wrapper.find('[label="停止"]')
    const saveButton = wrapper.find('[label="保存"]')

    expect(executeButton.attributes('disabled')).toBe('true')
    expect(stopButton.attributes('disabled')).toBe('true')
    expect(saveButton.attributes('disabled')).toBe('true')
  })
})
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| Monaco Editorを採用 | VSCode同等の機能、IntelliSense対応、将来の拡張性 | CodeMirror 6（軽量だが機能限定的） |
| Phase 2ではツールバーボタンは無効状態 | UI構造を先に作り、Phase 3で機能実装する段階的アプローチ | Phase 3まで待ってから一緒に実装（リスク大） |
| 結果パネルはプレースホルダーのみ | Phase 3で実装するため、Phase 2では場所だけ確保 | 最初から結果パネルも実装（スコープ肥大化） |
| Piniaストアで状態管理 | アプリ全体の状態管理パターンに統一 | コンポーネント内state（複数タブ対応が困難） |
| Monaco Editorの標準テーマを使用 | 実装コスト削減、ユーザーに馴染みのあるUI | カスタムテーマ（実装コスト増） |
| ミニマップは無効化 | SQLエディタではミニマップの利用価値が低い | ミニマップ有効化（画面占有） |
| vite-plugin-monaco-editorを使用 | Viteとの統合が容易、ビルド最適化 | 手動でWorker設定（複雑） |

## 未解決事項

- [ ] Monaco Editorの初期化パフォーマンス最適化（遅延読み込み等）
- [ ] Monaco EditorのテーマをTailwind CSSの色に完全に合わせるか？（Phase 2実装時に検討）
- [ ] 大規模SQL（10,000行超）でのパフォーマンステスト（Phase 2実装後に検証）
- [ ] SQL方言の切り替え（PostgreSQL/MySQL/SQLite）は必要か？（Phase 3以降で検討）
- [ ] エディタのフォントサイズや行間の設定UI（Phase 6またはそれ以降で検討）

## 実装順序

### ステップ1: パッケージ導入
1. Monaco Editor関連パッケージをインストール
2. package.json, nuxt.config.tsの更新
3. 動作確認（簡易テスト）

### ステップ2: 型定義・ストア作成
1. `app/types/sql-editor.ts` を作成
2. `app/stores/sql-editor.ts` を作成
3. ユニットテストを作成・実行

### ステップ3: コンポーネント実装
1. `SqlTextEditor.vue` を作成（Monaco Editor統合）
2. `SqlEditorToolbar.vue` を作成（ボタンのみ）
3. `SqlEditorLayout.vue` を作成（レイアウト）
4. 各コンポーネントのユニットテストを作成

### ステップ4: ページ統合
1. `sql-editor.vue` を更新（レイアウトを組み込み）
2. 接続情報の受け渡しを実装
3. 動作確認（手動テスト）

### ステップ5: テーマ調整・最終確認
1. ライトモード/ダークモードの切り替えテスト
2. レスポンシブ対応確認
3. Undo/Redoの動作確認
4. 構文ハイライトの確認

## 参考資料

- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [vite-plugin-monaco-editor](https://github.com/vdesjs/vite-plugin-monaco-editor)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Nuxt UI v4 Documentation](https://ui.nuxt.com/)
- [WBS Phase 2](../../local/20260117_エディタ機能/wbs.md#phase-2-エディタui基本構築)
