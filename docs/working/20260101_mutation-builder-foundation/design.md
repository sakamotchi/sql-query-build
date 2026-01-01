# 設計書: データ変更クエリビルダー共通基盤（8.1）

## アーキテクチャ概要

### ディレクトリ構造

```
app/
├── pages/
│   ├── index.vue (更新)
│   ├── query-builder.vue (既存、変更なし)
│   └── mutation-builder.vue (新規)
├── components/
│   ├── query-builder/ (既存、変更なし)
│   │   ├── QueryBuilderLayout.vue
│   │   ├── DatabaseTree.vue
│   │   └── where/WhereTab.vue
│   └── mutation-builder/ (新規)
│       ├── MutationBuilderLayout.vue
│       ├── MutationBuilderToolbar.vue
│       ├── LeftPanel.vue
│       ├── CenterPanel.vue
│       └── RightPanel.vue
├── stores/
│   ├── query-builder.ts (既存、変更なし)
│   └── mutation-builder.ts (新規)
└── types/
    ├── query.ts (既存、変更なし)
    └── mutation-query.ts (新規)
```

### データフロー

```
User Action (タブクリック)
    ↓
MutationBuilderToolbar
    ↓
mutation-builder ストア (setMutationType)
    ↓
MutationBuilderLayout (watch mutationType)
    ↓
RightPanel (動的コンポーネント切り替え)
```

---

## 詳細設計

### 1. 型定義（mutation-query.ts）

#### 1.1 クエリ種別型

```typescript
/**
 * データ変更クエリの種別
 */
export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE'
```

#### 1.2 INSERT用モデル

```typescript
/**
 * INSERT クエリモデル
 */
export interface InsertQueryModel {
  /** クエリ種別 */
  type: 'INSERT'
  /** 挿入先テーブル名 */
  table: string
  /** 挿入するカラム名の配列 */
  columns: string[]
  /** 挿入する値の配列（複数行対応） */
  values: Array<Record<string, any>>
}
```

#### 1.3 UPDATE用モデル

```typescript
/**
 * UPDATE クエリモデル
 */
export interface UpdateQueryModel {
  /** クエリ種別 */
  type: 'UPDATE'
  /** 更新対象テーブル名 */
  table: string
  /** SET句（カラム=値のペア） */
  setClause: Array<{
    column: string
    value: any
  }>
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | ConditionGroup>
}
```

#### 1.4 DELETE用モデル

```typescript
/**
 * DELETE クエリモデル
 */
export interface DeleteQueryModel {
  /** クエリ種別 */
  type: 'DELETE'
  /** 削除対象テーブル名 */
  table: string
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | ConditionGroup>
}
```

#### 1.5 ユニオン型

```typescript
/**
 * データ変更クエリモデル（ユニオン型）
 */
export type MutationQueryModel =
  | InsertQueryModel
  | UpdateQueryModel
  | DeleteQueryModel
```

**NOTE**: `WhereCondition` と `ConditionGroup` は既存の `types/query.ts` から再エクスポート

---

### 2. Piniaストア（mutation-builder.ts）

#### 2.1 State

```typescript
interface MutationBuilderState {
  /** 現在のクエリ種別 */
  mutationType: MutationType

  /** 選択中のテーブル名 */
  selectedTable: string | null

  /** 現在のクエリモデル */
  queryModel: MutationQueryModel | null

  /** 生成されたSQL */
  generatedSql: string

  /** SQL生成中フラグ */
  isGeneratingSql: boolean

  /** SQL生成エラー */
  sqlGenerationError: string | null

  /** 実行中フラグ */
  isExecuting: boolean

  /** クエリ実行エラー */
  queryError: QueryExecuteError | null

  /** クエリ情報 */
  queryInfo: {
    affectedRows: number | null
    executionTime: number | null
    lastExecutedAt: string | null
  }
}
```

#### 2.2 Getters

```typescript
getters: {
  /**
   * クエリが実行可能かどうか
   */
  canExecuteQuery(state): boolean {
    return (
      state.selectedTable !== null &&
      state.queryModel !== null &&
      !state.isGeneratingSql &&
      !state.isExecuting
    )
  },

  /**
   * WHERE句が設定されているかどうか（UPDATE/DELETEのみ）
   */
  hasWhereConditions(state): boolean {
    if (state.queryModel?.type === 'UPDATE' || state.queryModel?.type === 'DELETE') {
      return state.queryModel.whereConditions.length > 0
    }
    return true // INSERTはWHERE句不要なのでtrue
  }
}
```

