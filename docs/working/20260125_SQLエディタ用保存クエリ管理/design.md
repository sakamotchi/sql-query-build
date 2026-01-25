# 設計書：SQLエディタ用保存クエリのフォルダ管理機能

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 設計中
**親要件**: [requirements.md](./requirements.md)

---

## 1. アーキテクチャ

### 1.1 システム構成

```
┌─────────────────────────────────────┐
│   SQLエディタ画面                    │
│   (app/pages/sql-editor.vue)        │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   SqlEditorLayout.vue               │
│   ├── SqlEditorToolbar.vue          │
│   ├── SqlEditorSavedPanel.vue ◄──── 改修対象
│   │   └── SavedQueryTreeView.vue    │
│   ├── SqlEditorHistoryPanel.vue     │
│   └── SqlEditorResultPanel.vue      │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   useSqlEditorStore                 │
│   (app/stores/sql-editor.ts)        │ ◄──── 拡張対象
│   - savedQueries[]                  │
│   - folders[]                       │
│   - expandedFolders: Set<string>    │
│   - queryTree Getter                │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   queryStorageApi                   │
│   (app/api/query-storage.ts)        │ ◄──── 既存（共通）
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Tauri Commands                    │
│   (Rust Backend)                    │ ◄──── 既存（共通）
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   JSON File Storage                 │
└─────────────────────────────────────┘
```

### 1.2 影響範囲

**変更対象**:
- `app/stores/sql-editor.ts` - フォルダ管理機能の追加
- `app/types/sql-editor.ts` - 型定義の拡張
- `app/components/sql-editor/SqlEditorSavedPanel.vue` - ツリービューへの改修

**新規作成**:
- `app/components/sql-editor/SavedQueryTreeView.vue` - ツリービュー本体
- `app/components/sql-editor/TreeNodeItem.vue` - ツリーノード（フォルダ/クエリ共通）
- `app/components/sql-editor/dialogs/CreateFolderDialog.vue` - フォルダ作成ダイアログ
- `app/components/sql-editor/dialogs/RenameFolderDialog.vue` - フォルダ名変更ダイアログ
- `app/components/sql-editor/dialogs/MoveQueryDialog.vue` - クエリ移動ダイアログ

**影響なし**:
- バックエンド（既に実装済み）
- `queryStorageApi`（既に実装済み）
- クエリビルダーの実装

---

## 2. データモデル設計

### 2.1 型定義

#### 2.1.1 SavedQueryMetadata（拡張）

**ファイル**: `app/types/sql-editor.ts`

```typescript
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null  // 新規追加
  connectionId: string
  createdAt: string
  updatedAt: string
}
```

#### 2.1.2 TreeNode（新規）

**ファイル**: `app/types/sql-editor.ts` または `app/types/query-tree.ts`

```typescript
/**
 * ツリービューのノードを表す型
 */
export interface TreeNode {
  /**
   * ノードのタイプ
   */
  type: 'folder' | 'query'

  /**
   * ノードのパス
   * - フォルダの場合: folderPath（例: "/開発環境/ユーザー管理"）
   * - クエリの場合: id
   */
  path: string

  /**
   * ノードの表示名
   */
  name: string

  /**
   * 子ノード（フォルダの場合のみ）
   * ソート済み（フォルダ優先、アルファベット順）
   */
  children?: TreeNode[]

  /**
   * クエリメタデータ（クエリの場合のみ）
   */
  query?: SavedQueryMetadata

  /**
   * 展開状態（フォルダの場合のみ）
   */
  expanded?: boolean

  /**
   * フォルダ内のクエリ数（フォルダの場合のみ、直接の子のみカウント）
   */
  queryCount?: number
}
```

### 2.2 ストア状態

**ファイル**: `app/stores/sql-editor.ts`

