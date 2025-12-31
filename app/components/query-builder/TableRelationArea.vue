```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useTableSelection } from '@/composables/useTableSelection'
import TableCard from './table/TableCard.vue'
import DropZone from './table/DropZone.vue'
// import JoinList from './JoinList.vue' // Phase 6B: ビジュアル表現で使用予定
// import JoinConfigDialog from './dialog/JoinConfigDialog.vue' // Phase 6B: ビジュアル表現で使用予定
import type { Table } from '@/types/database-structure'
// import type { JoinClause } from '@/types/query-model' // Phase 6B: ビジュアル表現で使用予定

const queryBuilderStore = useQueryBuilderStore()
const { addTable: addTableToStore } = useTableSelection()

// 選択されたテーブル一覧
const selectedTables = computed(() => queryBuilderStore.selectedTables)
// const joins = computed(() => queryBuilderStore.joins) // Phase 6B: ビジュアル表現で使用予定

// コンテナ要素への参照
const containerRef = ref<HTMLElement | null>(null)

// テーブルカードの位置
const tablePositions = ref<Record<string, { x: number; y: number }>>({})

// Phase 6B: ビジュアル表現で使用予定
// JOIN dialog state
// const isJoinDialogOpen = ref(false)
// const editingJoin = ref<JoinClause | undefined>(undefined)

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

// Phase 6B: ビジュアル表現で使用予定
// const openJoinDialog = (join?: JoinClause) => {
//   editingJoin.value = join
//   isJoinDialogOpen.value = true
// }

// const handleSaveJoin = (join: any) => {
//   if (join.id) {
//     const { id, ...updates } = join
//     queryBuilderStore.updateJoin(id, updates)
//   } else {
//     queryBuilderStore.addJoin(join)
//   }
// }

// const removeJoin = (id: string) => {
//   queryBuilderStore.removeJoin(id)
// }
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

      <!-- Phase 6B: ビジュアル表現で使用予定 -->
      <!-- JOIN List (Floating) -->
      <!-- <div v-if="selectedTables.length > 0" class="absolute top-4 right-4 z-10 hidden md:block">
        <JoinList
          :joins="joins"
          @add-join="openJoinDialog()"
          @edit-join="openJoinDialog($event)"
          @remove-join="removeJoin"
        />
      </div> -->
    </div>

    <!-- Phase 6B: ビジュアル表現で使用予定 -->
    <!-- JOIN Dialog -->
    <!-- <JoinConfigDialog
      v-model="isJoinDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    /> -->
  </div>
</template>
