<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { SavedQueryMetadata, TreeNode } from '~/types/sql-editor'
import SavedQueryTreeView from './SavedQueryTreeView.vue'
import CreateFolderDialog from './dialogs/CreateFolderDialog.vue'
import RenameFolderDialog from './dialogs/RenameFolderDialog.vue'
import MoveQueryDialog from './dialogs/MoveQueryDialog.vue'

const sqlEditorStore = useSqlEditorStore()
const {
  savedQueries,
  folders,
  isSavedQueriesLoading,
  savedQueryError,
  isDirty,
  currentQuery,
} = storeToRefs(sqlEditorStore)
const toast = useToast()

const searchKeyword = ref('')
const activeTag = ref<string | null>(null)

const pendingQuery = ref<SavedQueryMetadata | null>(null)
const confirmLoadOpen = ref(false)

const deleteDialogOpen = ref(false)
const queryToDelete = ref<SavedQueryMetadata | null>(null)

const createFolderDialogOpen = ref(false)
const renameFolderDialogOpen = ref(false)
const deleteFolderDialogOpen = ref(false)
const moveQueryDialogOpen = ref(false)
const folderDialogParentPath = ref<string | null>(null)
const folderToRename = ref<string | null>(null)
const folderToDelete = ref<string | null>(null)
const queryToMove = ref<SavedQueryMetadata | null>(null)

const contextMenu = ref<{
  type: 'folder' | 'query'
  node: TreeNode
  x: number
  y: number
} | null>(null)

onMounted(async () => {
  sqlEditorStore.loadExpandedFolders()
  await Promise.all([sqlEditorStore.fetchFolders(), sqlEditorStore.loadSavedQueries()])
})

const matchesQuery = (query: SavedQueryMetadata) => {
  if (activeTag.value && !query.tags.includes(activeTag.value)) {
    return false
  }

  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return true

  const nameMatch = query.name.toLowerCase().includes(keyword)
  const descMatch = (query.description || '').toLowerCase().includes(keyword)
  const tagMatch = query.tags.some((tag) => tag.toLowerCase().includes(keyword))

  if (nameMatch || descMatch || tagMatch) return true

  const sqlText = sqlEditorStore.savedQuerySqlCache[query.id]
  if (!sqlText) return false

  return sqlText.toLowerCase().includes(keyword)
}

const filterTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
  const filtered: TreeNode[] = []
  for (const node of nodes) {
    if (node.type === 'query') {
      if (node.query && matchesQuery(node.query)) {
        filtered.push(node)
      }
      continue
    }

    const children = filterTreeNodes(node.children || [])
    if (children.length === 0) continue

    const queryCount = children.filter((child) => child.type === 'query').length

    filtered.push({
      ...node,
      children,
      expanded: true,
      queryCount,
    })
  }
  return filtered
}

const filteredTree = computed(() => {
  const keyword = searchKeyword.value.trim()
  const hasFilter = !!keyword || !!activeTag.value
  if (!hasFilter) return sqlEditorStore.queryTree
  return filterTreeNodes(sqlEditorStore.queryTree)
})

const findQueryById = (id: string) =>
  savedQueries.value.find((query) => query.id === id) || null

const handleLoad = (id: string) => {
  const query = findQueryById(id)
  if (!query) return

  if (isDirty.value) {
    pendingQuery.value = query
    confirmLoadOpen.value = true
    return
  }

  void executeLoad(query)
}

