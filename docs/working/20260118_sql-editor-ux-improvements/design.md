# 設計書 - SQLエディタ Phase 6: UX改善・仕上げ

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
  ├─ SqlEditorLayout.vue (タブ管理、リサイズハンドル追加)
  ├─ EditorTabs.vue (新規: タブUI)
  ├─ SqlEditorToolbar.vue (フォーマットボタン追加)
  ├─ SqlTextEditor.vue (Monaco Editor設定拡張)
  ├─ SqlEditorResultPanel.vue (エクスポートボタン追加)
  └─ sql-editor store (タブ管理、フォーマット処理)
      ↓ sql-formatter (JavaScript library)
      ↓ ExportDialog (既存コンポーネント流用)
```

### 影響範囲

- **フロントエンド**:
  - `app/components/sql-editor/SqlEditorLayout.vue` - タブ機能、リサイズハンドル追加
  - `app/components/sql-editor/EditorTabs.vue` - **新規作成**: タブUI
  - `app/components/sql-editor/SqlEditorToolbar.vue` - フォーマットボタン追加
  - `app/components/sql-editor/SqlTextEditor.vue` - Monaco Editor設定拡張
  - `app/components/sql-editor/SqlEditorResultPanel.vue` - エクスポートボタン追加
  - `app/stores/sql-editor.ts` - タブ管理、フォーマット処理追加
  - `app/pages/sql-editor.vue` - beforeunload イベントハンドラー追加
  - `app/types/sql-editor.ts` - タブ関連の型追加

- **バックエンド**:
  - なし（SQLフォーマットはフロントエンド側で処理）

- **依存パッケージ**:
  - `sql-formatter` - SQLフォーマット機能

## 実装方針

### 概要

Phase 6では、既存のSQLエディタに以下の8つの機能を追加する：

1. **SQLフォーマット**: `sql-formatter` ライブラリを使用してフロントエンド側で処理
2. **括弧の対応表示**: Monaco Editorの標準機能（`matchBrackets`）を有効化
3. **検索・置換**: Monaco Editorの標準機能（Ctrl+F / Ctrl+H）を有効化
4. **タブ機能**: ストアで複数タブの状態を管理し、EditorTabsコンポーネントで表示
5. **未保存警告**: `beforeunload` イベントと `UModal` で確認ダイアログ表示
6. **エクスポート連携**: 既存の `ExportDialog` コンポーネントを流用
7. **パネルのリサイズ**: CSS Flexboxまたは `vue-resizable` ライブラリを使用
8. **ダークモード対応**: Monaco Editorのテーマを `useColorMode()` と連動

### 実装優先順位

| 優先度 | 機能 | 理由 |
|--------|------|------|
| 高 | SQLフォーマット | 最も要望が多く、実装が独立している |
| 高 | 括弧の対応表示 | Monaco Editorの設定変更のみで実現可能 |
| 高 | 検索・置換 | Monaco Editorの標準機能を有効化するだけ |
| 中 | エクスポート連携 | 既存コンポーネント流用で工数小 |
| 中 | ダークモード対応 | 既存の `useColorMode()` と連動 |
| 中 | パネルのリサイズ | UX向上だが必須ではない |
| 低 | タブ機能 | 複雑度が高く、状態管理の変更が必要 |
| 低 | 未保存警告 | タブ機能に依存 |

### 段階的実装アプローチ

1. **ステップ1**: Monaco Editor設定拡張（括弧対応、検索・置換）- 工数小、効果大
2. **ステップ2**: SQLフォーマット機能 - 独立した機能、工数中
3. **ステップ3**: エクスポート連携、ダークモード対応 - 既存資産活用、工数小
4. **ステップ4**: パネルのリサイズ - UX改善、工数中
5. **ステップ5**: タブ機能 - 工数大、状態管理の変更必要
6. **ステップ6**: 未保存警告 - タブ機能完成後に実装

## データ構造

### 型定義（TypeScript）

#### タブ関連の型

```typescript
/**
 * エディタタブ
 */
export interface EditorTab {
  /** タブID（UUID） */
  id: string
  /** タブ名（保存クエリの名前、または "Untitled 1" など） */
  name: string
  /** SQL内容 */
  sql: string
  /** 未保存フラグ */
  isDirty: boolean
  /** カーソル位置（Monaco Editorの Position） */
  cursorPosition?: { lineNumber: number; column: number }
  /** 実行結果 */
  result: QueryResult | null
  /** エラー */
  error: QueryExecuteError | null
  /** 保存済みクエリID（保存クエリを読み込んだ場合） */
  savedQueryId?: string
}

