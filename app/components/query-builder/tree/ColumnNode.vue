<script setup lang="ts">
import { computed } from 'vue'
import TreeNodeIcon from './TreeNodeIcon.vue'
import type { Column, Table } from '@/types/database-structure'

const props = defineProps<{
  column: Column
  table: Table
  selectedNode: string | null
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'select', nodeId: string): void
  (e: 'select-column', column: Column): void
  (e: 'drag-start', column: Column): void
}>()

const nodeId = computed(
  () => `column:${props.table.schema}.${props.table.name}.${props.column.name}`
)
const isSelected = computed(() => props.selectedNode === nodeId.value)

// カラムタイプ
const columnType = computed(() => {
  if (props.column.isPrimaryKey) return 'primary-key'
  if (props.column.isForeignKey) return 'foreign-key'
  if (props.column.isUnique) return 'unique'
  return 'column'
})

// 検索ハイライト
const matchesSearch = computed(() => {
  if (!props.searchQuery) return false
  return props.column.name.toLowerCase().includes(props.searchQuery.toLowerCase())
})

// ツールチップ内容
const tooltipContent = computed(() => {
  const lines = [
    `${props.column.name} (${props.column.displayType})`,
  ]

  if (props.column.isPrimaryKey) lines.push('PRIMARY KEY')
  if (props.column.isForeignKey) lines.push('FOREIGN KEY')
  if (props.column.isUnique) lines.push('UNIQUE')
  if (!props.column.nullable) lines.push('NOT NULL')
  if (props.column.defaultValue) lines.push(`DEFAULT: ${props.column.defaultValue}`)
  if (props.column.comment) lines.push(`コメント: ${props.column.comment}`)

  return lines.join('\n')
})

const handleClick = () => {
  emit('select', nodeId.value)
}

const handleDoubleClick = () => {
  emit('select-column', props.column)
}

const handleDragStart = (e: DragEvent) => {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    type: 'column',
    data: {
      column: props.column,
      table: props.table,
    },
  }))
  emit('drag-start', props.column)
}
</script>

<template>
  <div
    class="column-node flex items-center gap-1 px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
    :class="{
      'bg-primary-50 dark:bg-primary-900/20': isSelected,
      'bg-yellow-50 dark:bg-yellow-900/20': matchesSearch,
    }"
    draggable="true"
    :title="tooltipContent"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @dragstart="handleDragStart"
  >
    <TreeNodeIcon :type="columnType" />

    <span class="column-name text-sm truncate">{{ column.name }}</span>

    <span class="column-type text-xs text-gray-500 dark:text-gray-400 ml-auto">
      {{ column.displayType }}
    </span>

    <!-- NULL許可インジケーター -->
    <span
      v-if="!column.nullable"
      class="not-null-indicator text-red-500 font-bold"
      title="NOT NULL"
    >
      *
    </span>
  </div>
</template>

<style scoped>
.column-node[draggable='true'] {
  cursor: grab;
}

.column-node[draggable='true']:active {
  cursor: grabbing;
}
</style>
