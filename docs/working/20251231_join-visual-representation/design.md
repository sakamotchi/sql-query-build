# Phase 6B: JOIN設定UI拡張（ビジュアル表現） - 設計書

**作成日**: 2025-12-31
**フェーズ**: 6B

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│ QueryBuilder.vue                                        │
│  ├─ TabNavigation (既存)                                │
│  └─ JoinPanel.vue (Phase 6A)                           │
│      ├─ [リスト表示]タブ (Phase 6A実装済み)            │
│      └─ [キャンバス表示]タブ (新規)                    │
│           └─ TableCanvas.vue (新規)                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ TableCanvas.vue                                         │
│  ├─ CanvasToolbar.vue (ズーム・リセット等)             │
│  ├─ TableCardOnCanvas.vue x N (ドラッグ可能)           │
│  └─ RelationLine.vue x N (JOIN関係の線)                │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ query-builder.ts (Pinia Store)                          │
│  - tablePositions: { [alias]: { x, y } }                │
│  - updateTablePosition(alias, x, y)                     │
│  - resetTablePositions()                                │
└─────────────────────────────────────────────────────────┘
```

---

## 2. コンポーネント設計

### 2.1 JoinPanel.vue（拡張）

Phase 6Aで実装済みのコンポーネントに、タブ切り替え機能を追加します。

**UI構成**:
```
┌──────────────────────────────────────┐
│ [リスト表示] [キャンバス表示]       │
├──────────────────────────────────────┤
│                                      │
│ (タブコンテンツ)                     │
│                                      │
└──────────────────────────────────────┘
```

**実装例**:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useQueryBuilderStore } from '~/stores/query-builder'
import JoinConfigDialog from '../dialog/JoinConfigDialog.vue'
import TableCanvas from './TableCanvas.vue'
import type { JoinClause } from '~/types/query-model'

const store = useQueryBuilderStore()

// タブ状態
const selectedTab = ref<'list' | 'canvas'>('list')

// ダイアログ状態
const isDialogOpen = ref(false)
const editingJoin = ref<JoinClause | undefined>(undefined)

// ... 既存のロジック（Phase 6Aと同じ）...

// キャンバスから編集リクエストを受け取る
const handleEditJoinFromCanvas = (join: JoinClause) => {
  editingJoin.value = join
  isDialogOpen.value = true
}
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <!-- タブナビゲーション -->
    <UTabs
      v-model="selectedTab"
      :items="[
        { key: 'list', label: 'リスト表示', icon: 'i-heroicons-list-bullet' },
        { key: 'canvas', label: 'キャンバス表示', icon: 'i-heroicons-squares-2x2' },
      ]"
      class="border-b border-gray-200 dark:border-gray-700"
    />

    <!-- タブコンテンツ -->
    <div class="flex-1 overflow-hidden">
      <!-- リスト表示（Phase 6A実装済み） -->
      <div v-if="selectedTab === 'list'" class="h-full">
        <!-- ... Phase 6Aの実装内容 ... -->
      </div>

      <!-- キャンバス表示 -->
      <div v-else-if="selectedTab === 'canvas'" class="h-full">
        <TableCanvas
          :tables="store.selectedTables"
          :joins="store.joins"
          :table-positions="store.tablePositions"
          @update:table-position="store.updateTablePosition"
          @edit-join="handleEditJoinFromCanvas"
        />
      </div>
    </div>

    <!-- JOIN設定ダイアログ（共通） -->
    <JoinConfigDialog
      v-model="isDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    />
  </div>
</template>
```

---

### 2.2 TableCanvas.vue

**責務**: テーブルとJOIN関係を視覚的に表示するキャンバス

**Props**:
```typescript
interface Props {
  tables: SelectedTable[]
  joins: JoinClause[]
  tablePositions: { [tableAlias: string]: { x: number; y: number } }
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'update:table-position', alias: string, x: number, y: number): void
  (e: 'edit-join', join: JoinClause): void
}
```

