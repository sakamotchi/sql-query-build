<script setup lang="ts">
import { computed } from 'vue'
import ColumnNode from './ColumnNode.vue'
import TreeNodeIcon from './TreeNodeIcon.vue'
import type { Table, Column } from '@/types/database-structure'

const props = defineProps<{
  table: Table
  expandedNodes: Set<string>
  selectedNode: string | null
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'toggle', nodeId: string): void
  (e: 'select', nodeId: string): void
  (e: 'select-table', table: Table): void
  (e: 'select-column', column: Column, table: Table): void
  (e: 'drag-start-table', table: Table): void
  (e: 'drag-start-column', column: Column, table: Table): void
}>()

const nodeId = computed(() => `table:${props.table.schema}.${props.table.name}`)
const isExpanded = computed(() => props.expandedNodes.has(nodeId.value))
const isSelected = computed(() => props.selectedNode === nodeId.value)

const columnCount = computed(() => props.table.columns.length)

// 検索ハイライト
const matchesSearch = computed(() => {
  if (!props.searchQuery) return false
  return props.table.name.toLowerCase().includes(props.searchQuery.toLowerCase())
})

const handleClick = () => {
  emit('toggle', nodeId.value)
  emit('select', nodeId.value)
}

const handleDoubleClick = () => {
  emit('select-table', props.table)
}

const handleDragStart = (e: DragEvent) => {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    type: 'table',
    data: props.table,
  }))
  emit('drag-start-table', props.table)
}

const handleColumnSelect = (column: Column) => {
  emit('select-column', column, props.table)
}

const handleColumnDragStart = (column: Column) => {
  emit('drag-start-column', column, props.table)
}
</script>

<template>
  <div class="table-node select-none">
    <!-- テーブルヘッダー -->
    <div
      class="node-header flex items-center gap-1 px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      :class="{
        'bg-primary-50 dark:bg-primary-900/20': isSelected,
        'bg-yellow-50 dark:bg-yellow-900/20': matchesSearch,
      }"
      draggable="true"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @dragstart="handleDragStart"
    >
      <UIcon
        name="i-heroicons-chevron-right"
        class="w-4 h-4 transition-transform shrink-0"
        :class="{ 'rotate-90': isExpanded }"
      />

      <TreeNodeIcon type="table" />

      <span class="node-label text-sm truncate flex-1">{{ table.name }}</span>

      <span class="node-badge text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
        {{ columnCount }}
      </span>

      <!-- 行数（あれば） -->
      <span v-if="table.estimatedRowCount" class="node-row-count text-xs text-gray-400">
        ~{{ table.estimatedRowCount.toLocaleString() }}行
      </span>
    </div>

    <!-- カラム一覧 -->
    <div v-if="isExpanded" class="node-children ml-4">
      <ColumnNode
        v-for="column in table.columns"
        :key="column.name"
        :column="column"
        :table="table"
        :selected-node="selectedNode"
        :search-query="searchQuery"
        @select="emit('select', $event)"
        @select-column="handleColumnSelect"
        @drag-start="handleColumnDragStart"
      />
    </div>
  </div>
</template>

<style scoped>
.node-header[draggable='true'] {
  cursor: grab;
}

.node-header[draggable='true']:active {
  cursor: grabbing;
}
</style>
