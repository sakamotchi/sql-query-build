# Phase 6B: JOIN設定UI拡張（ビジュアル表現） - 設計書

**作成日**: 2025-12-31
**フェーズ**: 6B

---

## 1. アーキテクチャ概要

**既存のTableRelationAreaを拡張する方式**

```
┌─────────────────────────────────────────────────────────┐
│ QueryBuilderLayout.vue (既存)                           │
│  ├─ LeftPanel (DB Tree)                                │
│  ├─ CenterPanel                                         │
│  │   └─ TableRelationArea.vue ★拡張対象                │
│  └─ RightPanel (SQL Preview)                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ TableRelationArea.vue (既存コンポーネントを拡張)        │
│  ├─ TableCard.vue x N (既存・ドラッグ可能)             │
│  ├─ SVGレイヤー (新規追加)                              │
│  │   └─ RelationLine.vue x N (JOIN線)                 │
│  ├─ JoinToolbar (新規・右上浮遊)                        │
│  │   ├─ [+ JOIN追加]                                   │
│  │   ├─ [ズーム]                                       │
│  │   └─ [リセット]                                     │
│  └─ JoinConfigDialog (Phase 6A実装済み)                │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ query-builder.ts (Pinia Store)                          │
│  - tablePositions: { [id]: { x, y } } (既存)            │
│  - joins: JoinClause[] (Phase 6A実装済み)               │
│  - updateTablePosition() (既存)                         │
│  - addJoin/updateJoin/removeJoin (Phase 6A実装済み)     │
└─────────────────────────────────────────────────────────┘
```

**変更のポイント**:
- ❌ 新規コンポーネント（TableCanvas.vue）は作成しない
- ✅ 既存のTableRelationArea.vueにSVGレイヤーを追加
- ✅ 既存のtablePositions、TableCardを活用
- ✅ Phase 6Aで実装済みのJoinConfigDialogを再利用

---

## 2. コンポーネント設計

### 2.1 TableRelationArea.vue（拡張）

**責務**: テーブル選択エリアにJOIN可視化機能を追加

既存のTableRelationArea.vueは以下を既に持っています：
- ✅ `tablePositions` - テーブル位置管理
- ✅ `TableCard` - ドラッグ可能なテーブルカード
- ✅ `handleTableMove` - 位置更新ロジック
- ✅ Phase 6B用のコメントアウトコード（8, 9, 18, 27-29, 118-135, 172-189行目）

**追加する要素**:
1. SVGレイヤー（JOIN線描画用）
2. JoinToolbar（右上浮遊）
3. JoinConfigDialogの有効化（コメントアウト解除）