**UI構成**:
```
┌─────────────────────────────────────────────────────────┐
│                                    [ツールバー]          │
│  ┌───┐         ┌───┐                                    │
│  │ T1│─────────│ T2│                                    │
│  └───┘         └───┘                                    │
│                                                          │
│         ┌───┐                                           │
│         │ T3│                                           │
│         └───┘                                           │
└─────────────────────────────────────────────────────────┘
```

**実装例**:
```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { SelectedTable, JoinClause } from '~/types/query-model'

interface Props {
  tables: SelectedTable[]
  joins: JoinClause[]
  tablePositions: { [tableAlias: string]: { x: number; y: number } }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:table-position': [alias: string, x: number, y: number]
  'edit-join': [join: JoinClause]
}>()

// キャンバス状態
const canvasRef = ref<SVGSVGElement>()
const zoom = ref(100) // 50 ~ 200
const panX = ref(0)
const panY = ref(0)

// テーブル位置の初期化・自動配置
const positions = computed(() => {
  const result: { [alias: string]: { x: number; y: number } } = {}

  props.tables.forEach((table, index) => {
    if (props.tablePositions[table.alias]) {
      // 既存の位置を使用
      result[table.alias] = props.tablePositions[table.alias]
    } else {
      // 自動配置
      const col = index % 3 // 3列レイアウト
      const row = Math.floor(index / 3)
      result[table.alias] = {
        x: 50 + col * 250, // カード幅200 + マージン50
        y: 50 + row * 200, // カード高さ150 + マージン50
      }
    }
  })

  return result
})

// ドラッグ状態
const draggingAlias = ref<string | null>(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

// ドラッグ開始
const handleDragStart = (alias: string, event: MouseEvent) => {
  draggingAlias.value = alias
  const pos = positions.value[alias]
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragOffsetX.value = pos.x
  dragOffsetY.value = pos.y

  // ドキュメント全体でマウスイベントをリッスン
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

// ドラッグ中
const handleDragMove = (event: MouseEvent) => {
  if (!draggingAlias.value) return

  const dx = (event.clientX - dragStartX.value) / (zoom.value / 100)
  const dy = (event.clientY - dragStartY.value) / (zoom.value / 100)

  const newX = Math.max(0, dragOffsetX.value + dx)
  const newY = Math.max(0, dragOffsetY.value + dy)

  emit('update:table-position', draggingAlias.value, newX, newY)
}

// ドラッグ終了
const handleDragEnd = () => {
  draggingAlias.value = null
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// ズーム操作
const handleZoomIn = () => {
  zoom.value = Math.min(200, zoom.value + 10)
}

const handleZoomOut = () => {
  zoom.value = Math.max(50, zoom.value - 10)
}

const handleZoomReset = () => {
  zoom.value = 100
  panX.value = 0
  panY.value = 0
}

// パン操作（中ボタンドラッグ）
const isPanning = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panOffsetX = ref(0)
const panOffsetY = ref(0)

const handlePanStart = (event: MouseEvent) => {
  if (event.button !== 1) return // 中ボタンのみ
  event.preventDefault()

  isPanning.value = true
  panStartX.value = event.clientX
  panStartY.value = event.clientY
  panOffsetX.value = panX.value
  panOffsetY.value = panY.value

  document.addEventListener('mousemove', handlePanMove)
  document.addEventListener('mouseup', handlePanEnd)
}

const handlePanMove = (event: MouseEvent) => {
  if (!isPanning.value) return

  const dx = event.clientX - panStartX.value
  const dy = event.clientY - panStartY.value

  panX.value = panOffsetX.value + dx
  panY.value = panOffsetY.value + dy
}

const handlePanEnd = () => {
  isPanning.value = false
  document.removeEventListener('mousemove', handlePanMove)
  document.removeEventListener('mouseup', handlePanEnd)
}

// マウスホイールズーム
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -10 : 10
  zoom.value = Math.max(50, Math.min(200, zoom.value + delta))
}

// SVG transform
const svgTransform = computed(() => {
  return `translate(${panX.value}, ${panY.value}) scale(${zoom.value / 100})`
})

// リレーション線の計算
const relationLines = computed(() => {
  return props.joins.map(join => {
    const fromTable = props.tables.find(t => t === props.tables[0]) // FROMテーブル
    const toTable = props.tables.find(t => t.alias === join.table.alias)

    if (!fromTable || !toTable) return null

    const fromPos = positions.value[fromTable.alias]
    const toPos = positions.value[toTable.alias]

    if (!fromPos || !toPos) return null

    // カード中央から接続
    const x1 = fromPos.x + 100 // カード幅の半分
    const y1 = fromPos.y + 75  // カード高さの半分
    const x2 = toPos.x + 100
    const y2 = toPos.y + 75

    return {
      join,
      x1,
      y1,
      x2,
      y2,
      strokeDasharray: getStrokeDasharray(join.type),
    }
  }).filter(Boolean)
})

// JOIN種別に応じた線のスタイル
const getStrokeDasharray = (joinType: JoinClause['type']): string => {
  switch (joinType) {
    case 'INNER':
      return 'none'
    case 'LEFT':
    case 'RIGHT':
    case 'FULL':
      return '5,5'
    case 'CROSS':
      return '2,2'
    default:
      return 'none'
  }
}

// 線クリック
const handleLineClick = (join: JoinClause) => {
  emit('edit-join', join)
}

// レイアウトリセット
const handleResetLayout = () => {
  // 全テーブルの位置をリセット
  props.tables.forEach((table, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    emit('update:table-position', table.alias, 50 + col * 250, 50 + row * 200)
  })
}

onMounted(() => {
  // 初回表示時に未配置のテーブルを自動配置
  props.tables.forEach((table, index) => {
    if (!props.tablePositions[table.alias]) {
      const col = index % 3
      const row = Math.floor(index / 3)
      emit('update:table-position', table.alias, 50 + col * 250, 50 + row * 200)
    }
  })
})
</script>

<template>
  <div class="h-full w-full bg-gray-50 dark:bg-gray-900 relative">
    <!-- ツールバー -->
    <div class="absolute top-4 right-4 z-10 flex gap-2">
      <UButton
        icon="i-heroicons-magnifying-glass-plus"
        size="xs"
        color="gray"
        variant="solid"
        @click="handleZoomIn"
      />
      <UButton
        icon="i-heroicons-magnifying-glass-minus"
        size="xs"
        color="gray"
        variant="solid"
        @click="handleZoomOut"
      />
      <UButton
        :label="`${zoom}%`"
        size="xs"
        color="gray"
        variant="solid"
        @click="handleZoomReset"
      />
      <UButton
        icon="i-heroicons-arrow-path"
        label="リセット"
        size="xs"
        color="gray"
        variant="solid"
        @click="handleZoomReset"
      />
      <UButton
        icon="i-heroicons-squares-2x2"
        label="レイアウトリセット"
        size="xs"
        color="gray"
        variant="soft"
        @click="handleResetLayout"
      />
    </div>

    <!-- キャンバス -->
    <svg
      ref="canvasRef"
      class="w-full h-full cursor-move"
      @mousedown="handlePanStart"
      @wheel="handleWheel"
    >
      <g :transform="svgTransform">
        <!-- グリッド（オプション） -->
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="gray"
              stroke-width="0.5"
              opacity="0.2"
            />
          </pattern>
        </defs>
        <rect width="5000" height="5000" fill="url(#grid)" />

        <!-- リレーション線 -->
        <g v-for="line in relationLines" :key="line.join.id">
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            stroke="currentColor"
            stroke-width="2"
            :stroke-dasharray="line.strokeDasharray"
            class="text-primary-500 hover:text-primary-600 cursor-pointer"
            @click="handleLineClick(line.join)"
          />
          <!-- 線の中央にJOIN種別を表示 -->
          <text
            :x="(line.x1 + line.x2) / 2"
            :y="(line.y1 + line.y2) / 2"
            text-anchor="middle"
            class="text-xs fill-gray-700 dark:fill-gray-300 pointer-events-none"
          >
            {{ line.join.type }}
          </text>
        </g>

        <!-- テーブルカード -->
        <g v-for="table in tables" :key="table.alias">
          <TableCardOnCanvas
            :table="table"
            :position="positions[table.alias]"
            :is-dragging="draggingAlias === table.alias"
            @drag-start="handleDragStart(table.alias, $event)"
          />
        </g>
      </g>
    </svg>
  </div>
</template>
```