```typescript
interface SqlEditorState {
  // 既存フィールド
  connectionId: string | null
  sql: string
  results: QueryResult[]
  isExecuting: boolean
  executionHistory: ExecutionHistoryItem[]
  currentQuery: SavedQueryMetadata | null
  isDirty: boolean
  // ... 他の既存フィールド

  // 保存クエリ関連（既存）
  savedQueries: SavedQueryMetadata[]
  isSavedQueriesLoading: boolean
  savedQueryError: string | null
  savedQuerySqlCache: Record<string, string>

  // 新規追加：フォルダ管理
  /**
   * 全フォルダパスのリスト
   * 例: ['/開発環境', '/開発環境/ユーザー管理', '/本番環境']
   */
  folders: string[]

  /**
   * 展開中のフォルダパスのSet
   * LocalStorageと同期される
   */
  expandedFolders: Set<string>
}
```

---

## 3. ストア設計（useSqlEditorStore）

### 3.1 新規Getter

#### queryTree

```typescript
/**
 * フラットなクエリ一覧から階層ツリー構造を生成
 */
queryTree(state): TreeNode[] {
  const root: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  // 1. フォルダツリーを構築
  for (const folderPath of state.folders) {
    const parts = folderPath.split('/').filter(Boolean)
    let currentPath = ''
    let parent = root

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

      if (!folderMap.has(currentPath)) {
        const folderNode: TreeNode = {
          type: 'folder',
          path: currentPath,
          name: part,
          children: [],
          expanded: state.expandedFolders.has(currentPath),
          queryCount: 0,
        }
        folderMap.set(currentPath, folderNode)
        parent.push(folderNode)
        parent = folderNode.children!
      } else {
        parent = folderMap.get(currentPath)!.children!
      }
    }
  }

  // 2. クエリを配置
  for (const query of state.savedQueries) {
    const queryNode: TreeNode = {
      type: 'query',
      path: query.id,
      name: query.name,
      query,
    }

    if (query.folderPath) {
      const folder = folderMap.get(query.folderPath)
      if (folder) {
        folder.children!.push(queryNode)
        folder.queryCount = (folder.queryCount || 0) + 1
      } else {
        // フォルダが見つからない場合はルートに配置
        root.push(queryNode)
      }
    } else {
      // folderPath: null の場合はルート直下
      root.push(queryNode)
    }
  }

  // 3. ソート（フォルダ優先、アルファベット順）
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((node) => {
      if (node.children) {
        sortNodes(node.children)
      }
    })
  }
  sortNodes(root)

  return root
}
```

#### getFolderByPath

```typescript
/**
 * 指定パスのフォルダノードを取得
 */
getFolderByPath(state): (path: string) => TreeNode | null {
  return (path: string) => {
    const tree = this.queryTree
    const findFolder = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.path === path) {
          return node
        }
        if (node.children) {
          const found = findFolder(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findFolder(tree)
  }
}
```

### 3.2 新規アクション

#### fetchFolders

```typescript
/**
 * フォルダ一覧を取得して状態を更新
 */
async fetchFolders() {
  try {
    this.folders = await queryStorageApi.listFolders()
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('[SqlEditor] Failed to fetch folders:', e)
    this.savedQueryError = error
  }
}
```

#### moveSavedQuery

```typescript
/**
 * クエリを指定フォルダに移動
 * @param queryId - 移動するクエリのID
 * @param targetFolderPath - 移動先フォルダパス（nullの場合はルート直下）
 */
async moveSavedQuery(queryId: string, targetFolderPath: string | null) {
  this.isSavedQueriesLoading = true
  this.savedQueryError = null

  try {
    await queryStorageApi.moveQuery(queryId, targetFolderPath)

    // クエリ一覧を再取得して状態を更新
    await this.loadSavedQueries()

    // 成功通知（Toast）
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'クエリを移動しました',
          color: 'success',
          icon: 'i-heroicons-check-circle',
        })
      } catch {
        console.log('[SqlEditor] Query moved successfully')
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.savedQueryError = error
    console.error('[SqlEditor] Failed to move query:', e)

    // エラー通知
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'クエリの移動に失敗しました',
          description: error,
          color: 'error',
          icon: 'i-heroicons-exclamation-circle',
        })
      } catch {
        console.error('[SqlEditor] Failed to move query:', error)
      }
    }
  } finally {
    this.isSavedQueriesLoading = false
  }
}
```

#### renameFolder

