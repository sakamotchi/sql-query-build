```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useTableSelection } from '@/composables/useTableSelection'
import TableCard from './table/TableCard.vue'
import DropZone from './table/DropZone.vue'
import RelationLine from './RelationLine.vue'
import JoinConfigDialog from './dialog/JoinConfigDialog.vue'
import type { Table } from '@/types/database-structure'
import type { JoinClause } from '@/types/query-model'

const CARD_WIDTH = 220
const CARD_HEIGHT = 180
const CARD_GAP = 32

const queryBuilderStore = useQueryBuilderStore()
const { addTable: addTableToStore } = useTableSelection()

const selectedTables = computed(() => queryBuilderStore.selectedTables)
const joins = computed(() => queryBuilderStore.joins)
const tablePositions = computed(() => queryBuilderStore.tablePositions)

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const cardRefs = ref<Record<string, HTMLElement | null>>({})

const zoom = ref(100)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const pointerStart = ref({ x: 0, y: 0 })
const isSpacePressed = ref(false)

const isJoinDialogOpen = ref(false)
const editingJoin = ref<JoinClause | undefined>(undefined)
const activeTableAlias = ref<string | null>(null)

const clampZoom = (value: number) => Math.min(200, Math.max(50, value))

// 以前は縮尺・パン位置をローカルストレージに保存していたが、
// 初期表示は常に 100% にするため保存/復元を無効化
const loadCanvasState = () => {
  zoom.value = 100
  panX.value = 0
  panY.value = 0
}

const saveCanvasState = () => {
  return
}

watch([zoom, panX, panY], saveCanvasState)

const setCardRef = (tableId: string, el: Element | ComponentPublicInstance | null) => {
  const element = (el as any)?.$el ?? el
  cardRefs.value[tableId] = (element as HTMLElement) || null
}

watch(
  () => selectedTables.value.length,
  (newLength, oldLength) => {
    if (oldLength === undefined || newLength >= oldLength) {
      selectedTables.value.forEach((table) => {
        if (!tablePositions.value[table.id]) {
          const pos = getOptimizedPosition()
          queryBuilderStore.updateTablePosition(table.id, pos.x, pos.y)
        }
      })
    }
  },
  { immediate: true }
)

const getOptimizedPosition = () => {
  const width = containerRef.value?.clientWidth || 1200
  const perRow = Math.max(1, Math.floor((width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)))
  const count = Object.keys(tablePositions.value).length
  const row = Math.floor(count / perRow)
  const col = count % perRow

  return {
    x: CARD_GAP + col * (CARD_WIDTH + CARD_GAP),
    y: CARD_GAP + row * (CARD_HEIGHT + CARD_GAP),
  }
}

const handleTableDrop = (e: Event) => {
  const customEvent = e as CustomEvent<{ table: Table; x: number; y: number }>
  const { table, x, y } = customEvent.detail

  const tableId = `${table.schema}.${table.name}`
  queryBuilderStore.updateTablePosition(tableId, x, y)
  addTableToStore(table)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    isSpacePressed.value = true
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    isSpacePressed.value = false
  }
}

onMounted(() => {
  loadCanvasState()

  const container = document.getElementById('query-builder-canvas')
  if (container) {
    container.addEventListener('table-drop', handleTableDrop)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  const container = document.getElementById('query-builder-canvas')
  if (container) {
    container.removeEventListener('table-drop', handleTableDrop)
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('mousemove', handlePanMove)
  document.removeEventListener('mouseup', handlePanEnd)
})

const removeTable = (tableId: string) => {
  queryBuilderStore.removeTable(tableId)
  activeTableAlias.value = null
}

const updateAlias = (tableId: string, alias: string) => {
  queryBuilderStore.updateTableAlias(tableId, alias)
}

const handleTableMove = (tableId: string, x: number, y: number) => {
  queryBuilderStore.updateTablePosition(tableId, x, y)
}

const openJoinDialog = (join?: JoinClause) => {
  editingJoin.value = join
  isJoinDialogOpen.value = true
}

const handleSaveJoin = (join: JoinClause | Omit<JoinClause, 'id'>) => {
  if ('id' in join) {
    const { id, ...updates } = join
    queryBuilderStore.updateJoin(id, updates)
  } else {
    queryBuilderStore.addJoin(join)
  }
  editingJoin.value = undefined
}

const removeJoin = (id: string) => {
  queryBuilderStore.removeJoin(id)
}

const handleZoomIn = () => {
  zoom.value = clampZoom(zoom.value + 10)
}

const handleZoomOut = () => {
  zoom.value = clampZoom(zoom.value - 10)
}

const handleZoomReset = () => {
  zoom.value = 100
  panX.value = 0
  panY.value = 0
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY < 0 ? 10 : -10
  const nextZoom = clampZoom(zoom.value + delta)

  const currentScale = zoom.value / 100
  const nextScale = nextZoom / 100
  const canvasRect = canvasRef.value?.getBoundingClientRect()

  if (canvasRect) {
    const offsetX = event.clientX - canvasRect.left
    const offsetY = event.clientY - canvasRect.top

    panX.value = offsetX - ((offsetX - panX.value) * (nextScale / currentScale))
    panY.value = offsetY - ((offsetY - panY.value) * (nextScale / currentScale))
  }

  zoom.value = nextZoom
}

const handlePanStart = (event: MouseEvent) => {
  const isMiddleButton = event.button === 1
  const isSpaceDrag = event.button === 0 && isSpacePressed.value

  if (!isMiddleButton && !isSpaceDrag) return

  isPanning.value = true
  pointerStart.value = { x: event.clientX, y: event.clientY }
  panStart.value = { x: panX.value, y: panY.value }

  document.addEventListener('mousemove', handlePanMove)
  document.addEventListener('mouseup', handlePanEnd)
  event.preventDefault()
  event.stopPropagation()
}

const handlePanMove = (event: MouseEvent) => {
  if (!isPanning.value) return
  panX.value = panStart.value.x + (event.clientX - pointerStart.value.x)
  panY.value = panStart.value.y + (event.clientY - pointerStart.value.y)
}

const handlePanEnd = () => {
  isPanning.value = false
  document.removeEventListener('mousemove', handlePanMove)
  document.removeEventListener('mouseup', handlePanEnd)
}

const canvasStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value / 100})`,
  transformOrigin: 'top left',
}))

