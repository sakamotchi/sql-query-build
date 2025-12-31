<script setup lang="ts">
import { computed, ref } from 'vue'
import TableCardHeader from './TableCardHeader.vue'
import TableCardColumn from './TableCardColumn.vue'
import type { SelectedTable } from '@/types/query'
import type { Column } from '@/types/database-structure'

const props = defineProps<{
  table: SelectedTable
  position?: { x: number; y: number }
  zoom?: number
}>()

const emit = defineEmits<{
  (e: 'remove', tableId: string): void
  (e: 'update-alias', tableId: string, alias: string): void
  (e: 'move', tableId: string, x: number, y: number): void
  (e: 'select-column', column: Column): void
  (e: 'focus', payload: { id: string; alias: string }): void
}>()

const cardRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const scale = computed(() => (props.zoom ?? 100) / 100)

// カード位置
const cardStyle = computed(() => {
  if (!props.position) return {}
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
  }
})

// 展開状態
// 初期表示は折りたたみ（列を省略）
const isExpanded = ref(false)

// 表示するカラム数（折りたたみ時）
const maxCollapsedColumns = 5

// 表示するカラム
const displayedColumns = computed(() => {
  if (isExpanded.value) {
    return props.table.columns
  }
  return props.table.columns.slice(0, maxCollapsedColumns)
})

// 残りのカラム数
const remainingColumnCount = computed(() => {
  if (isExpanded.value) return 0
  return Math.max(0, props.table.columns.length - maxCollapsedColumns)
})

/**
 * ドラッグ開始
 */
const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  // ヘッダー内の操作要素はドラッグ対象外
  if ((e.target as HTMLElement).closest('.no-drag')) return

  isDragging.value = true

  if (cardRef.value) {
    const rect = cardRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: (e.clientX - rect.left) / scale.value,
      y: (e.clientY - rect.top) / scale.value,
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/**
 * ドラッグ中
 */
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !cardRef.value) return

  const parent = cardRef.value.parentElement
  if (!parent) return

  const parentRect = parent.getBoundingClientRect()
  const x = (e.clientX - parentRect.left) / scale.value - dragOffset.value.x
  const y = (e.clientY - parentRect.top) / scale.value - dragOffset.value.y

  // 範囲制限
  const maxX = parentRect.width / scale.value - cardRef.value.offsetWidth
  const maxY = parentRect.height / scale.value - cardRef.value.offsetHeight

  emit(
    'move',
    props.table.id,
    Math.max(0, Math.min(maxX, x)),
    Math.max(0, Math.min(maxY, y))
  )
}

/**
 * ドラッグ終了
 */
const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

/**
 * 削除
 */
const handleRemove = () => {
  emit('remove', props.table.id)
}

/**
 * エイリアス更新
 */
const handleAliasUpdate = (alias: string) => {
  emit('update-alias', props.table.id, alias)
}

/**
 * 展開/折りたたみ切り替え
 */
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

/**
 * カラム選択
 */
const handleColumnClick = (column: Column) => {
  emit('select-column', column)
}

/**
 * カードのフォーカス（クリック）を通知
 */
const handleFocus = () => {
  if (isDragging.value) return
  emit('focus', { id: props.table.id, alias: props.table.alias })
}
</script>

<template>
  <div
    ref="cardRef"
    data-draggable-card
    class="absolute min-w-[180px] max-w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md select-none z-10"
    :class="{
      'opacity-80 z-50 cursor-grabbing': isDragging,
      'cursor-grab hover:shadow-lg': !isDragging,
    }"
    :style="cardStyle"
    @mousedown="handleMouseDown"
    @click="handleFocus"
  >
    <!-- ヘッダー -->
    <TableCardHeader
      :table-name="table.name"
      :alias="table.alias"
      :is-expanded="isExpanded"
      @remove="handleRemove"
      @update-alias="handleAliasUpdate"
      @toggle-expand="toggleExpand"
    />

    <!-- カラムリスト -->
    <div
      v-if="isExpanded || displayedColumns.length > 0"
      class="max-h-[300px] overflow-y-auto"
    >
      <TableCardColumn
        v-for="column in displayedColumns"
        :key="column.name"
        :column="column"
        class="no-drag"
        @click="handleColumnClick(column)"
      />

      <!-- 残りのカラム数表示 -->
      <div
        v-if="remainingColumnCount > 0"
        class="px-3 py-1.5 text-xs text-primary-600 dark:text-primary-400 text-center cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 no-drag"
        @click="toggleExpand"
      >
        +{{ remainingColumnCount }} more columns
      </div>
    </div>
  </div>
</template>