```typescript
/**
 * フォルダ名を変更
 * @param oldPath - 変更前のフォルダパス
 * @param newPath - 変更後のフォルダパス
 */
async renameFolder(oldPath: string, newPath: string) {
  // バリデーション: フォルダ名の重複チェック
  if (this.folders.includes(newPath)) {
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダ名が重複しています',
          description: `「${newPath}」は既に存在します`,
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle',
        })
      } catch {
        console.warn('[SqlEditor] Duplicate folder path:', newPath)
      }
    }
    return
  }

  this.isSavedQueriesLoading = true
  this.savedQueryError = null

  try {
    await queryStorageApi.renameFolder(oldPath, newPath)

    // フォルダ一覧とクエリ一覧を再取得
    await Promise.all([this.fetchFolders(), this.loadSavedQueries()])

    // 展開状態を更新（旧パスを新パスに置換）
    if (this.expandedFolders.has(oldPath)) {
      this.expandedFolders.delete(oldPath)
      this.expandedFolders.add(newPath)
      this.saveExpandedFolders()
    }

    // 成功通知
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダ名を変更しました',
          color: 'success',
          icon: 'i-heroicons-check-circle',
        })
      } catch {
        console.log('[SqlEditor] Folder renamed successfully')
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.savedQueryError = error
    console.error('[SqlEditor] Failed to rename folder:', e)

    // エラー通知
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダ名の変更に失敗しました',
          description: error,
          color: 'error',
          icon: 'i-heroicons-exclamation-circle',
        })
      } catch {
        console.error('[SqlEditor] Failed to rename folder:', error)
      }
    }
  } finally {
    this.isSavedQueriesLoading = false
  }
}
```

#### deleteFolder

```typescript
/**
 * 空のフォルダを削除
 * @param folderPath - 削除するフォルダパス
 */
async deleteFolder(folderPath: string) {
  // バリデーション: 空フォルダチェック
  const queriesInFolder = this.savedQueries.filter(
    (q) => q.folderPath === folderPath || q.folderPath?.startsWith(`${folderPath}/`)
  )

  if (queriesInFolder.length > 0) {
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダを削除できません',
          description: `フォルダ内に${queriesInFolder.length}件のクエリが含まれています`,
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle',
        })
      } catch {
        console.warn('[SqlEditor] Cannot delete non-empty folder:', folderPath)
      }
    }
    return
  }

  this.isSavedQueriesLoading = true
  this.savedQueryError = null

  try {
    await queryStorageApi.deleteFolder(folderPath)

    // フォルダ一覧を再取得
    await this.fetchFolders()

    // 展開状態から削除
    this.expandedFolders.delete(folderPath)
    this.saveExpandedFolders()

    // 成功通知
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダを削除しました',
          color: 'success',
          icon: 'i-heroicons-check-circle',
        })
      } catch {
        console.log('[SqlEditor] Folder deleted successfully')
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.savedQueryError = error
    console.error('[SqlEditor] Failed to delete folder:', e)

    // エラー通知
    if (typeof window !== 'undefined') {
      try {
        const { useToast } = await import('#imports')
        const toast = useToast()
        toast.add({
          title: 'フォルダの削除に失敗しました',
          description: error,
          color: 'error',
          icon: 'i-heroicons-exclamation-circle',
        })
      } catch {
        console.error('[SqlEditor] Failed to delete folder:', error)
      }
    }
  } finally {
    this.isSavedQueriesLoading = false
  }
}
```

#### toggleFolderExpansion

```typescript
/**
 * フォルダの展開/折りたたみを切り替え
 * @param folderPath - 対象フォルダパス
 */
toggleFolderExpansion(folderPath: string) {
  if (this.expandedFolders.has(folderPath)) {
    this.expandedFolders.delete(folderPath)
  } else {
    this.expandedFolders.add(folderPath)
  }

  // LocalStorageに保存
  this.saveExpandedFolders()
}
```

#### saveExpandedFolders

```typescript
/**
 * 展開状態をLocalStorageに保存
 */
saveExpandedFolders() {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    const expanded = Array.from(this.expandedFolders)
    localStorage.setItem('sqlEditorExpandedFolders', JSON.stringify(expanded))
  } catch (e) {
    console.error('[SqlEditor] Failed to save expanded folders:', e)
  }
}
```

#### loadExpandedFolders

