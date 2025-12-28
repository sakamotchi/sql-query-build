<script setup lang="ts">
import { computed } from 'vue'
import ColumnNode from './ColumnNode.vue'
import TreeNodeIcon from './TreeNodeIcon.vue'
import type { View } from '@/types/database-structure'

const props = defineProps<{
  view: View
  expandedNodes: Set<string>
  selectedNode: string | null
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'toggle', nodeId: string): void
  (e: 'select', nodeId: string): void
}>()

const nodeId = computed(() => `view:${props.view.schema}.${props.view.name}`)
const isExpanded = computed(() => props.expandedNodes.has(nodeId.value))
const isSelected = computed(() => props.selectedNode === nodeId.value)

const columnCount = computed(() => props.view.columns.length)

// 検索ハイライト
const matchesSearch = computed(() => {
  if (!props.searchQuery) return false
  return props.view.name.toLowerCase().includes(props.searchQuery.toLowerCase())
})

const handleClick = () => {
  emit('toggle', nodeId.value)
  emit('select', nodeId.value)
}

// ViewはカラムのdragやselectをサポートしないためダミーTable型を作成
const dummyTable = computed(() => ({
  name: props.view.name,
  schema: props.view.schema,
  comment: props.view.comment,
  estimatedRowCount: null,
  columns: props.view.columns,
  primaryKey: null,
  indexes: [],
  foreignKeys: [],
  referencedBy: [],
}))
</script>

<template>
  <div class="view-node select-none">
    <!-- ビューヘッダー -->
    <div
      class="node-header flex items-center gap-1 px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      :class="{
        'bg-primary-50 dark:bg-primary-900/20': isSelected,
        'bg-yellow-50 dark:bg-yellow-900/20': matchesSearch,
      }"
      @click="handleClick"
    >
      <UIcon
        name="i-heroicons-chevron-right"
        class="w-4 h-4 transition-transform shrink-0"
        :class="{ 'rotate-90': isExpanded }"
      />

      <TreeNodeIcon type="view" />

      <span class="node-label text-sm truncate flex-1">{{ view.name }}</span>

      <span class="node-badge text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
        {{ columnCount }}
      </span>
    </div>

    <!-- カラム一覧 -->
    <div v-if="isExpanded" class="node-children ml-4">
      <ColumnNode
        v-for="column in view.columns"
        :key="column.name"
        :column="column"
        :table="dummyTable"
        :selected-node="selectedNode"
        :search-query="searchQuery"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