---

### 2.3 TableCardOnCanvas.vue

**責務**: キャンバス上のテーブルカード（ドラッグ可能）

**Props**:
```typescript
interface Props {
  table: SelectedTable
  position: { x: number; y: number }
  isDragging: boolean
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'drag-start', event: MouseEvent): void
}
```

**実装例**:
```vue
<script setup lang="ts">
import type { SelectedTable } from '~/types/query-model'

interface Props {
  table: SelectedTable
  position: { x: number; y: number }
  isDragging: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'drag-start': [event: MouseEvent]
}>()

// カードサイズ
const CARD_WIDTH = 200
const CARD_HEIGHT = 150
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
    class="cursor-move"
    :class="{ 'opacity-50': isDragging }"
    @mousedown="emit('drag-start', $event)"
  >
    <!-- カード背景 -->
    <rect
      :width="CARD_WIDTH"
      :height="CARD_HEIGHT"
      rx="8"
      fill="white"
      stroke="currentColor"
      stroke-width="2"
      class="text-gray-300 dark:text-gray-600"
    />

    <!-- ヘッダー -->
    <rect
      :width="CARD_WIDTH"
      height="40"
      rx="8"
      fill="currentColor"
      class="text-primary-100 dark:text-primary-900"
    />

    <!-- テーブル名 -->
    <text
      :x="CARD_WIDTH / 2"
      y="20"
      text-anchor="middle"
      class="text-sm font-semibold fill-gray-900 dark:fill-gray-100"
    >
      {{ table.name }}
    </text>

    <!-- エイリアス -->
    <text
      :x="CARD_WIDTH / 2"
      y="35"
      text-anchor="middle"
      class="text-xs fill-gray-600 dark:fill-gray-400"
    >
      ({{ table.alias }})
    </text>

    <!-- カラム一覧（最大5件） -->
    <g v-for="(column, index) in table.columns.slice(0, 5)" :key="column.name">
      <text
        x="10"
        :y="60 + index * 20"
        class="text-xs fill-gray-700 dark:fill-gray-300"
      >
        • {{ column.name }}
      </text>
    </g>

    <!-- 省略表示 -->
    <text
      v-if="table.columns.length > 5"
      x="10"
      :y="60 + 5 * 20"
      class="text-xs fill-gray-500 dark:fill-gray-500"
    >
      ... 他{{ table.columns.length - 5 }}件
    </text>
  </g>
</template>
```