```typescript
/**
 * 展開状態をLocalStorageから復元
 */
loadExpandedFolders() {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    const saved = localStorage.getItem('sqlEditorExpandedFolders')
    if (saved) {
      const expanded = JSON.parse(saved) as string[]
      this.expandedFolders = new Set(expanded)
    }
  } catch (e) {
    console.error('[SqlEditor] Failed to load expanded folders:', e)
    this.expandedFolders = new Set()
  }
}
```

#### handleQueryDrop

```typescript
/**
 * ドラッグ&ドロップによるクエリ移動
 * @param queryId - 移動するクエリのID
 * @param targetFolderPath - ドロップ先フォルダパス
 */
async handleQueryDrop(queryId: string, targetFolderPath: string | null) {
  // バリデーション: クエリが存在するか
  const query = this.savedQueries.find((q) => q.id === queryId)
  if (!query) {
    console.error('[SqlEditor] Query not found:', queryId)
    return
  }

  // 同じフォルダにドロップした場合は何もしない
  if (query.folderPath === targetFolderPath) {
    return
  }

  // フォルダが存在するか確認
  if (targetFolderPath && !this.folders.includes(targetFolderPath)) {
    console.warn('[SqlEditor] Target folder not found:', targetFolderPath)
    return
  }

  // moveQuery アクションを呼び出し
  await this.moveSavedQuery(queryId, targetFolderPath)
}
```

---

## 4. UIコンポーネント設計

### 4.1 SqlEditorSavedPanel.vue（改修）

**現状**:
```vue
<template>
  <div class="h-full flex flex-col">
    <!-- 検索バー -->
    <div class="p-3">
      <UInput v-model="searchKeyword" placeholder="クエリを検索..." />
    </div>

    <!-- フラットリスト -->
    <div class="flex-1 overflow-auto p-3">
      <div v-for="query in filteredQueries" :key="query.id">
        <!-- クエリカード -->
      </div>
    </div>
  </div>
</template>
```

**改修後**:
```vue
<template>
  <div class="h-full flex flex-col">
    <!-- ツールバー -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
      <div class="flex items-center gap-2">
        <UInput
          v-model="searchKeyword"
          icon="i-heroicons-magnifying-glass"
          placeholder="クエリを検索..."
          clearable
          class="flex-1"
        />
        <UButton
          icon="i-heroicons-folder-plus"
          size="sm"
          variant="ghost"
          color="neutral"
          @click="handleCreateFolder(null)"
          title="新規フォルダ"
        />
      </div>

      <!-- タグフィルタ表示 -->
      <div v-if="activeTag" class="flex items-center gap-2 text-xs text-gray-500">
        <span>タグフィルタ:</span>
        <UBadge color="primary" variant="soft" class="cursor-pointer" @click="toggleTagFilter(activeTag)">
          #{{ activeTag }}
        </UBadge>
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="clearFilters"
        />
      </div>
    </div>

    <!-- 読み込み中のクエリ表示 -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800" v-if="currentQuery">
      <p class="text-xs text-gray-500">読み込み中のクエリ</p>
      <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ currentQuery.name }}
      </p>
    </div>

    <!-- ツリービュー -->
    <div class="flex-1 overflow-auto">
      <SavedQueryTreeView
        :tree="sqlEditorStore.queryTree"
        :current-query-id="currentQuery?.id"
        :is-loading="isSavedQueriesLoading"
        @load-query="handleLoad"
        @execute-query="handleExecute"
        @edit-query="handleEdit"
        @delete-query="handleDelete"
        @move-query="handleMoveQuery"
        @toggle-folder="handleToggleFolder"
        @create-folder="handleCreateFolder"
        @rename-folder="handleRenameFolder"
        @delete-folder="handleDeleteFolder"
      />
    </div>

    <!-- ダイアログ群 -->
    <Teleport to="body">
      <CreateFolderDialog
        v-model:open="createFolderDialogOpen"
        :parent-path="folderDialogParentPath"
        @confirm="handleConfirmCreateFolder"
      />

      <RenameFolderDialog
        v-model:open="renameFolderDialogOpen"
        :folder-path="folderToRename"
        @confirm="handleConfirmRenameFolder"
      />

      <ConfirmDialog
        v-model:open="deleteFolderDialogOpen"
        title="フォルダを削除しますか？"
        :description="`「${folderToDelete}」を削除します。`"
        confirm-label="削除"
        @confirm="handleConfirmDeleteFolder"
      />

      <!-- 既存のダイアログ -->
      <ConfirmDialog v-model:open="confirmLoadOpen" ... />
      <ConfirmDialog v-model:open="deleteDialogOpen" ... />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import SavedQueryTreeView from './SavedQueryTreeView.vue'
import CreateFolderDialog from './dialogs/CreateFolderDialog.vue'
import RenameFolderDialog from './dialogs/RenameFolderDialog.vue'

const sqlEditorStore = useSqlEditorStore()
const {
  savedQueries,
  isSavedQueriesLoading,
  currentQuery,
  // ...
} = storeToRefs(sqlEditorStore)

// 初期化
onMounted(async () => {
  sqlEditorStore.loadExpandedFolders()
  await Promise.all([
    sqlEditorStore.fetchFolders(),
    sqlEditorStore.loadSavedQueries(),
  ])
})

// フォルダ操作のダイアログ状態
const createFolderDialogOpen = ref(false)
const renameFolderDialogOpen = ref(false)
const deleteFolderDialogOpen = ref(false)
const folderDialogParentPath = ref<string | null>(null)
const folderToRename = ref<string | null>(null)
const folderToDelete = ref<string | null>(null)

const handleCreateFolder = (parentPath: string | null) => {
  folderDialogParentPath.value = parentPath
  createFolderDialogOpen.value = true
}

const handleConfirmCreateFolder = async (folderName: string, parentPath: string | null) => {
  const folderPath = parentPath ? `${parentPath}/${folderName}` : `/${folderName}`
  // TODO: createFolder アクションを実装
  await sqlEditorStore.fetchFolders()
}

// ... 他のハンドラ
</script>
```