/**
 * SQLエディタストア拡張
 */
export interface SqlEditorState {
  // ... 既存のフィールド

  /** タブ一覧 */
  tabs: EditorTab[]
  /** 現在のアクティブなタブID */
  activeTabId: string | null
  /** パネルリサイズのサイズ（%） */
  editorPanelHeightPercent: number
}
```

#### SQLフォーマット設定

```typescript
/**
 * SQLフォーマット設定
 */
export interface SqlFormatterConfig {
  /** キーワードを大文字にするか */
  uppercase?: boolean
  /** インデント文字（スペース数） */
  indent?: number
  /** SQLダイアレクト（postgresql, mysql, sqlite） */
  language?: 'postgresql' | 'mysql' | 'sqlite'
}
```

## UI設計

### 画面構成

```
┌────────────────────────────────────────────────────────────┐
│  EnvironmentHeader (既存)                                   │
│  SQL Query Build  [開発環境]                                │
├────────────────────────────────────────────────────────────┤
│  SQLエディタツールバー                                       │
│  [▶実行] [■停止] [💾保存] [整形]                            │
├────────────────────────────────────────────────────────────┤
│  タブバー                                                   │
│  [✓ Main Query] [* Untitled 1] [+ 新規]                    │
├────────────────┬───────────────────────────────────────────┤
│ ┌────────────┐ │                                           │
│ │ 保存済み    │ │  SQLエディタ（メイン）                      │
│ │ クエリ      │ │  ┌────────────────────────────────────┐  │
│ │ [検索...]  │ │  │ 1 │ SELECT                       │  │
│ │            │ │  │ 2 │   u.id,                      │  │
│ │ ・全顧客    │ │  │ 3 │   u.name,                    │  │
│ │ ・月次売上  │ │  │ 4 │   COUNT(o.id) as order_count │  │
│ │ ・在庫確認  │ │  │ ...                               │  │
│ └────────────┘ │  └────────────────────────────────────┘  │
│ ─────────────── │                                           │
│ ┌────────────┐ │  ← リサイズハンドル →                      │
│ │ 履歴        │ │                                           │
│ │ [検索...]  │ ├───────────────────────────────────────────┤
│ │ ☑成功のみ  │ │  結果パネル                                │
│ │            │ │  ┌────────────────────────────────────┐  │
│ │ • SELECT.. │ │  │ 実行時間: 0.023秒 | 100件            │  │
│ │   1分前    │ │  │ [エクスポート▼]                      │  │
│ │ • INSERT.. │ │  ├────────────────────────────────────┤  │
│ │   5分前    │ │  │ id  │ name   │ order_count         │  │
│ └────────────┘ │  │ 1   │ Alice  │ 42                  │  │
│                │  │ 2   │ Bob    │ 38                  │  │
│                │  └────────────────────────────────────┘  │
└────────────────┴───────────────────────────────────────────┘
```

### コンポーネント構成

```
sql-editor.vue (ページ)
├─ EnvironmentHeader.vue (既存: アプリ名と環境表示)
└─ SqlEditorLayout.vue
   ├─ SqlEditorToolbar.vue (拡張: フォーマットボタン追加)
   ├─ EditorTabs.vue (新規)
   │  ├─ [タブボタン] × N
   │  └─ [新規タブボタン]
   ├─ 左サイドパネル (固定幅: w-80)
   │  ├─ SqlEditorSavedPanel.vue (既存: 上半分)
   │  └─ SqlEditorHistoryPanel.vue (既存: 下半分)
   └─ 右メインエリア (flex-1)
      ├─ SqlTextEditor.vue (拡張: 上半分)
      │  └─ Monaco Editor (設定追加)
      ├─ リサイズハンドル (新規)
      └─ SqlEditorResultPanel.vue (拡張: 下半分)
         ├─ 結果テーブル (既存)
         └─ [エクスポート] ボタン → ExportDialog (既存)
```

## 実装詳細

### 1. SQLフォーマット機能

#### 依存パッケージのインストール

```bash
npm install sql-formatter
```

#### ストアにフォーマット処理追加

```typescript
// app/stores/sql-editor.ts