---

## 3. ストア設計（query-builder.ts）

### 3.1 追加する状態

```typescript
/**
 * テーブル位置（キャンバス表示用）
 */
tablePositions: {} as { [tableAlias: string]: { x: number; y: number } },
```

### 3.2 追加するアクション

```typescript
/**
 * テーブル位置を更新
 */
updateTablePosition(alias: string, x: number, y: number) {
  this.tablePositions[alias] = { x, y }
  // 位置変更はSQL再生成不要
},

/**
 * テーブル位置をリセット
 */
resetTablePositions() {
  this.tablePositions = {}
},

/**
 * テーブル削除時に位置情報も削除
 */
removeTable(tableId: string) {
  const removedTable = this.selectedTables.find(t => t.id === tableId)
  if (removedTable) {
    // 既存のロジック
    this.selectedTables = this.selectedTables.filter(t => t.id !== tableId)
    this.joins = this.joins.filter(j => j.table.alias !== removedTable.alias)

    // 位置情報も削除（追加）
    delete this.tablePositions[removedTable.alias]
  }

  this.regenerateSql()
},
```

### 3.3 QueryModel生成時に位置情報を含める

```typescript
/**
 * QueryModelを生成（保存用）
 */
toQueryModel(): QueryModel {
  return {
    // ... 既存のプロパティ ...
    tablePositions: this.tablePositions, // 追加
  }
}

/**
 * QueryModelから復元
 */
loadFromQueryModel(model: QueryModel) {
  // ... 既存のロジック ...
  this.tablePositions = model.tablePositions || {}
}
```