### 4.2 SavedQueryTreeView.vue（新規）

```vue
<template>
  <div class="tree-view">
    <div v-if="isLoading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <div v-else-if="tree.length === 0" class="text-center py-8 text-gray-500">
      保存されたクエリがありません
    </div>

    <div v-else class="p-2">
      <TreeNodeItem
        v-for="node in tree"
        :key="node.path"
        :node="node"
        :level="0"
        :current-query-id="currentQueryId"
        @load-query="$emit('load-query', $event)"
        @execute-query="$emit('execute-query', $event)"
        @edit-query="$emit('edit-query', $event)"
        @delete-query="$emit('delete-query', $event)"
        @move-query="$emit('move-query', $event.queryId, $event.targetPath)"
        @toggle-folder="$emit('toggle-folder', $event)"
        @create-folder="$emit('create-folder', $event)"
        @rename-folder="$emit('rename-folder', $event)"
        @delete-folder="$emit('delete-folder', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '~/types/sql-editor'
import TreeNodeItem from './TreeNodeItem.vue'

defineProps<{
  tree: TreeNode[]
  currentQueryId?: string | null
  isLoading?: boolean
}>()

defineEmits<{
  (e: 'load-query', id: string): void
  (e: 'execute-query', id: string): void
  (e: 'edit-query', id: string): void
  (e: 'delete-query', id: string): void
  (e: 'move-query', queryId: string, targetPath: string | null): void
  (e: 'toggle-folder', path: string): void
  (e: 'create-folder', parentPath: string | null): void
  (e: 'rename-folder', path: string): void
  (e: 'delete-folder', path: string): void
}>()
</script>
```

### 4.3 TreeNodeItem.vue（新規）