import { format } from 'sql-formatter'

export const useSqlEditorStore = defineStore('sql-editor', {
  actions: {
    /**
     * SQLをフォーマット
     */
    formatSql() {
      if (!this.sql.trim()) return

      try {
        const formatted = format(this.sql, {
          language: 'postgresql', // TODO: 接続のDB種類に応じて変更
          uppercase: true,
          indent: '  ', // 2スペース
        })
        this.updateSql(formatted)
      } catch (error) {
        console.error('SQL format error:', error)
        // エラー時は何もしない（元のSQLを保持）
      }
    },
  },
})
```

#### ツールバーにボタン追加

```vue
<!-- app/components/sql-editor/SqlEditorToolbar.vue -->

<template>
  <div class="flex items-center gap-2">
    <!-- 既存のボタン -->
    <UButton
      icon="i-heroicons-play-solid"
      :disabled="!canExecute"
      @click="executeQuery"
    >
      実行
    </UButton>

    <!-- フォーマットボタン（新規） -->
    <UButton
      icon="i-heroicons-sparkles"
      variant="outline"
      :disabled="!sql.trim()"
      @click="formatSql"
    >
      整形
    </UButton>

    <!-- ... その他のボタン -->
  </div>
</template>

<script setup lang="ts">
const store = useSqlEditorStore()

const formatSql = () => {
  store.formatSql()
}
</script>
```

#### キーボードショートカット追加

```vue
<!-- app/components/sql-editor/SqlTextEditor.vue -->

<script setup lang="ts">
import * as monaco from 'monaco-editor'

const initMonaco = () => {
  // ... 既存の初期化処理

  // Ctrl+Shift+F でフォーマット
  editorInstance.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    () => {
      store.formatSql()
    }
  )
}
</script>
```

### 2. 括弧の対応表示

Monaco Editorの標準機能を有効化するだけで実現可能。

```typescript
// app/components/sql-editor/SqlTextEditor.vue

const initMonaco = () => {
  editorInstance = monaco.editor.create(editorContainer.value, {
    // ... 既存の設定
    matchBrackets: 'always', // 括弧の対応を常に表示
    bracketPairColorization: {
      enabled: true, // 括弧をペアで色分け（Monaco Editor v0.33.0+）
    },
  })
}
```

### 3. 検索・置換機能

Monaco Editorの標準機能（Ctrl+F / Ctrl+H）を有効化。デフォルトで有効なので、特別な設定は不要。

```typescript
// app/components/sql-editor/SqlTextEditor.vue

const initMonaco = () => {
  editorInstance = monaco.editor.create(editorContainer.value, {
    // ... 既存の設定
    find: {
      seedSearchStringFromSelection: 'always', // 選択範囲を検索キーワードに自動設定
      autoFindInSelection: 'never',
    },
  })
}
```

**注**: Monaco Editorはデフォルトで Ctrl+F（検索）と Ctrl+H（置換）のショートカットが有効。追加実装は不要。

### 4. タブ機能

#### ストア拡張

```typescript
// app/stores/sql-editor.ts

import { v4 as uuidv4 } from 'uuid'

export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => ({
    // ... 既存のフィールド
    tabs: [],
    activeTabId: null,
  }),

  getters: {
    /**
     * アクティブなタブ
     */
    activeTab(state): EditorTab | null {
      return state.tabs.find((tab) => tab.id === state.activeTabId) || null
    },
  },

  actions: {
    /**
     * 新規タブを追加
     */
    addTab(name = 'Untitled') {
      const id = uuidv4()
      const tab: EditorTab = {
        id,
        name: `${name} ${this.tabs.length + 1}`,
        sql: '',
        isDirty: false,
        result: null,
        error: null,
      }
      this.tabs.push(tab)
      this.activeTabId = id
    },

    /**
     * タブを閉じる
     */
    closeTab(tabId: string) {
      const index = this.tabs.findIndex((tab) => tab.id === tabId)
      if (index === -1) return

      this.tabs.splice(index, 1)

      // アクティブタブが閉じられた場合、隣のタブをアクティブに
      if (this.activeTabId === tabId) {
        if (this.tabs.length > 0) {
          const newIndex = Math.min(index, this.tabs.length - 1)
          this.activeTabId = this.tabs[newIndex].id
        } else {
          this.activeTabId = null
        }
      }
    },

    /**
     * タブを切り替え
     */
    switchTab(tabId: string) {
      const tab = this.tabs.find((t) => t.id === tabId)
      if (!tab) return

      // 現在のタブの状態を保存
      if (this.activeTab) {
        this.activeTab.sql = this.sql
        this.activeTab.isDirty = this.isDirty
        this.activeTab.result = this.result
        this.activeTab.error = this.error
      }

      // 新しいタブの状態を読み込み
      this.activeTabId = tabId
      this.sql = tab.sql
      this.isDirty = tab.isDirty
      this.result = tab.result
      this.error = tab.error
    },

    /**
     * タブの名前を変更
     */
    renameTab(tabId: string, name: string) {
      const tab = this.tabs.find((t) => t.id === tabId)
      if (tab) {
        tab.name = name
      }
    },
  },
})
```

#### EditorTabs コンポーネント（新規）

```vue
<!-- app/components/sql-editor/EditorTabs.vue -->