#### 2.3 Actions

```typescript
actions: {
  /**
   * クエリ種別を変更
   */
  setMutationType(type: MutationType): void {
    this.mutationType = type
    this.resetQueryModel()
  },

  /**
   * テーブルを選択
   */
  setSelectedTable(table: string): void {
    this.selectedTable = table
    this.resetQueryModel()
  },

  /**
   * クエリモデルをリセット
   */
  resetQueryModel(): void {
    if (!this.selectedTable) {
      this.queryModel = null
      return
    }

    // クエリ種別に応じた空のモデルを作成
    switch (this.mutationType) {
      case 'INSERT':
        this.queryModel = {
          type: 'INSERT',
          table: this.selectedTable,
          columns: [],
          values: []
        }
        break
      case 'UPDATE':
        this.queryModel = {
          type: 'UPDATE',
          table: this.selectedTable,
          setClause: [],
          whereConditions: []
        }
        break
      case 'DELETE':
        this.queryModel = {
          type: 'DELETE',
          table: this.selectedTable,
          whereConditions: []
        }
        break
    }
  },

  /**
   * 状態を完全にリセット
   */
  resetState(): void {
    this.$reset()
  }
}
```

---

### 3. ページ（mutation-builder.vue）

```vue
<script setup lang="ts">
import MutationBuilderLayout from '@/components/mutation-builder/MutationBuilderLayout.vue'

// ページメタデータ
definePageMeta({
  title: 'データ変更',
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <MutationBuilderLayout />
  </div>
</template>
```

---

### 4. レイアウト（MutationBuilderLayout.vue）

#### 4.1 構造

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MutationBuilderToolbar from './MutationBuilderToolbar.vue'
import LeftPanel from './LeftPanel.vue'
import CenterPanel from './CenterPanel.vue'
import RightPanel from './RightPanel.vue'
import ResizablePanel from '@/components/query-builder/ResizablePanel.vue'

// パネルサイズ
const leftPanelWidth = ref(250)
const rightPanelWidth = ref(350)

// パネル表示状態
const isLeftPanelCollapsed = ref(false)
const isRightPanelCollapsed = ref(false)

// パネルサイズ制約
const panelConstraints = {
  left: { min: 200, max: 400 },
  right: { min: 280, max: 500 },
}

const handleLeftPanelResize = (width: number) => {
  leftPanelWidth.value = Math.max(
    panelConstraints.left.min,
    Math.min(panelConstraints.left.max, width)
  )
}

const handleRightPanelResize = (width: number) => {
  rightPanelWidth.value = Math.max(
    panelConstraints.right.min,
    Math.min(panelConstraints.right.max, width)
  )
}

const toggleLeftPanel = () => {
  isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value
}