**実装例**:
```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useTableSelection } from '@/composables/useTableSelection'
import TableCard from './table/TableCard.vue'
import DropZone from './table/DropZone.vue'
import RelationLine from './RelationLine.vue' // 新規追加
import JoinConfigDialog from './dialog/JoinConfigDialog.vue' // コメントアウト解除
import type { Table } from '@/types/database-structure'
import type { JoinClause } from '@/types/query-model' // コメントアウト解除

const queryBuilderStore = useQueryBuilderStore()
const { addTable: addTableToStore } = useTableSelection()

// 選択されたテーブル一覧（既存）
const selectedTables = computed(() => queryBuilderStore.selectedTables)
const joins = computed(() => queryBuilderStore.joins) // コメントアウト解除

// テーブルカードの位置（既存）
const tablePositions = ref<Record<string, { x: number; y: number }>>({})

// ズーム・パン状態（新規追加）
const zoom = ref(100) // 50 ~ 200
const panX = ref(0)
const panY = ref(0)

// JOIN dialog state（コメントアウト解除）
const isJoinDialogOpen = ref(false)
const editingJoin = ref<JoinClause | undefined>(undefined)

// 既存のロジック（省略）...

// 新規追加: JOIN関連メソッド
const openJoinDialog = (join?: JoinClause) => {
  editingJoin.value = join
  isJoinDialogOpen.value = true
}

const handleSaveJoin = (join: any) => {
  if (join.id) {
    const { id, ...updates } = join
    queryBuilderStore.updateJoin(id, updates)
  } else {
    queryBuilderStore.addJoin(join)
  }
}

const removeJoin = (id: string) => {
  queryBuilderStore.removeJoin(id)
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

// SVG transform
const svgTransform = computed(() => {
  return `translate(${panX.value}, ${panY.value}) scale(${zoom.value / 100})`
})

// リレーション線の計算
const relationLines = computed(() => {
  if (selectedTables.value.length < 2) return []

  return joins.value.map(join => {
    // FROMテーブルは常に最初のテーブル
    const fromTable = selectedTables.value[0]
    const toTable = selectedTables.value.find(t => t.alias === join.table.alias)

    if (!fromTable || !toTable) return null

    const fromPos = tablePositions.value[fromTable.id]
    const toPos = tablePositions.value[toTable.id]

    if (!fromPos || !toPos) return null

    // カード中央から接続（カード幅200、高さ150と仮定）
    const x1 = fromPos.x + 100
    const y1 = fromPos.y + 75
    const x2 = toPos.x + 100
    const y2 = toPos.y + 75

    return {
      join,
      x1,
      y1,
      x2,
      y2,
    }
  }).filter(Boolean)
})
</script>

<template>
  <div
    id="query-builder-canvas"
    ref="containerRef"
    class="relative h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950"
  >
    <!-- JOINツールバー（新規追加） -->
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
      <!-- SVGレイヤー（JOIN線描画・新規追加） -->
      <svg
        v-if="selectedTables.length >= 2"
        class="absolute inset-0 pointer-events-none z-10"
        :view-box="`0 0 ${containerRef?.clientWidth || 1000} ${containerRef?.clientHeight || 800}`"
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
            class="pointer-events-auto cursor-pointer"
            @click="openJoinDialog(line.join)"
          />
        </g>
      </svg>

      <!-- 空状態（既存） -->
      <DropZone v-if="selectedTables.length === 0" />

      <!-- テーブルカード（既存） -->
      <template v-else>
        <TableCard
          v-for="table in selectedTables"
          :key="table.id"
          :table="table"
          :position="tablePositions[table.id] || { x: 50, y: 50 }"
          :style="{ transform: `scale(${zoom / 100})` }"
          @remove="removeTable"
          @update-alias="updateAlias"
          @move="handleTableMove"
        />
      </template>

      <!-- ドロップヒント（既存） -->
      <div
        v-if="selectedTables.length > 0"
        class="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded shadow-sm opacity-70 pointer-events-none"
      >
        <UIcon name="i-heroicons-plus" class="w-3 h-3" />
        テーブルをドロップして追加
      </div>
    </div>

    <!-- JOIN Dialog（コメントアウト解除） -->
    <JoinConfigDialog
      v-model="isJoinDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    />
  </div>
</template>
```

---

### 2.2 RelationLine.vue（新規）

**責務**: SVG線でJOIN関係を描画する

**Props**:
```typescript
interface Props {
  join: JoinClause
  x1: number
  y1: number
  x2: number
  y2: number
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'click'): void
}
```

**実装例**:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { JoinClause } from '~/types/query-model'