<template>
  <div class="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 px-2 py-1">
    <UButton
      v-for="tab in tabs"
      :key="tab.id"
      :variant="tab.id === activeTabId ? 'solid' : 'ghost'"
      size="sm"
      @click="switchTab(tab.id)"
    >
      <span>{{ tab.isDirty ? '* ' : '' }}{{ tab.name }}</span>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        size="xs"
        class="ml-1"
        @click.stop="closeTab(tab.id)"
      />
    </UButton>

    <UButton
      icon="i-heroicons-plus"
      variant="ghost"
      size="sm"
      @click="addTab"
    >
      新規
    </UButton>
  </div>
</template>

<script setup lang="ts">
const store = useSqlEditorStore()
const { tabs, activeTabId } = storeToRefs(store)

const switchTab = (tabId: string) => {
  store.switchTab(tabId)
}

const closeTab = (tabId: string) => {
  const tab = tabs.value.find((t) => t.id === tabId)
  if (tab?.isDirty) {
    // 未保存警告を表示（後述）
    showUnsavedWarning(tabId)
  } else {
    store.closeTab(tabId)
  }
}

const addTab = () => {
  store.addTab()
}
</script>
```

### 5. 未保存警告

#### beforeunload イベント

```vue
<!-- app/pages/sql-editor.vue -->

<script setup lang="ts">
const store = useSqlEditorStore()