const toggleRightPanel = () => {
  isRightPanelCollapsed.value = !isRightPanelCollapsed.value
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
    <!-- ツールバー -->
    <MutationBuilderToolbar />

    <!-- メインコンテンツ（3ペイン） -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左パネル -->
      <ResizablePanel
        v-if="!isLeftPanelCollapsed"
        :width="leftPanelWidth"
        :min-width="panelConstraints.left.min"
        :max-width="panelConstraints.left.max"
        position="left"
        @resize="handleLeftPanelResize"
      >
        <LeftPanel />
      </ResizablePanel>

      <!-- 中央パネル -->
      <div class="flex-1 overflow-hidden">
        <CenterPanel />
      </div>

      <!-- 右パネル -->
      <ResizablePanel
        v-if="!isRightPanelCollapsed"
        :width="rightPanelWidth"
        :min-width="panelConstraints.right.min"
        :max-width="panelConstraints.right.max"
        position="right"
        @resize="handleRightPanelResize"
      >
        <RightPanel />
      </ResizablePanel>
    </div>
  </div>
</template>
```

---

### 5. ツールバー（MutationBuilderToolbar.vue）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import type { MutationType } from '@/types/mutation-query'

const store = useMutationBuilderStore()

const mutationType = computed(() => store.mutationType)

const handleMutationTypeChange = (type: MutationType) => {
  store.setMutationType(type)
}

const handleExecute = () => {
  // 8.2-8.4で実装
  console.log('Execute query')
}

const handleSave = () => {
  // 8.5で実装
  console.log('Save query')
}

const handleHistory = () => {
  // 8.5で実装
  console.log('Show history')
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <!-- 左側: クエリ種別切り替え -->
    <div class="flex items-center gap-3">
      <UButtonGroup>
        <UButton
          :color="mutationType === 'INSERT' ? 'primary' : 'neutral'"
          variant="ghost"
          @click="handleMutationTypeChange('INSERT')"
        >
          INSERT
        </UButton>
        <UButton
          :color="mutationType === 'UPDATE' ? 'primary' : 'neutral'"
          variant="ghost"
          @click="handleMutationTypeChange('UPDATE')"
        >
          UPDATE
        </UButton>
        <UButton
          :color="mutationType === 'DELETE' ? 'primary' : 'neutral'"
          variant="ghost"
          @click="handleMutationTypeChange('DELETE')"
        >
          DELETE
        </UButton>
      </UButtonGroup>
    </div>

    <!-- 右側: アクションボタン -->
    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-play"
        color="primary"
        :disabled="!store.canExecuteQuery"
        @click="handleExecute"
      >
        実行
      </UButton>
      <UButton
        icon="i-heroicons-bookmark"
        color="gray"
        variant="ghost"
        @click="handleSave"
      >
        保存
      </UButton>
      <UButton
        icon="i-heroicons-clock"
        color="gray"
        variant="ghost"
        @click="handleHistory"
      >
        履歴
      </UButton>
      <UDivider orientation="vertical" class="h-6" />
      <UButton
        icon="i-heroicons-arrow-left"
        color="gray"
        variant="ghost"
        to="/query-builder"
      >
        クエリビルダーへ
      </UButton>
    </div>
  </div>
</template>
```

---

### 6. 左パネル（LeftPanel.vue）

```vue
<script setup lang="ts">
import DatabaseTree from '@/components/query-builder/DatabaseTree.vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

const store = useMutationBuilderStore()

const handleTableSelect = (tableName: string) => {
  store.setSelectedTable(tableName)
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">データベース</span>
    </div>
    <div class="flex-1 overflow-auto">
      <DatabaseTree @table-select="handleTableSelect" />
    </div>
  </div>
</template>
```

---

### 7. 中央パネル（CenterPanel.vue）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import SqlPreview from '@/components/query-builder/SqlPreview.vue'

const store = useMutationBuilderStore()

const generatedSql = computed(() => store.generatedSql)
const queryInfo = computed(() => store.queryInfo)
const hasWhereConditions = computed(() => store.hasWhereConditions)
const mutationType = computed(() => store.mutationType)

const showWarning = computed(() => {
  return (mutationType.value === 'UPDATE' || mutationType.value === 'DELETE')
    && !hasWhereConditions.value
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- SQLプレビュー -->
    <div class="flex flex-col flex-1 min-h-[200px] overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">SQLプレビュー</span>
      </div>

      <!-- WHERE句なし警告 -->
      <div v-if="showWarning" class="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 p-3">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-semibold text-red-900 dark:text-red-100">
              {{ mutationType === 'DELETE' ? '🚨 重大な警告' : '⚠️ 警告' }}
            </p>
            <p class="text-sm text-red-700 dark:text-red-300 mt-1">
              WHERE句がありません。このクエリは全ての行を{{ mutationType === 'DELETE' ? '削除' : '更新' }}します。
            </p>
          </div>
        </div>
      </div>

      <SqlPreview :sql="generatedSql" />
    </div>

    <!-- クエリ情報 -->
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">クエリ情報</span>
      </div>
      <div class="p-3 text-sm text-gray-600 dark:text-gray-400">
        <div v-if="queryInfo.affectedRows !== null">
          影響行数: {{ queryInfo.affectedRows }}行
        </div>
        <div v-if="queryInfo.executionTime !== null">
          実行時間: {{ queryInfo.executionTime.toFixed(3) }}秒
        </div>
        <div v-if="!queryInfo.affectedRows && !queryInfo.executionTime">
          クエリを実行してください
        </div>
      </div>
    </div>
  </div>
</template>
```

---

### 8. 右パネル（RightPanel.vue）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

const store = useMutationBuilderStore()

const mutationType = computed(() => store.mutationType)
const selectedTable = computed(() => store.selectedTable)
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">{{ mutationType }} 設定</span>
    </div>

    <div class="flex-1 overflow-auto p-4">
      <!-- テーブル未選択 -->
      <div v-if="!selectedTable" class="text-center text-gray-500 dark:text-gray-400 mt-8">
        <UIcon name="i-heroicons-table-cells" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p class="text-sm">左側のツリーからテーブルを選択してください</p>
      </div>

      <!-- テーブル選択済み（8.2-8.4で各パネルを実装） -->
      <div v-else class="space-y-4">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          テーブル: <span class="font-medium text-gray-900 dark:text-gray-100">{{ selectedTable }}</span>
        </div>

        <!-- INSERT/UPDATE/DELETEパネルは8.2-8.4で実装 -->
        <div class="text-center text-gray-500 dark:text-gray-400 mt-8">
          <p class="text-sm">{{ mutationType }}パネルは次のタスクで実装します</p>
        </div>
      </div>
    </div>
  </div>
</template>
```

---

### 9. ナビゲーション追加（index.vue更新）

既存の`app/pages/index.vue`に「データ変更」カードを追加します。

```vue
<!-- 既存のカードに追加 -->
<UCard
  title="データ変更"
  description="INSERT/UPDATE/DELETE文を構築・実行"
  icon="i-heroicons-pencil-square"
  to="/mutation-builder"
  class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
/>
```

---

## テストコード

### 10.1 Piniaストアのテスト

```typescript
// tests/stores/mutation-builder.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('useMutationBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with INSERT type', () => {
    const store = useMutationBuilderStore()
    expect(store.mutationType).toBe('INSERT')
    expect(store.selectedTable).toBeNull()
    expect(store.queryModel).toBeNull()
  })

  it('should change mutation type', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    expect(store.mutationType).toBe('UPDATE')
  })

  it('should select table and create query model', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')

    expect(store.selectedTable).toBe('users')
    expect(store.queryModel).toEqual({
      type: 'INSERT',
      table: 'users',
      columns: [],
      values: []
    })
  })

  it('should reset query model when changing mutation type', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')

    store.setMutationType('UPDATE')

    expect(store.queryModel).toEqual({
      type: 'UPDATE',
      table: 'users',
      setClause: [],
      whereConditions: []
    })
  })

  it('should detect WHERE conditions for UPDATE', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.setSelectedTable('users')

    expect(store.hasWhereConditions).toBe(false)

    // WHERE条件を追加（8.3で実装）
    // store.queryModel.whereConditions.push(...)
    // expect(store.hasWhereConditions).toBe(true)
  })
})
```

---

## 実装順序

1. **型定義作成** (`mutation-query.ts`)
2. **Piniaストア作成** (`mutation-builder.ts`)
3. **ページ作成** (`mutation-builder.vue`)
4. **レイアウト作成** (`MutationBuilderLayout.vue`)
5. **ツールバー作成** (`MutationBuilderToolbar.vue`)
6. **左パネル作成** (`LeftPanel.vue`)
7. **中央パネル作成** (`CenterPanel.vue`)
8. **右パネル作成** (`RightPanel.vue`)
9. **ナビゲーション追加** (`index.vue`更新)
10. **動作確認**

---

## 注意点

- 既存の`query-builder`関連ファイルは一切変更しない
- `DatabaseTree`コンポーネントはそのまま再利用（props/emitsの確認が必要）
- `ResizablePanel`コンポーネントも再利用
- SQL生成ロジックは8.2-8.4で実装するため、現時点では空文字列
- クエリ実行機能も8.2-8.4で実装

---

## 完了確認チェックリスト

- [ ] `/mutation-builder` にアクセスできる
- [ ] INSERT/UPDATE/DELETEタブが表示される
- [ ] タブをクリックすると切り替わる
- [ ] 左パネルにDatabaseTreeが表示される
- [ ] 左パネルでテーブルをクリックすると選択される
- [ ] 中央パネルにSQLプレビューエリアが表示される
- [ ] 右パネルにテーブル選択状態が表示される
- [ ] トップページに「データ変更」カードが表示される
- [ ] 「データ変更」カードをクリックすると`/mutation-builder`に遷移する
- [ ] 既存の`/query-builder`が正常に動作する
- [ ] TypeScript型エラーがない
- [ ] `npm run tauri:dev`でアプリが起動する
