```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useTableSelection } from '@/composables/useTableSelection'
import TableCard from './table/TableCard.vue'
import DropZone from './table/DropZone.vue'
import type { Table } from '@/types/database-structure'

const queryBuilderStore = useQueryBuilderStore()
const { addTable: addTableToStore } = useTableSelection()

// 選択されたテーブル一覧
const selectedTables = computed(() => queryBuilderStore.selectedTables)

// コンテナ要素への参照
const containerRef = ref<HTMLElement | null>(null)

// テーブルカードの位置
const tablePositions = ref<Record<string, { x: number; y: number }>>({})

/**
 * 新しく追加されたテーブルの位置を自動計算して設定する
 * (ダブルクリックなどで追加された場合用)
 */
watch(() => selectedTables.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    const newTable = selectedTables.value[newLength - 1]
    if (!newTable) return // 安全策

    const tableId = `${newTable.schema}.${newTable.name}`
    
    // まだ位置が設定されていない場合のみ自動計算して設定
    if (!tablePositions.value[tableId]) {
      const pos = getOptimizedPosition()
      tablePositions.value[tableId] = pos
    }
  }
})

/**
 * 最適な配置位置を計算する（単純なカスケード配置）
 */
const getOptimizedPosition = () => {
  const offset = 30
  const baseX = 50
  const baseY = 50
  
  const count = Object.keys(tablePositions.value).length
  return {
    x: baseX + (count * offset) % 200,
    y: baseY + (count * offset) % 200
  }
}

// --------------------------------------------------------------------------
// Custom Event Handler for Pointer Events Drag System
// --------------------------------------------------------------------------

/**
 * TableNodeから発火されるカスタムイベントをリッスン
 */
const handleTableDrop = (e: Event) => {
  const customEvent = e as CustomEvent<{ table: Table; x: number; y: number }>
  const { table, x, y } = customEvent.detail

  console.log('[TableRelationArea] Custom Drop Event Received', table.name, x, y)

  const tableId = `${table.schema}.${table.name}`
  
  // 1. 位置を先に保存 (watchでの自動配置を防ぐため)
  tablePositions.value[tableId] = { x, y }
  
  // 2. ストアに追加
  addTableToStore(table)
}

onMounted(() => {
  const container = document.getElementById('query-builder-canvas')
  if (container) {
    container.addEventListener('table-drop', handleTableDrop)
  }
})

onUnmounted(() => {
  const container = document.getElementById('query-builder-canvas')
  if (container) {
    container.removeEventListener('table-drop', handleTableDrop)
  }
})

// --------------------------------------------------------------------------
// Methods
// --------------------------------------------------------------------------

const removeTable = (tableId: string) => {
  queryBuilderStore.removeTable(tableId)
  delete tablePositions.value[tableId]
}

const updateAlias = (tableId: string, alias: string) => {
  queryBuilderStore.updateTableAlias(tableId, alias)
}

const handleTableMove = (tableId: string, x: number, y: number) => {
  tablePositions.value[tableId] = { x, y }
}
</script>

<template>
  <div
    id="query-builder-canvas"
    ref="containerRef"
    class="relative h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950"
  >
    <!-- Content -->
    <div class="w-full h-full overflow-auto">
      <!-- 空状態 -->
      <DropZone v-if="selectedTables.length === 0" />

      <!-- テーブルカード -->
      <template v-else>
        <TableCard
          v-for="table in selectedTables"
          :key="table.id"
          :table="table"
          :position="tablePositions[table.id] || { x: 50, y: 50 }"
          @remove="removeTable"
          @update-alias="updateAlias"
          @move="handleTableMove"
        />
      </template>

      <!-- ドロップヒント -->
      <div
        v-if="selectedTables.length > 0"
        class="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded shadow-sm opacity-70 pointer-events-none"
      >
        <UIcon name="i-heroicons-plus" class="w-3 h-3" />
        テーブルをドロップして追加
      </div>
    </div>
  </div>
</template>