onMounted(() => {
  // ウィンドウを閉じる際の警告
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  const hasUnsavedChanges = store.tabs.some((tab) => tab.isDirty)
  if (hasUnsavedChanges) {
    e.preventDefault()
    e.returnValue = '' // Chrome requires returnValue to be set
  }
}
</script>
```

#### タブを閉じる際の確認ダイアログ

```vue
<!-- app/components/sql-editor/EditorTabs.vue -->

<script setup lang="ts">
const isUnsavedWarningOpen = ref(false)
const closingTabId = ref<string | null>(null)

const showUnsavedWarning = (tabId: string) => {
  closingTabId.value = tabId
  isUnsavedWarningOpen.value = true
}

const handleSaveAndClose = async () => {
  if (!closingTabId.value) return

  // 保存ダイアログを表示
  store.openSaveDialog()
  // 保存完了後にタブを閉じる処理は保存ダイアログ側で実装
}

const handleDiscardAndClose = () => {
  if (!closingTabId.value) return
  store.closeTab(closingTabId.value)
  isUnsavedWarningOpen.value = false
  closingTabId.value = null
}

const handleCancelClose = () => {
  isUnsavedWarningOpen.value = false
  closingTabId.value = null
}
</script>

<template>
  <!-- ... タブUI -->

  <UModal v-model="isUnsavedWarningOpen">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">未保存の変更があります</h3>
      </template>

      <p>このタブには保存されていない変更があります。変更を破棄しますか？</p>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="handleCancelClose">
            キャンセル
          </UButton>
          <UButton color="red" @click="handleDiscardAndClose">
            破棄
          </UButton>
          <UButton @click="handleSaveAndClose">
            保存
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

### 6. エクスポート連携

既存の `ExportDialog` コンポーネントを流用。

```vue
<!-- app/components/sql-editor/SqlEditorResultPanel.vue -->

<template>
  <div class="flex flex-col h-full">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between p-2 border-b">
      <div class="text-sm text-gray-600">
        実行時間: {{ executionTime }}秒 | {{ rowCount }}件
      </div>

      <!-- エクスポートボタン（新規） -->
      <UButton
        icon="i-heroicons-arrow-down-tray"
        variant="outline"
        size="sm"
        :disabled="!result"
        @click="openExportDialog"
      >
        エクスポート
      </UButton>
    </div>

    <!-- 結果テーブル（既存） -->
    <div class="flex-1 overflow-auto">
      <!-- ... 結果表示 -->
    </div>

    <!-- ExportDialog（既存コンポーネント） -->
    <ExportDialog
      v-model:open="isExportDialogOpen"
      :result="result"
    />
  </div>
</template>

<script setup lang="ts">
import ExportDialog from '~/components/query-builder/dialog/ExportDialog.vue'

const store = useSqlEditorStore()
const { result } = storeToRefs(store)

const isExportDialogOpen = ref(false)

const openExportDialog = () => {
  isExportDialogOpen.value = true
}
</script>
```

### 7. パネルのリサイズ対応

CSS Flexboxとマウスイベントでリサイズハンドルを実装。

```vue
<!-- app/components/sql-editor/SqlEditorLayout.vue -->

<template>
  <div class="flex flex-col h-full">
    <!-- ツールバー -->
    <SqlEditorToolbar />

    <!-- タブバー -->
    <EditorTabs />

    <div class="flex flex-1 overflow-hidden">
      <!-- サイドパネル -->
      <div class="w-64 border-r">
        <!-- ... -->
      </div>

      <!-- メインエリア -->
      <div class="flex flex-col flex-1">
        <!-- エディタパネル -->
        <div
          class="flex-shrink-0 overflow-hidden"
          :style="{ height: `${editorHeightPercent}%` }"
        >
          <SqlTextEditor />
        </div>

        <!-- リサイズハンドル -->
        <div
          class="h-1 bg-gray-200 dark:bg-gray-700 cursor-row-resize hover:bg-blue-500"
          @mousedown="startResize"
        />

        <!-- 結果パネル -->
        <div class="flex-1 overflow-hidden">
          <SqlEditorResultPanel />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const editorHeightPercent = ref(50) // デフォルト50%
const isResizing = ref(false)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const container = e.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const newPercent = ((e.clientY - rect.top) / rect.height) * 100

  // 20% ~ 80% の範囲に制限
  editorHeightPercent.value = Math.min(Math.max(newPercent, 20), 80)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)

  // サイズをローカルストレージに保存（オプション）
  localStorage.setItem('sql-editor-panel-height', String(editorHeightPercent.value))
}

onMounted(() => {
  // 保存されたサイズを復元
  const saved = localStorage.getItem('sql-editor-panel-height')
  if (saved) {
    editorHeightPercent.value = Number(saved)
  }
})
</script>
```

### 8. ダークモード対応

```vue
<!-- app/components/sql-editor/SqlTextEditor.vue -->

<script setup lang="ts">
import { useColorMode } from '#imports'

const colorMode = useColorMode()

const initMonaco = () => {
  editorInstance = monaco.editor.create(editorContainer.value, {
    // ... 既存の設定
    theme: colorMode.value === 'dark' ? 'vs-dark' : 'vs',
  })
}

// カラーモード変更時にテーマを更新
watch(() => colorMode.value, (newMode) => {
  if (editorInstance) {
    monaco.editor.setTheme(newMode === 'dark' ? 'vs-dark' : 'vs')
  }
})
</script>
```

## テストコード

### ユニットテスト例

#### SQLフォーマット機能

```typescript
// tests/stores/sql-editor.spec.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

describe('useSqlEditorStore - formatSql', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('SQLを正しくフォーマットする', () => {
    const store = useSqlEditorStore()
    store.sql = 'select id,name from users where age>20'

    store.formatSql()

    expect(store.sql).toContain('SELECT')
    expect(store.sql).toContain('FROM')
    expect(store.sql).toContain('WHERE')
    expect(store.sql).toMatch(/\n/) // 改行が含まれる
  })

  it('空のSQLはフォーマットしない', () => {
    const store = useSqlEditorStore()
    store.sql = ''

    store.formatSql()

    expect(store.sql).toBe('')
  })
})
```

#### タブ機能

```typescript
// tests/stores/sql-editor-tabs.spec.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

describe('useSqlEditorStore - タブ機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('新規タブを追加できる', () => {
    const store = useSqlEditorStore()

    store.addTab()

    expect(store.tabs).toHaveLength(1)
    expect(store.activeTabId).toBe(store.tabs[0].id)
  })

  it('タブを切り替えると状態が保存・復元される', () => {
    const store = useSqlEditorStore()

    store.addTab()
    const tab1Id = store.activeTabId!
    store.updateSql('SELECT * FROM users')

    store.addTab()
    const tab2Id = store.activeTabId!
    store.updateSql('SELECT * FROM orders')

    // タブ1に戻る
    store.switchTab(tab1Id)

    expect(store.sql).toBe('SELECT * FROM users')

    // タブ2に戻る
    store.switchTab(tab2Id)

    expect(store.sql).toBe('SELECT * FROM orders')
  })

  it('タブを閉じるとアクティブタブが移動する', () => {
    const store = useSqlEditorStore()

    store.addTab()
    const tab1Id = store.activeTabId!
    store.addTab()
    const tab2Id = store.activeTabId!

    store.closeTab(tab2Id)

    expect(store.tabs).toHaveLength(1)
    expect(store.activeTabId).toBe(tab1Id)
  })
})
```

#### エクスポート連携

```typescript
// tests/components/sql-editor/SqlEditorResultPanel.spec.ts

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SqlEditorResultPanel from '~/components/sql-editor/SqlEditorResultPanel.vue'

describe('SqlEditorResultPanel', () => {
  it('結果がある場合、エクスポートボタンが有効になる', () => {
    const wrapper = mount(SqlEditorResultPanel, {
      global: {
        stubs: {
          UButton: true,
          ExportDialog: true,
        },
      },
    })

    // 結果をセット
    const store = useSqlEditorStore()
    store.result = {
      columns: [{ name: 'id', type: 'integer' }],
      rows: [[1]],
      rowCount: 1,
    }

    const exportButton = wrapper.find('[data-testid="export-button"]')
    expect(exportButton.attributes('disabled')).toBeUndefined()
  })

  it('結果がない場合、エクスポートボタンが無効になる', () => {
    const wrapper = mount(SqlEditorResultPanel)

    const exportButton = wrapper.find('[data-testid="export-button"]')
    expect(exportButton.attributes('disabled')).toBeDefined()
  })
})
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| SQLフォーマットはフロントエンド側で処理 | Rustでの実装は工数が大きく、JavaScriptライブラリで十分 | Rust側で実装（将来的な性能改善として検討） |
| Monaco Editorの標準機能を最大限活用 | 既に実装されている機能を再発明しない | 独自の検索・置換UIを実装（工数増） |
| タブの状態管理はストアで一元管理 | 複数コンポーネントから状態を参照する必要があるため | コンポーネント内でuseStateを使用（状態の共有が困難） |
| エクスポート機能は既存のExportDialogを流用 | 既存コードの再利用、一貫性の確保 | SQL Editor専用のExportDialogを作成（工数増） |
| パネルリサイズはCSS FlexboxとJavaScriptで実装 | シンプルで依存パッケージ不要 | `vue-resizable` ライブラリを使用（依存追加） |
| `sql-formatter` ライブラリを採用 | メンテナンスが活発、PostgreSQL/MySQL/SQLite対応 | `prettier-plugin-sql` （prettier依存が重い） |

## 未解決事項

- [ ] タブの最大数制限（10タブまで、など）
- [ ] タブ状態の永続化（ローカルストレージ or Tauri側ファイル保存）
- [ ] SQLフォーマットの設定UI（キーワード大文字/小文字、インデント幅など）
- [ ] 検索・置換のカスタマイズ（正規表現の有効/無効デフォルト値など）
- [ ] エクスポート時のファイル名デフォルト値（クエリ名、実行日時など）

## 参考資料

### 内部ドキュメント

- [要件定義書](./requirements.md)
- [SQLエディタ WBS](../../local/20260117_エディタ機能/wbs.md)
- [技術仕様書](../../steering/03_architecture_specifications.md)

### 外部ドキュメント

- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [Monaco Editor Playground](https://microsoft.github.io/monaco-editor/playground.html)
- [sql-formatter GitHub](https://github.com/sql-formatter-org/sql-formatter)
- [sql-formatter Documentation](https://sql-formatter-org.github.io/sql-formatter/)
- [Nuxt UI Components](https://ui.nuxt.com/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
