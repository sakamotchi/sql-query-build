<script setup lang="ts">
import { ref } from 'vue'
import DatabaseTree from './DatabaseTree.vue'
import { useTableSelection } from '@/composables/useTableSelection'
import type { Table, Column } from '@/types/database-structure'

const emit = defineEmits<{
  (e: 'select-table', table: Table): void
  (e: 'select-column', column: Column, table: Table): void
  (e: 'drag-start-table', table: Table): void
  (e: 'drag-start-column', column: Column, table: Table): void
}>()

const { addTable } = useTableSelection()

// 検索クエリ
const searchQuery = ref('')
const databaseTreeRef = ref<InstanceType<typeof DatabaseTree> | null>(null)

/**
 * ツリーを更新
 */
const refreshTree = () => {
  databaseTreeRef.value?.refresh()
}

/**
 * テーブル選択（ダブルクリック時にテーブル関係図エリアに追加）
 */
const handleTableSelect = (table: Table) => {
  addTable(table)
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
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">データベース構造</span>
      <UButton
        icon="i-heroicons-arrow-path"
        size="xs"
        color="neutral"
        variant="ghost"
        title="更新"
        @click="refreshTree"
      />
    </div>

    <!-- 検索ボックス -->
    <div class="p-2 border-b border-gray-200 dark:border-gray-800">
      <UInput
        v-model="searchQuery"
        size="sm"
        placeholder="テーブル・カラムを検索..."
        icon="i-heroicons-magnifying-glass"
      />
    </div>

    <!-- DB構造ツリー -->
    <div class="flex-1 overflow-hidden">
      <DatabaseTree
        ref="databaseTreeRef"
        :search-query="searchQuery"
        @select-table="handleTableSelect"
        @select-column="handleColumnSelect"
        @drag-start-table="handleTableDragStart"
        @drag-start-column="handleColumnDragStart"
      />
    </div>
  </div>
</template>