```vue
<template>
  <div class="tree-node-item">
    <!-- フォルダノード -->
    <div
      v-if="node.type === 'folder'"
      class="folder-node"
      :style="{ paddingLeft: `${level * 12}px` }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      :class="{ 'drop-target': isDropTarget }"
    >
      <div class="folder-header" @contextmenu.prevent="showFolderContextMenu">
        <button
          type="button"
          class="flex items-center gap-2 flex-1 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="$emit('toggle-folder', node.path)"
        >
          <UIcon
            :name="node.expanded ? 'i-heroicons-folder-open' : 'i-heroicons-folder'"
            class="w-4 h-4 text-gray-500"
          />
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ node.name }}
          </span>
          <UBadge v-if="node.queryCount" size="xs" color="neutral" variant="soft">
            {{ node.queryCount }}
          </UBadge>
        </button>
      </div>

      <!-- 子ノード -->
      <div v-if="node.expanded && node.children" class="folder-children">
        <TreeNodeItem
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :level="level + 1"
          :current-query-id="currentQueryId"
          v-bind="$attrs"
        />
      </div>
    </div>

    <!-- クエリノード -->
    <div
      v-else
      class="query-node"
      :style="{ paddingLeft: `${level * 12}px` }"
      draggable="true"
      @dragstart="handleDragStart"
      @contextmenu.prevent="showQueryContextMenu"
    >
      <div
        class="query-card group rounded-lg border border-gray-200 dark:border-gray-800 p-2 hover:border-primary-300 transition"
        :class="{
          'border-primary-400 bg-primary-50/40 dark:bg-primary-500/10':
            currentQueryId === node.path,
        }"
      >
        <button
          type="button"
          class="flex items-start gap-2 flex-1 text-left w-full"
          @click="$emit('load-query', node.path)"
        >
          <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-gray-400 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {{ node.name }}
            </p>
            <p
              v-if="node.query?.description"
              class="text-xs text-gray-500 line-clamp-1 mt-0.5"
            >
              {{ node.query.description }}
            </p>
            <div v-if="node.query?.tags.length" class="flex flex-wrap gap-1 mt-1">
              <UBadge
                v-for="tag in node.query.tags"
                :key="tag"
                size="xs"
                color="neutral"
                variant="soft"
              >
                {{ tag }}
              </UBadge>
            </div>
          </div>
        </button>

        <!-- アクションボタン -->
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <UButton
            icon="i-heroicons-play"
            size="xs"
            variant="ghost"
            color="primary"
            @click.stop="$emit('execute-query', node.path)"
          />
          <UButton
            icon="i-heroicons-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click.stop="$emit('edit-query', node.path)"
          />
          <UButton
            icon="i-heroicons-trash"
            size="xs"
            variant="ghost"
            color="error"
            @click.stop="$emit('delete-query', node.path)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TreeNode } from '~/types/sql-editor'

const props = defineProps<{
  node: TreeNode
  level: number
  currentQueryId?: string | null
}>()

const emit = defineEmits<{
  (e: 'load-query', id: string): void
  (e: 'execute-query', id: string): void
  (e: 'edit-query', id: string): void
  (e: 'delete-query', id: string): void
  (e: 'move-query', event: { queryId: string; targetPath: string | null }): void
  (e: 'toggle-folder', path: string): void
  (e: 'create-folder', parentPath: string | null): void
  (e: 'rename-folder', path: string): void
  (e: 'delete-folder', path: string): void
}>()

// ドラッグ&ドロップ
const isDropTarget = ref(false)

const handleDragStart = (event: DragEvent) => {
  if (props.node.type !== 'query') return
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('application/json', JSON.stringify({ queryId: props.node.path }))
}

const handleDragOver = (event: DragEvent) => {
  if (props.node.type !== 'folder') return
  event.preventDefault()
  isDropTarget.value = true
}

const handleDragLeave = () => {
  isDropTarget.value = false
}

const handleDrop = (event: DragEvent) => {
  if (props.node.type !== 'folder') return
  event.preventDefault()
  isDropTarget.value = false

  try {
    const data = JSON.parse(event.dataTransfer!.getData('application/json'))
    emit('move-query', { queryId: data.queryId, targetPath: props.node.path })
  } catch (e) {
    console.error('Failed to parse drop data:', e)
  }
}

// コンテキストメニュー（簡易実装、詳細は後で実装）
const showFolderContextMenu = (event: MouseEvent) => {
  // TODO: コンテキストメニューを表示
  console.log('Folder context menu:', props.node.path)
}

const showQueryContextMenu = (event: MouseEvent) => {
  // TODO: コンテキストメニューを表示
  console.log('Query context menu:', props.node.path)
}
</script>

<style scoped>
.drop-target {
  @apply bg-primary-50 dark:bg-primary-900/20;
}
</style>
```

