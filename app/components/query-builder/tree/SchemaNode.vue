<script setup lang="ts">
import { computed } from 'vue'
import TableNode from './TableNode.vue'
import ViewNode from './ViewNode.vue'
import TreeNodeIcon from './TreeNodeIcon.vue'
import type { Schema, Table, Column } from '@/types/database-structure'

const props = defineProps<{
  schema: Schema
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

const nodeId = computed(() => `schema:${props.schema.name}`)
const isExpanded = computed(() => props.expandedNodes.has(nodeId.value))
const isSelected = computed(() => props.selectedNode === nodeId.value)

const tableCount = computed(() => props.schema.tables.length)
const viewCount = computed(() => props.schema.views.length)

const handleClick = () => {
  emit('toggle', nodeId.value)
  emit('select', nodeId.value)
}
</script>

<template>
  <div class="schema-node select-none">
    <!-- スキーマヘッダー -->
    <div
      class="node-header flex items-center gap-1 px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      :class="{ 'bg-primary-50 dark:bg-primary-900/20': isSelected }"
      @click="handleClick"
    >
      <UIcon
        name="i-heroicons-chevron-right"
        class="w-4 h-4 transition-transform shrink-0"
        :class="{ 'rotate-90': isExpanded }"
      />

      <TreeNodeIcon type="schema" :is-system="schema.isSystem" />

      <span class="node-label text-sm truncate flex-1">{{ schema.name }}</span>

      <span class="node-badge text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
        {{ tableCount + viewCount }}
      </span>
    </div>

    <!-- 子要素 -->
    <div v-if="isExpanded" class="node-children ml-4">
      <!-- テーブル -->
      <TableNode
        v-for="table in schema.tables"
        :key="`table:${table.name}`"
        :table="table"
        :expanded-nodes="expandedNodes"
        :selected-node="selectedNode"
        :search-query="searchQuery"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @select-table="emit('select-table', $event)"
        @select-column="(col, tbl) => emit('select-column', col, tbl)"
        @drag-start-table="emit('drag-start-table', $event)"
        @drag-start-column="(col, tbl) => emit('drag-start-column', col, tbl)"
      />

      <!-- ビュー -->
      <ViewNode
        v-for="view in schema.views"
        :key="`view:${view.name}`"
        :view="view"
        :expanded-nodes="expandedNodes"
        :selected-node="selectedNode"
        :search-query="searchQuery"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