---

## 4. データフロー

### 4.1 テーブルドラッグフロー

```
User: テーブルカードをドラッグ
  ↓
TableCardOnCanvas.vue: emit('drag-start', event)
  ↓
TableCanvas.vue: handleDragStart()
  ↓
User: マウス移動
  ↓
TableCanvas.vue: handleDragMove()
  ↓
TableCanvas.vue: emit('update:table-position', alias, x, y)
  ↓
JoinPanel.vue: queryBuilderStore.updateTablePosition(alias, x, y)
  ↓
query-builder.ts: tablePositions[alias] = { x, y }
  ↓
TableCanvas.vue: positions computed更新
  ↓
TableCardOnCanvas.vue: 位置が更新される
```

### 4.2 線クリックでJOIN編集フロー

```
User: リレーション線をクリック
  ↓
TableCanvas.vue: handleLineClick(join)
  ↓
TableCanvas.vue: emit('edit-join', join)
  ↓
JoinPanel.vue: handleEditJoinFromCanvas(join)
  ↓
JoinPanel.vue: editingJoin = join; isDialogOpen = true
  ↓
JoinConfigDialog.vue: ダイアログ表示
  ↓
User: JOIN設定を変更
  ↓
JoinConfigDialog.vue: emit('save', updatedJoin)
  ↓
JoinPanel.vue: queryBuilderStore.updateJoin(id, updates)
  ↓
query-builder.ts: joins配列を更新、SQL再生成
  ↓
TableCanvas.vue: joins props更新
  ↓
TableCanvas.vue: relationLines computed更新
  ↓
線の表示が更新される
```

---

## 5. パフォーマンス最適化

### 5.1 SVG要素数の制限

- テーブル数: 最大20個
- JOIN数: 最大50個
- これを超える場合は警告を表示

### 5.2 requestAnimationFrame

ドラッグ操作時は`requestAnimationFrame`を使用して滑らかに描画：

```typescript
const handleDragMove = (event: MouseEvent) => {
  if (!draggingAlias.value) return

  requestAnimationFrame(() => {
    const dx = (event.clientX - dragStartX.value) / (zoom.value / 100)
    const dy = (event.clientY - dragStartY.value) / (zoom.value / 100)

    const newX = Math.max(0, dragOffsetX.value + dx)
    const newY = Math.max(0, dragOffsetY.value + dy)

    emit('update:table-position', draggingAlias.value!, newX, newY)
  })
}
```

### 5.3 debounce（位置保存）

位置保存はdebounceして頻繁な保存を避ける：

```typescript
import { useDebounceFn } from '@vueuse/core'

const debouncedSavePosition = useDebounceFn((alias: string, x: number, y: number) => {
  emit('update:table-position', alias, x, y)
}, 300)
```

---

## 6. アクセシビリティ

### 6.1 キーボード操作

- テーブルカードをフォーカス可能にする（`tabindex="0"`）
- 矢印キーで位置調整（10pxずつ移動）

```vue
<g
  :tabindex="0"
  @keydown.arrow-up.prevent="moveTable(table.alias, 0, -10)"
  @keydown.arrow-down.prevent="moveTable(table.alias, 0, 10)"
  @keydown.arrow-left.prevent="moveTable(table.alias, -10, 0)"
  @keydown.arrow-right.prevent="moveTable(table.alias, 10, 0)"
>
  <!-- ... -->
</g>
```

### 6.2 ARIA属性