const executeLoad = async (query: SavedQueryMetadata) => {
  try {
    await sqlEditorStore.loadSavedQuery(query.id)
    toast.add({
      title: `「${query.name}」を読み込みました`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの読み込みに失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleConfirmLoad = async () => {
  if (!pendingQuery.value) return
  await executeLoad(pendingQuery.value)
  pendingQuery.value = null
}

const handleExecute = async (id: string) => {
  const query = findQueryById(id)
  if (!query) return

  try {
    await sqlEditorStore.executeSavedQuery(query.id)
  } catch (error) {
    toast.add({
      title: 'クエリの実行に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleEdit = (id: string) => {
  sqlEditorStore.openSaveDialog(id)
}

const handleDelete = (id: string) => {
  const query = findQueryById(id)
  if (!query) return

  queryToDelete.value = query
  deleteDialogOpen.value = true
}

const executeDelete = async () => {
  if (!queryToDelete.value) return

  try {
    await sqlEditorStore.deleteSavedQuery(queryToDelete.value.id)
    toast.add({
      title: 'クエリを削除しました',
      color: 'success',
      icon: 'i-heroicons-trash',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの削除に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    queryToDelete.value = null
  }
}

const toggleTagFilter = (tag: string) => {
  activeTag.value = activeTag.value === tag ? null : tag
}

const clearFilters = () => {
  searchKeyword.value = ''
  activeTag.value = null
}

const handleMoveQuery = async (queryId: string, targetPath: string | null) => {
  const query = findQueryById(queryId)
  if (!query) return
  if (query.folderPath === targetPath) return

  try {
    await sqlEditorStore.moveSavedQuery(queryId, targetPath)
    toast.add({
      title: 'クエリを移動しました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの移動に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleToggleFolder = (path: string) => {
  sqlEditorStore.toggleFolderExpansion(path)
}

const handleCreateFolder = (parentPath: string | null) => {
  folderDialogParentPath.value = parentPath
  createFolderDialogOpen.value = true
}

const expandFolderPath = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : `/${part}`
    sqlEditorStore.expandedFolders.add(current)
  }
  sqlEditorStore.saveExpandedFolders()
}

const handleConfirmCreateFolder = async (name: string, parentPath: string | null) => {
  const trimmed = name.trim()
  if (!trimmed) return

  const folderPath = parentPath ? `${parentPath}/${trimmed}` : `/${trimmed}`
  if (folders.value.includes(folderPath)) {
    toast.add({
      title: 'フォルダ名が重複しています',
      description: `「${folderPath}」は既に存在します`,
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle',
    })
    return
  }

  try {
    await sqlEditorStore.createFolder(folderPath)

    expandFolderPath(folderPath)

    toast.add({
      title: 'フォルダを作成しました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'フォルダを作成できませんでした',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleRenameFolder = (path: string) => {
  folderToRename.value = path
  renameFolderDialogOpen.value = true
}

const handleConfirmRenameFolder = async (newName: string) => {
  if (!folderToRename.value) return
  const parts = folderToRename.value.split('/').filter(Boolean)
  const parent = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : null
  const newPath = parent ? `${parent}/${newName}` : `/${newName}`

  if (newPath === folderToRename.value) return

  if (folders.value.includes(newPath)) {
    toast.add({
      title: 'フォルダ名が重複しています',
      description: `「${newPath}」は既に存在します`,
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle',
    })
    return
  }

  try {
    await sqlEditorStore.renameFolder(folderToRename.value, newPath)
    toast.add({
      title: 'フォルダ名を変更しました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'フォルダ名の変更に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    folderToRename.value = null
  }
}

const handleDeleteFolder = (path: string) => {
  folderToDelete.value = path
  deleteFolderDialogOpen.value = true
}

const handleConfirmDeleteFolder = async () => {
  if (!folderToDelete.value) return

  const queriesInFolder = savedQueries.value.filter(
    (query) =>
      query.folderPath === folderToDelete.value ||
      query.folderPath?.startsWith(`${folderToDelete.value}/`)
  )

  if (queriesInFolder.length > 0) {
    toast.add({
      title: 'フォルダを削除できません',
      description: `フォルダ内に${queriesInFolder.length}件のクエリが含まれています`,
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle',
    })
    folderToDelete.value = null
    return
  }

  try {
    await sqlEditorStore.deleteFolder(folderToDelete.value)
    toast.add({
      title: 'フォルダを削除しました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'フォルダの削除に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    folderToDelete.value = null
  }
}

const handleOpenContextMenu = (payload: {
  type: 'folder' | 'query'
  node: TreeNode
  x: number
  y: number
}) => {
  contextMenu.value = payload
}

const closeContextMenu = () => {
  contextMenu.value = null
}

const collectFolderPaths = (node: TreeNode): string[] => {
  if (node.type !== 'folder') return []
  const paths = [node.path]
  for (const child of node.children || []) {
    if (child.type === 'folder') {
      paths.push(...collectFolderPaths(child))
    }
  }
  return paths
}

const expandAllFolders = (node: TreeNode) => {
  for (const path of collectFolderPaths(node)) {
    sqlEditorStore.expandedFolders.add(path)
  }
  sqlEditorStore.saveExpandedFolders()
}

const collapseAllFolders = (node: TreeNode) => {
  for (const path of collectFolderPaths(node)) {
    sqlEditorStore.expandedFolders.delete(path)
  }
  sqlEditorStore.saveExpandedFolders()
}

const handleOpenMoveDialog = (id: string) => {
  const query = findQueryById(id)
  if (!query) return
  queryToMove.value = query
  moveQueryDialogOpen.value = true
}

const handleConfirmMoveDialog = async (targetPath: string | null) => {
  if (!queryToMove.value) return
  await handleMoveQuery(queryToMove.value.id, targetPath)
  queryToMove.value = null
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900">
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
          title="新規フォルダ"
          @click="handleCreateFolder(null)"
        />
      </div>
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

    <div class="p-3 border-b border-gray-200 dark:border-gray-800" v-if="currentQuery">
      <p class="text-xs text-gray-500">読み込み中のクエリ</p>
      <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ currentQuery.name }}
      </p>
      <p v-if="currentQuery.description" class="text-xs text-gray-500 line-clamp-2 mt-1">
        {{ currentQuery.description }}
      </p>
      <div class="flex flex-wrap gap-1 mt-2">
        <UBadge
          v-for="tag in currentQuery.tags"
          :key="tag"
          size="xs"
          color="neutral"
          variant="soft"
        >
          {{ tag }}
        </UBadge>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <SavedQueryTreeView
        :tree="filteredTree"
        :current-query-id="currentQuery?.id"
        :is-loading="isSavedQueriesLoading"
        @load-query="handleLoad"
        @execute-query="handleExecute"
        @edit-query="handleEdit"
        @delete-query="handleDelete"
        @move-query="handleMoveQuery"
        @toggle-folder="handleToggleFolder"
        @open-context-menu="handleOpenContextMenu"
        @toggle-tag="toggleTagFilter"
      />
    </div>

    <Teleport to="body">
      <ConfirmDialog
        v-model:open="confirmLoadOpen"
        title="未保存の変更があります"
        description="現在の編集内容は失われます。続行しますか？"
        confirm-label="読み込み"
        confirm-color="warning"
        @confirm="handleConfirmLoad"
        @cancel="pendingQuery = null"
      />

      <ConfirmDialog
        v-model:open="deleteDialogOpen"
        :title="'保存クエリを削除しますか？'"
        :description="queryToDelete ? `「${queryToDelete.name}」は元に戻せません。` : undefined"
        confirm-label="削除"
        @confirm="executeDelete"
        @cancel="queryToDelete = null"
      />

      <ConfirmDialog
        v-model:open="deleteFolderDialogOpen"
        title="フォルダを削除しますか？"
        :description="folderToDelete ? `「${folderToDelete}」を削除します。` : undefined"
        confirm-label="削除"
        @confirm="handleConfirmDeleteFolder"
        @cancel="folderToDelete = null"
      />

      <CreateFolderDialog
        v-model:open="createFolderDialogOpen"
        :parent-path="folderDialogParentPath"
        @confirm="handleConfirmCreateFolder"
        @cancel="folderDialogParentPath = null"
      />

      <RenameFolderDialog
        v-model:open="renameFolderDialogOpen"
        :folder-path="folderToRename"
        @confirm="handleConfirmRenameFolder"
        @cancel="folderToRename = null"
      />

      <MoveQueryDialog
        v-model:open="moveQueryDialogOpen"
        :query-name="queryToMove?.name || null"
        :current-folder-path="queryToMove?.folderPath || null"
        :folders="folders"
        @confirm="handleConfirmMoveDialog"
        @cancel="queryToMove = null"
      />

      <div
        v-if="contextMenu"
        class="fixed inset-0 z-50"
        @click="closeContextMenu"
      >
        <div
          class="absolute w-52 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
          :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
          @click.stop
        >
          <template v-if="contextMenu.type === 'folder'">
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleCreateFolder(contextMenu.node.path); closeContextMenu()"
            >
              新規フォルダ
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleRenameFolder(contextMenu.node.path); closeContextMenu()"
            >
              名前変更
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleDeleteFolder(contextMenu.node.path); closeContextMenu()"
            >
              削除
            </button>
            <div class="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="expandAllFolders(contextMenu.node); closeContextMenu()"
            >
              すべて展開
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="collapseAllFolders(contextMenu.node); closeContextMenu()"
            >
              すべて折りたたみ
            </button>
          </template>
          <template v-else>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleLoad(contextMenu.node.path); closeContextMenu()"
            >
              読み込み
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleExecute(contextMenu.node.path); closeContextMenu()"
            >
              実行
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleEdit(contextMenu.node.path); closeContextMenu()"
            >
              編集
            </button>
            <button
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleOpenMoveDialog(contextMenu.node.path); closeContextMenu()"
            >
              移動
            </button>
            <button
              v-if="contextMenu.node.query?.folderPath"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleMoveQuery(contextMenu.node.path, null); closeContextMenu()"
            >
              ルートに移動
            </button>
            <div class="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleDelete(contextMenu.node.path); closeContextMenu()"
            >
              削除
            </button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
