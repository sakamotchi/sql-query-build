<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useWindowStore } from '@/stores/window'
import SchemaNode from './tree/SchemaNode.vue'
import type { Table, Column } from '@/types/database-structure'

const props = defineProps<{
  /** 検索クエリ */
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'select-table', table: Table): void
  (e: 'select-column', column: Column, table: Table): void
  (e: 'drag-start-table', table: Table): void
  (e: 'drag-start-column', column: Column, table: Table): void
}>()

const databaseStructureStore = useDatabaseStructureStore()
const windowStore = useWindowStore()
const { t } = useI18n()

// 状態
const isLoading = ref(false)
const error = ref<string | null>(null)
const expandedNodes = ref<Set<string>>(new Set())
const selectedNode = ref<string | null>(null)

// 接続ID
const connectionId = computed(() => windowStore.currentConnectionId)

// データベース構造
const databaseStructure = computed(() => {
  if (!connectionId.value) return null
  return databaseStructureStore.getStructure(connectionId.value)
})

// フィルタリングされたスキーマ
const filteredSchemas = computed(() => {
  if (!databaseStructure.value) return []

  const schemas = databaseStructure.value.schemas

  // システムスキーマを非表示にするオプション
  const hideSystemSchemas = true // TODO: 設定から取得

  let filtered = hideSystemSchemas
    ? schemas.filter((s) => !s.isSystem)
    : schemas

  // 検索フィルタリング
  if (props.searchQuery) {
    const query = props.searchQuery.toLowerCase()
    filtered = filtered
      .map((schema) => ({
        ...schema,
        tables: schema.tables.filter(
          (table) =>
            table.name.toLowerCase().includes(query) ||
            table.columns.some((col) =>
              col.name.toLowerCase().includes(query)
            )
        ),
        views: schema.views.filter(
          (view) =>
            view.name.toLowerCase().includes(query) ||
            view.columns.some((col) =>
              col.name.toLowerCase().includes(query)
            )
        ),
      }))
      .filter((schema) => schema.tables.length > 0 || schema.views.length > 0)
  }

  return filtered
})

/**
 * データベース構造を読み込み
 */
const loadStructure = async () => {
  if (!connectionId.value) return

  isLoading.value = true
  error.value = null

  try {
    await databaseStructureStore.fetchDatabaseStructure(connectionId.value)
  } catch (e) {
    console.error('[DatabaseTree] Failed to load structure:', e)
    if (e instanceof Error) {
      error.value = e.message
    } else if (typeof e === 'string') {
      error.value = e
    } else {
      error.value = JSON.stringify(e) || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * 構造を再読み込み
 */
const refreshStructure = async () => {
  if (!connectionId.value) return

  isLoading.value = true
  error.value = null

  try {
    await databaseStructureStore.refreshDatabaseStructure(connectionId.value)
  } catch (e) {
    console.error('[DatabaseTree] Failed to refresh structure:', e)
    if (e instanceof Error) {
      error.value = e.message
    } else if (typeof e === 'string') {
      error.value = e
    } else {
      error.value = JSON.stringify(e) || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * ノードの展開/折りたたみ
 */
const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

/**
 * ノード選択
 */
const selectNode = (nodeId: string) => {
  selectedNode.value = nodeId
}

/**
 * テーブル選択
 */
const handleTableSelect = (table: Table) => {
  emit('select-table', table)
}

/**
 * カラム選択
 */
const handleColumnSelect = (column: Column, table: Table) => {
  emit('select-column', column, table)
}

/**
 * テーブルドラッグ開始
 */
const handleTableDragStart = (table: Table) => {
  emit('drag-start-table', table)
}

/**
 * カラムドラッグ開始
 */
const handleColumnDragStart = (column: Column, table: Table) => {
  emit('drag-start-column', column, table)
}

// 接続IDが変更されたら構造を読み込み
watch(connectionId, () => {
  loadStructure()
})

onMounted(() => {
  if (connectionId.value && !databaseStructure.value) {
    loadStructure()
  }
})

defineExpose({
  refresh: refreshStructure,
})
</script>

<template>
  <div class="database-tree h-full overflow-auto">
    <!-- ローディング -->
    <div v-if="isLoading" class="tree-loading flex flex-col items-center justify-center p-6 h-full text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mb-2" />
      <span class="text-sm">{{ t('queryBuilder.databaseTree.loading') }}</span>
    </div>

    <!-- エラー -->
    <div v-else-if="error" class="tree-error flex flex-col items-center justify-center p-6 h-full text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-8 h-8 text-red-500 mb-2" />
      <p class="text-sm text-red-500 mb-2">{{ error }}</p>
      <UButton
        size="xs"
        color="primary"
        variant="ghost"
        @click="refreshStructure"
      >
        {{ t('queryBuilder.databaseTree.retry') }}
      </UButton>
    </div>

    <!-- 空状態 -->
    <div v-else-if="!databaseStructure" class="tree-empty flex flex-col items-center justify-center p-6 h-full text-center">
      <UIcon name="i-heroicons-circle-stack" class="w-8 h-8 text-gray-400 mb-2" />
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('queryBuilder.databaseTree.connect') }}</p>
    </div>

    <!-- 検索結果なし -->
    <div
      v-else-if="searchQuery && filteredSchemas.length === 0"
      class="tree-empty flex flex-col items-center justify-center p-6 h-full text-center"
    >
      <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 text-gray-400 mb-2" />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('queryBuilder.databaseTree.noResults', { query: searchQuery }) }}
      </p>
    </div>

    <!-- ツリー表示 -->
    <div v-else class="tree-content py-1">
      <SchemaNode
        v-for="schema in filteredSchemas"
        :key="schema.name"
        :schema="schema"
        :expanded-nodes="expandedNodes"
        :selected-node="selectedNode"
        :search-query="searchQuery"
        @toggle="toggleNode"
        @select="selectNode"
        @select-table="handleTableSelect"
        @select-column="handleColumnSelect"
        @drag-start-table="handleTableDragStart"
        @drag-start-column="handleColumnDragStart"
      />
    </div>
  </div>
</template>