```vue
<svg
  role="img"
  aria-label="テーブル関係図"
>
  <g
    role="group"
    :aria-label="`テーブル ${table.name}`"
  >
    <!-- ... -->
  </g>
</svg>
```

---

## 7. テストコード

### 7.1 単体テスト（TableCanvas.vue）

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableCanvas from '~/components/query-builder/TableCanvas.vue'

describe('TableCanvas', () => {
  it('テーブルを正しい位置に表示する', () => {
    const wrapper = mount(TableCanvas, {
      props: {
        tables: [
          { id: '1', alias: 't1', name: 'users', columns: [] },
        ],
        joins: [],
        tablePositions: { t1: { x: 100, y: 200 } },
      },
    })

    // アサーション: transformが正しいか
  })

  it('ドラッグでテーブル位置が更新される', async () => {
    const wrapper = mount(TableCanvas, {
      props: {
        tables: [
          { id: '1', alias: 't1', name: 'users', columns: [] },
        ],
        joins: [],
        tablePositions: { t1: { x: 100, y: 200 } },
      },
    })

    // ドラッグイベントをシミュレート
    // update:table-positionイベントが発火することを確認
  })

  it('線をクリックするとedit-joinイベントが発火する', async () => {
    const join = {
      id: 'join-1',
      type: 'INNER',
      table: { schema: 'public', name: 'orders', alias: 'o' },
      conditions: [],
      conditionLogic: 'AND',
    }

    const wrapper = mount(TableCanvas, {
      props: {
        tables: [
          { id: '1', alias: 't1', name: 'users', columns: [] },
          { id: '2', alias: 'o', name: 'orders', columns: [] },
        ],
        joins: [join],
        tablePositions: { t1: { x: 100, y: 100 }, o: { x: 300, y: 100 } },
      },
    })

    // 線をクリック
    // edit-joinイベントが発火することを確認
  })
})
```

---

## 8. 実装順序

1. **TableCardOnCanvas.vue** (6B.1)
   - ドラッグ可能なテーブルカード
   - 単体テスト実装

2. **TableCanvas.vue - 基本描画** (6B.1)
   - テーブル表示のみ（線なし）
   - ドラッグ&ドロップ機能

3. **TableCanvas.vue - リレーション線** (6B.3)
   - JOIN関係を線で表示
   - 線クリックでイベント発火

4. **TableCanvas.vue - ズーム・パン** (6B.4)
   - マウスホイールズーム
   - 中ボタンパン

5. **query-builderストアにテーブル位置管理追加** (6B.2)
   - updateTablePosition/resetTablePositionsアクション
   - QueryModel拡張

6. **JoinPanel.vueへのタブ統合** (6B.5)
   - リスト表示/キャンバス表示のタブ切り替え
   - ダイアログとの連携

7. **総合テスト**
   - 実際にテーブルをドラッグして配置できることを確認
   - 線をクリックしてJOIN編集できることを確認
   - 位置が保存・復元されることを確認

---

## 9. マイルストーン

| マイルストーン | 成果物 | 完了条件 |
|--------------|--------|---------|
| MS1 | TableCardOnCanvas | ドラッグ可能なテーブルカード |
| MS2 | TableCanvas基本描画 | テーブル表示とドラッグ&ドロップ |
| MS3 | リレーション線描画 | JOIN関係が線で表示される |
| MS4 | ズーム・パン | マウス操作で拡大縮小・移動可能 |
| MS5 | ストア統合 | 位置情報の保存・復元 |
| MS6 | UI統合 | タブ切り替えで表示モード変更可能 |
| MS7 | Phase 6B完了 | 全ての完了条件を満たす |

---

## 10. 完了条件（再掲）

- ✅ キャンバス上でテーブルをドラッグ配置できる
- ✅ JOIN関係が線で可視化される
- ✅ 線をクリックしてJOIN設定を編集できる
- ✅ テーブル位置が保存される
- ✅ ズーム・パン操作が可能
- ✅ 10テーブル、20JOINでもスムーズに動作する
