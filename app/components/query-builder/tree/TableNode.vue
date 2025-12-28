<script setup lang="ts">
import { computed, ref } from 'vue'
import ColumnNode from './ColumnNode.vue'
import TreeNodeIcon from './TreeNodeIcon.vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useTableSelection } from '@/composables/useTableSelection'
import type { Table, Column } from '@/types/database-structure'

const queryBuilderStore = useQueryBuilderStore()
const { addTable } = useTableSelection()

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
  // ダブルクリックでテーブルを追加
  if (addTable(props.table)) {
    // 成功時の処理（必要ならトーストなど）
  }
}

// --------------------------------------------------------------------------
// Custom Pointer Events Drag System
// --------------------------------------------------------------------------
const isDragging = ref(false)
let ghostElement: HTMLElement | null = null

const handleMouseDown = (e: MouseEvent) => {
  // 左クリックのみ反応
  if (e.button !== 0) return
  
  // ドラッグ開始
  isDragging.value = true
  
  // ゴースト要素を作成
  createGhostElement(e)
  
  // グローバルイベント登録
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // デフォルトのテキスト選択などを無効化
  e.preventDefault()
  
  // ストアにドラッグ状態を通知（UIハイライト用など）
  queryBuilderStore.setDraggingTable(props.table)
}

const createGhostElement = (e: MouseEvent) => {
  // 簡単なゴースト要素を作成
  const ghost = document.createElement('div')
  ghost.textContent = props.table.name
  ghost.style.position = 'fixed'
  ghost.style.top = `${e.clientY}px`
  ghost.style.left = `${e.clientX}px`
  ghost.style.padding = '8px 12px'
  ghost.style.background = 'white'
  ghost.style.border = '1px solid #ccc'
  ghost.style.borderRadius = '4px'
  ghost.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  ghost.style.zIndex = '9999'
  ghost.style.pointerEvents = 'none' // マウスイベントを透過させる
  ghost.style.opacity = '0.9'
  ghost.style.transform = 'translate(-50%, -50%)' // 真ん中を掴む
  ghost.style.fontFamily = 'sans-serif'
  ghost.style.fontSize = '14px'
  
  // ダークモード対応（簡易）
  if (document.documentElement.classList.contains('dark')) {
      ghost.style.background = '#1f2937'
      ghost.style.borderColor = '#374151'
      ghost.style.color = '#fff'
  }

  document.body.appendChild(ghost)
  ghostElement = ghost
}

const handleMouseMove = (e: MouseEvent) => {
  if (ghostElement) {
    ghostElement.style.top = `${e.clientY}px`
    ghostElement.style.left = `${e.clientX}px`
  }
}

const handleMouseUp = (e: MouseEvent) => {
  // クリーンアップ
  if (ghostElement) {
    document.body.removeChild(ghostElement)
    ghostElement = null
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  isDragging.value = false
  queryBuilderStore.setDraggingTable(null)

  // Hit Test: ドロップ先のエリアを探す
  const dropTarget = document.getElementById('query-builder-canvas')
  if (dropTarget) {
    const rect = dropTarget.getBoundingClientRect()
    // コンテナ内判定
    const isInside = 
      e.clientX >= rect.left && 
      e.clientX <= rect.right && 
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
      
    if (isInside) {
      // ドロップ成功！カスタムイベントを発火する
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const event = new CustomEvent('table-drop', {
        detail: {
            table: props.table,
            x,
            y
        }
      })
      dropTarget.dispatchEvent(event)
    }
  }
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
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @mousedown="handleMouseDown"
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