interface Props {
  join: JoinClause
  x1: number
  y1: number
  x2: number
  y2: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

// JOIN種別に応じた線のスタイル
const strokeDasharray = computed(() => {
  switch (props.join.type) {
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
})

// 線の中央座標
const midX = computed(() => (props.x1 + props.x2) / 2)
const midY = computed(() => (props.y1 + props.y2) / 2)
</script>

<template>
  <g @click.stop="emit('click')">
    <!-- JOIN線 -->
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="currentColor"
      stroke-width="2"
      :stroke-dasharray="strokeDasharray"
      class="text-primary-500 hover:text-primary-600 transition-colors cursor-pointer"
    />

    <!-- JOIN種別ラベル -->
    <text
      :x="midX"
      :y="midY - 5"
      text-anchor="middle"
      class="text-xs font-medium fill-gray-700 dark:fill-gray-300 pointer-events-none select-none"
    >
      {{ join.type }}
    </text>
  </g>
</template>
```

---


- **Props**: `table`, `position`
- **既存機能**: ドラッグ&ドロップ、エイリアス編集、削除
- **参照**: [app/components/query-builder/table/TableCard.vue](app/components/query-builder/table/TableCard.vue)

---

## 3. ストア設計（query-builder.ts）

**変更不要** - 既存の実装をそのまま使用

既存のquery-builder.tsは以下を既に持っています：
- ✅ `tablePositions: { [id]: { x, y } }` - テーブル位置管理
- ✅ `joins: JoinClause[]` - JOIN設定（Phase 6A実装済み）
- ✅ `updateTablePosition(id, x, y)` - 位置更新
- ✅ `addJoin/updateJoin/removeJoin` - JOIN管理（Phase 6A実装済み）

**Phase 6Bで追加する必要はありません。**

---

## 4. データフロー

### 4.1 JOIN線クリックでJOIN編集フロー

```
User: リレーション線をクリック
  ↓
RelationLine.vue: emit('click')
  ↓
TableRelationArea.vue: openJoinDialog(join)
  ↓
TableRelationArea.vue: isJoinDialogOpen = true, editingJoin = join
  ↓
JoinConfigDialog.vue: ダイアログ表示
  ↓
User: JOIN設定を変更
  ↓
JoinConfigDialog.vue: emit('save', updatedJoin)
  ↓
TableRelationArea.vue: handleSaveJoin()
  ↓
query-builder.ts: updateJoin(id, updates)
  ↓
query-builder.ts: joins配列更新、SQL再生成
  ↓
TableRelationArea.vue: relationLines computed更新
  ↓
RelationLine.vue: 線の表示が更新される
```

### 4.2 ズーム操作フロー

```
User: ズームインボタンをクリック
  ↓
TableRelationArea.vue: handleZoomIn()
  ↓
zoom.value += 10
  ↓
svgTransform computed更新
  ↓
SVGレイヤー: transform属性更新
  ↓
画面上のすべての線が拡大される
```

---

## 5. パフォーマンス最適化

### 5.1 SVG要素数の制限

- テーブル数: 最大20個
- JOIN数: 最大50個
- これを超える場合は警告を表示

### 5.2 既存の最適化を活用

TableCard.vueは既にドラッグ操作が最適化されているため、追加の最適化は不要。

---

## 6. アクセシビリティ

### 6.1 ARIA属性

SVGレイヤーに以下を追加：

```vue
<svg
  role="img"
  aria-label="テーブル関係図"
  class="absolute inset-0 pointer-events-none z-10"
>
  <!-- ... -->
</svg>
```

### 6.2 キーボード操作

TableCard.vueが既にキーボード操作対応済み（既存機能を活用）

---

## 7. 実装順序

1. **RelationLine.vueコンポーネント作成** (6B.1)
   - SVG線描画
   - クリックイベント
   - 単体テスト

2. **TableRelationArea.vueの拡張** (6B.2)
   - コメントアウトコードの有効化
   - SVGレイヤー追加
   - relationLines computed実装
   - ズーム機能追加

3. **JOINツールバーUI追加** (6B.3)
   - [+ JOIN追加]ボタン
   - ズームボタン

4. **総合テスト** (6B.4)
   - 線クリックでJOIN編集
   - ズーム操作
   - テーブル位置保存・復元

---

## 8. マイルストーン

| マイルストーン | 成果物 | 完了条件 |
|--------------|--------|---------|
| MS1 | RelationLine.vue | JOIN線が表示される |
| MS2 | TableRelationArea拡張 | 線クリックでダイアログが開く |
| MS3 | ズーム機能 | ズームイン・アウトが動作する |
| MS4 | Phase 6B完了 | 全ての完了条件を満たす |

---

## 9. 完了条件（再掲）

- ✅ キャンバス上でテーブルをドラッグ配置できる（既存機能）
- ✅ JOIN関係が線で可視化される
- ✅ 線をクリックしてJOIN設定を編集できる
- ✅ テーブル位置が保存される（既存機能）
- ✅ ズーム操作が可能
- ✅ 10テーブル、20JOINでもスムーズに動作する