---

## 5. テストコード

### 5.1 ストアのテスト

**ファイル**: `tests/stores/sql-editor.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '@/stores/sql-editor'
import type { SavedQueryMetadata } from '~/types/sql-editor'

// モック
vi.mock('@/api/query-storage', () => ({
  queryStorageApi: {
    listFolders: vi.fn(),
    moveQuery: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    searchSavedQueries: vi.fn(),
  },
}))

describe('useSqlEditorStore - フォルダ管理機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('queryTree Getter', () => {
    it('フォルダとクエリを正しくツリー構造に変換する', () => {
      const store = useSqlEditorStore()

      // テストデータ
      store.folders = ['/開発環境', '/開発環境/ユーザー管理', '/本番環境']
      store.savedQueries = [
        {
          id: 'q1',
          name: 'Query 1',
          folderPath: '/開発環境/ユーザー管理',
          tags: [],
          description: '',
          connectionId: 'conn1',
          createdAt: '2026-01-25',
          updatedAt: '2026-01-25',
        } as SavedQueryMetadata,
        {
          id: 'q2',
          name: 'Query 2',
          folderPath: null,
          tags: [],
          description: '',
          connectionId: 'conn1',
          createdAt: '2026-01-25',
          updatedAt: '2026-01-25',
        } as SavedQueryMetadata,
      ]

      const tree = store.queryTree

      // 検証
      expect(tree.length).toBe(3) // 2フォルダ + 1クエリ
      expect(tree[0].type).toBe('folder')
      expect(tree[0].name).toBe('開発環境')
    })
  })

  // ... その他のテスト
})
```

---

## 6. 実装チェックリスト

### Phase 1: 型定義とストア拡張
- [ ] `SavedQueryMetadata` に `folderPath` を追加
- [ ] `TreeNode` 型を定義
- [ ] `useSqlEditorStore` の状態に `folders`, `expandedFolders` を追加

### Phase 2: ストアアクション実装
- [ ] `fetchFolders` 実装
- [ ] `queryTree` Getter 実装
- [ ] `getFolderByPath` Getter 実装
- [ ] `moveSavedQuery` 実装
- [ ] `renameFolder` 実装
- [ ] `deleteFolder` 実装
- [ ] `toggleFolderExpansion` 実装
- [ ] `saveExpandedFolders` 実装
- [ ] `loadExpandedFolders` 実装
- [ ] `handleQueryDrop` 実装

### Phase 3: UIコンポーネント実装
- [ ] `SavedQueryTreeView.vue` 作成
- [ ] `TreeNodeItem.vue` 作成
- [ ] `SqlEditorSavedPanel.vue` を改修
- [ ] ドラッグ&ドロップ実装

### Phase 4: ダイアログ実装
- [ ] `CreateFolderDialog.vue` 作成
- [ ] `RenameFolderDialog.vue` 作成
- [ ] `MoveQueryDialog.vue` 作成（オプション）

### Phase 5: テストと調整
- [ ] ユニットテスト追加
- [ ] 既存機能の回帰テスト
- [ ] パフォーマンステスト

---

## 付録A: クエリビルダーとの比較

| 項目 | クエリビルダー | SQLエディタ |
|------|--------------|------------|
| ストア | `useSavedQueryStore` | `useSqlEditorStore` |
| 型定義 | `@/types/saved-query` | `~/types/sql-editor` |
| UIコンポーネント | `SavedQuerySlideover.vue` | `SqlEditorSavedPanel.vue` |
| LocalStorageキー | `savedQueryExpandedFolders` | `sqlEditorExpandedFolders` |
| バックエンドAPI | `queryStorageApi.*` | `queryStorageApi.*`（共通） |

---

## 付録B: 段階的実装戦略

1. **Phase 1**: ストアのみ実装（UI変更なし）
2. **Phase 2**: ツリービュー表示のみ（操作は既存のまま）
3. **Phase 3**: フォルダ操作を追加
4. **Phase 4**: ドラッグ&ドロップを追加
5. **Phase 5**: 最適化とテスト

この段階的アプローチにより、各段階で動作確認しながら安全に実装できます。