const svgTransform = computed(() => `translate(${panX.value}, ${panY.value}) scale(${zoom.value / 100})`)

const svgViewBox = computed(() => {
  const width = canvasRef.value?.clientWidth || 1600
  const height = canvasRef.value?.clientHeight || 900
  return `0 0 ${width} ${height}`
})

const highlightedJoinIds = computed<Set<string> | null>(() => {
  if (!activeTableAlias.value) return null
  const baseAlias = selectedTables.value[0]?.alias
  if (baseAlias && activeTableAlias.value === baseAlias) {
    return new Set(joins.value.map((join) => join.id))
  }
  const related = joins.value.filter((join) => join.table.alias === activeTableAlias.value)
  return new Set(related.map((join) => join.id))
})

const getCardRect = (tableId: string) => {
  const el = cardRefs.value[tableId]
  if (!el || !canvasRef.value) return null

  const rect = el.getBoundingClientRect()
  const containerRect = canvasRef.value.getBoundingClientRect()
  const scale = zoom.value / 100

  return {
    x: (rect.left - containerRect.left) / scale,
    y: (rect.top - containerRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  }
}

const relationLines = computed(() => {
  if (selectedTables.value.length < 2) return []

  const baseTable = selectedTables.value[0]
  const positions = tablePositions.value

  return joins.value
    .map((join) => {
      const targetTable = selectedTables.value.find((t) => t.alias === join.table.alias)
      if (!baseTable || !targetTable) return null

      const fromRect =
        getCardRect(baseTable.id) ||
        (positions[baseTable.id]
          ? {
              x: positions[baseTable.id].x,
              y: positions[baseTable.id].y,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            }
          : null)
      const toRect =
        getCardRect(targetTable.id) ||
        (positions[targetTable.id]
          ? {
              x: positions[targetTable.id].x,
              y: positions[targetTable.id].y,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            }
          : null)

      if (!fromRect || !toRect) return null

      const isActive = highlightedJoinIds.value?.has(join.id) ?? false
      const isDimmed = highlightedJoinIds.value ? !isActive : false

      return {
        join,
        x1: fromRect.x + fromRect.width / 2,
        y1: fromRect.y + fromRect.height / 2,
        x2: toRect.x + toRect.width / 2,
        y2: toRect.y + toRect.height / 2,
        isActive,
        isDimmed,
      }
    })
    .filter(Boolean) as Array<{
      join: JoinClause
      x1: number
      y1: number
      x2: number
      y2: number
      isActive: boolean
      isDimmed: boolean
    }>
})

const clearActiveTable = () => {
  activeTableAlias.value = null
}

const handleCardFocus = (payload: { id: string; alias: string }) => {
  activeTableAlias.value = payload.alias
}
</script>

<template>
  <div
    id="query-builder-canvas"
    ref="containerRef"
    class="relative h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950"
    @mousedown.capture="handlePanStart"
    @wheel.prevent="handleWheel"
    @click.self="clearActiveTable"
  >
    <!-- JOINツールバー -->
    <div
      v-if="selectedTables.length >= 2"
      class="absolute top-4 right-4 z-20 flex gap-2"
    >
      <UButton
        icon="i-heroicons-plus"
        label="JOIN追加"
        size="sm"
        color="primary"
        @click="openJoinDialog()"
      />
      <UButton
        icon="i-heroicons-magnifying-glass-plus"
        size="sm"
        color="gray"
        variant="ghost"
        @click="handleZoomIn"
      />
      <UButton
        icon="i-heroicons-magnifying-glass-minus"
        size="sm"
        color="gray"
        variant="ghost"
        @click="handleZoomOut"
      />
      <UButton
        :label="`${zoom}%`"
        size="sm"
        color="gray"
        variant="ghost"
        @click="handleZoomReset"
      />
    </div>

    <!-- Content -->
    <div class="w-full h-full overflow-auto relative">
      <div
        ref="canvasRef"
        class="relative min-h-full min-w-full"
        :style="canvasStyle"
      >
        <!-- SVGレイヤー（JOIN線） -->
        <svg
          v-if="selectedTables.length >= 2"
          class="absolute inset-0 pointer-events-none z-10"
          role="img"
          aria-label="テーブル関係図"
          :viewBox="svgViewBox"
        >
          <g :transform="svgTransform">
            <RelationLine
              v-for="line in relationLines"
              :key="line.join.id"
              :join="line.join"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              :is-active="line.isActive"
              :is-dimmed="line.isDimmed"
              class="cursor-pointer"
              @click="openJoinDialog(line.join)"
            />
          </g>
        </svg>

        <!-- 空状態 -->
        <DropZone v-if="selectedTables.length === 0" />

        <!-- テーブルカード -->
        <template v-else>
          <TableCard
            v-for="table in selectedTables"
            :key="table.id"
            :ref="(el) => setCardRef(table.id, el)"
            :table="table"
            :position="tablePositions[table.id] || { x: CARD_GAP, y: CARD_GAP }"
            :zoom="zoom"
            @remove="removeTable"
            @update-alias="updateAlias"
            @move="handleTableMove"
            @focus="handleCardFocus"
          />
        </template>

        <!-- ドロップヒント -->
        <div
          v-if="selectedTables.length > 0"
          class="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded shadow-sm opacity-70 pointer-events-none"
        >
          <UIcon name="i-heroicons-plus" class="w-3 h-3" />
          テーブルをドロップして追加
        </div>
      </div>
    </div>

    <!-- JOIN Dialog -->
    <JoinConfigDialog
      v-model="isJoinDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    />
  </div>
</template>
