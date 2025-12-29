# 設計書: 確認ダイアログ

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.2 確認ダイアログ

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QueryBuilderToolbar.vue                            │   │
│  │  - 実行ボタンクリック                                 │   │
│  │  - analysisResult.riskLevel判定                     │   │
│  │  - ダイアログ表示制御                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DangerousQueryDialog.vue                           │   │
│  │  - 確認ダイアログUI                                   │   │
│  │  - 遅延実行ボタン（カウントダウン）                      │   │
│  │  - 危険度・影響範囲表示                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  query-builder.ts (store)                           │   │
│  │  - executeQuery() 呼び出し                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. コンポーネント設計

### 2.1 ディレクトリ構造

```
app/components/query-builder/
├── dialog/
│   └── DangerousQueryDialog.vue   # 新規作成
└── QueryBuilderToolbar.vue        # 変更
```

### 2.2 DangerousQueryDialog.vue

**ファイル**: `app/components/query-builder/dialog/DangerousQueryDialog.vue`

```vue
<script setup lang="ts">
import type { QueryAnalysisResult, RiskLevel } from '@/types/query-analysis'

const props = defineProps<{
  analysisResult: QueryAnalysisResult
  sql: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isOpen = defineModel<boolean>('open')

// 遅延実行のカウントダウン
const countdown = ref(0)
const isCountingDown = ref(false)
const canExecute = computed(() => {
  if (props.analysisResult.riskLevel === 'danger') {
    return countdown.value === 0 && !isCountingDown.value
  }
  return true
})

// Dangerレベルの場合、3秒カウントダウン開始
const startCountdown = () => {
  if (props.analysisResult.riskLevel !== 'danger') return

  countdown.value = 3
  isCountingDown.value = true

  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      isCountingDown.value = false
    }
  }, 1000)
}

// ダイアログが開いたときにカウントダウン開始
watch(isOpen, (open) => {
  if (open && props.analysisResult.riskLevel === 'danger') {
    startCountdown()
  } else {
    countdown.value = 0
    isCountingDown.value = false
  }
})

const handleConfirm = () => {
  if (!canExecute.value) return
  emit('confirm')
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

// 危険度に応じた色
const riskColor = computed(() => {
  return props.analysisResult.riskLevel === 'danger' ? 'red' : 'amber'
})

// 危険度に応じたアイコン
const riskIcon = computed(() => {
  return props.analysisResult.riskLevel === 'danger'
    ? 'i-heroicons-exclamation-triangle'
    : 'i-heroicons-exclamation-circle'
})

// 危険度ラベル
const riskLabel = computed(() => {
  return props.analysisResult.riskLevel === 'danger' ? '危険' : '警告'
})

// 実行ボタンのラベル
const executeButtonLabel = computed(() => {
  if (isCountingDown.value) {
    return `実行する (${countdown.value}秒待機)`
  }
  return '実行する'
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="危険なクエリの実行確認"
    :ui="{ width: 'max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- 危険度バッジ -->
        <div class="flex items-center gap-2">
          <UBadge :color="riskColor" size="lg" class="uppercase">
            <UIcon :name="riskIcon" class="mr-1" />
            {{ riskLabel }}
          </UBadge>
          <span class="text-sm text-muted">
            {{ analysisResult.queryType.toUpperCase() }} クエリ
          </span>
        </div>

        <!-- 警告メッセージ -->
        <UAlert
          v-if="analysisResult.riskFactors.length > 0"
          :color="riskColor"
          variant="soft"
          :icon="riskIcon"
        >
          <template #title>警告</template>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="factor in analysisResult.riskFactors" :key="factor.code">
              {{ factor.message }}
            </li>
          </ul>
        </UAlert>

        <!-- 影響を受けるテーブル -->
        <div v-if="analysisResult.affectedTables.length > 0">
          <h4 class="text-sm font-medium mb-2">影響を受けるテーブル</h4>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="table in analysisResult.affectedTables"
              :key="table"
              color="neutral"
              variant="soft"
            >
              {{ table }}
            </UBadge>
          </div>
        </div>

        <!-- 実行予定のSQL -->
        <div>
          <h4 class="text-sm font-medium mb-2">実行予定のSQL</h4>
          <div class="bg-gray-100 dark:bg-gray-800 rounded-md p-3 font-mono text-sm overflow-x-auto max-h-40">
            <pre class="whitespace-pre-wrap">{{ sql }}</pre>
          </div>
        </div>

        <!-- 確認メッセージ -->
        <p class="text-sm text-muted">
          このクエリを実行してもよろしいですか？
          <template v-if="analysisResult.riskLevel === 'danger'">
            <strong class="text-red-600 dark:text-red-400">この操作は取り消せません。</strong>
          </template>
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          color="neutral"
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </UButton>
        <UButton
          :color="riskColor"
          :disabled="!canExecute"
          @click="handleConfirm"
        >
          {{ executeButtonLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### 2.3 QueryBuilderToolbar.vue の変更

**ファイル**: `app/components/query-builder/QueryBuilderToolbar.vue`

```vue
<script setup lang="ts">
// 既存のimportに追加
import DangerousQueryDialog from './dialog/DangerousQueryDialog.vue'

// 既存のstoreなど
const store = useQueryBuilderStore()
const { analysisResult, generatedSql, isExecuting, canExecuteQuery } = storeToRefs(store)

// 確認ダイアログの表示状態
const showConfirmDialog = ref(false)

// クエリ実行ハンドラ（既存のexecuteQueryを置き換え）
const handleExecuteClick = () => {
  // 解析結果がない、またはSafeの場合は直接実行
  if (!analysisResult.value || analysisResult.value.riskLevel === 'safe') {
    store.executeQuery()
    return
  }

  // Warning/Dangerの場合は確認ダイアログを表示
  showConfirmDialog.value = true
}

// ダイアログで確認された場合
const handleConfirm = () => {
  store.executeQuery()
}

// ダイアログでキャンセルされた場合
const handleCancel = () => {
  // 何もしない（ダイアログは自動で閉じる）
}
</script>

<template>
  <!-- 既存のテンプレート内の実行ボタン -->
  <UButton
    color="primary"
    :loading="isExecuting"
    :disabled="!canExecuteQuery || isExecuting"
    @click="handleExecuteClick"
  >
    <UIcon name="i-heroicons-play" />
    実行
  </UButton>

  <!-- 確認ダイアログ -->
  <DangerousQueryDialog
    v-if="analysisResult"
    v-model:open="showConfirmDialog"
    :analysis-result="analysisResult"
    :sql="generatedSql"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>
```

---

## 3. 型定義

### 3.1 既存の型（再掲）

**ファイル**: `app/types/query-analysis.ts`

```typescript
// 既存の型をそのまま使用
export type QueryType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'drop'
  | 'truncate'
  | 'alter'
  | 'create'
  | 'unknown'

export type RiskLevel = 'safe' | 'warning' | 'danger'

export interface RiskFactor {
  code: string
  message: string
}

export interface QueryAnalysisResult {
  queryType: QueryType
  riskLevel: RiskLevel
  riskFactors: RiskFactor[]
  affectedTables: string[]
  hasWhereClause: boolean
}
```

---

## 4. ストア変更

### 4.1 query-builder.ts の確認

既存のストアには以下がすでに実装済み:

- `analysisResult: QueryAnalysisResult | null` - 解析結果
- `executeQuery()` - クエリ実行アクション
- `regenerateSql()` 内でのクエリ解析呼び出し

**追加変更は不要**。ダイアログからの呼び出しは既存の `executeQuery()` をそのまま使用。

---

## 5. UX詳細設計

### 5.1 カウントダウンの振る舞い

1. ダイアログが開く
2. `riskLevel === 'danger'` の場合:
   - カウントダウン開始（3→2→1→0）
   - ボタンテキスト: "実行する (3秒待機)" → "実行する (2秒待機)" → ...
   - カウント0でボタン有効化
3. `riskLevel === 'warning'` の場合:
   - カウントダウンなし
   - 即座にボタン有効

### 5.2 色・アイコン対応表

| riskLevel | 色 | アイコン | ラベル |
|-----------|------|---------|--------|
| danger | red | exclamation-triangle | 危険 |
| warning | amber | exclamation-circle | 警告 |

### 5.3 キーボード操作

- `Escape`: ダイアログを閉じる（キャンセル）
- `Enter`: 実行ボタン押下（有効な場合のみ）

---

## 6. テストコード設計

### 6.1 コンポーネントテスト

**ファイル**: `app/components/query-builder/dialog/__tests__/DangerousQueryDialog.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DangerousQueryDialog from '../DangerousQueryDialog.vue'
import type { QueryAnalysisResult } from '@/types/query-analysis'

describe('DangerousQueryDialog', () => {
  const dangerResult: QueryAnalysisResult = {
    queryType: 'delete',
    riskLevel: 'danger',
    riskFactors: [
      { code: 'no_where_clause', message: 'WHERE句がありません。テーブル内の全データが削除されます' }
    ],
    affectedTables: ['users'],
    hasWhereClause: false,
  }

  const warningResult: QueryAnalysisResult = {
    queryType: 'update',
    riskLevel: 'warning',
    riskFactors: [
      { code: 'update_with_where', message: '条件に一致するデータが更新されます' }
    ],
    affectedTables: ['users'],
    hasWhereClause: true,
  }

  it('Dangerレベルで3秒カウントダウンが表示される', async () => {
    vi.useFakeTimers()

    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
      },
    })

    // 初期状態: ボタン無効、カウントダウン表示
    expect(wrapper.text()).toContain('3秒待機')

    // 1秒後
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('2秒待機')

    // 3秒後: ボタン有効
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('実行する')

    vi.useRealTimers()
  })

  it('Warningレベルでは即座に実行可能', async () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: warningResult,
        sql: 'UPDATE users SET name = "test" WHERE id = 1',
      },
    })

    // カウントダウンなし
    expect(wrapper.text()).not.toContain('秒待機')
    expect(wrapper.text()).toContain('実行する')
  })

  it('危険度バッジが正しく表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
      },
    })

    expect(wrapper.text()).toContain('危険')
    expect(wrapper.text()).toContain('DELETE')
  })

  it('影響テーブルが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
      },
    })

    expect(wrapper.text()).toContain('users')
  })

  it('確認ボタンでconfirmイベントが発火する', async () => {
    vi.useFakeTimers()

    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
      },
    })

    // 3秒待機
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()

    await wrapper.find('button:last-child').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()

    vi.useRealTimers()
  })

  it('キャンセルボタンでcancelイベントが発火する', async () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: warningResult,
        sql: 'UPDATE users SET name = "test"',
      },
    })

    await wrapper.find('button:first-child').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
```

---

## 7. 変更点まとめ

### 7.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `app/components/query-builder/dialog/DangerousQueryDialog.vue` | 確認ダイアログコンポーネント |
| `app/components/query-builder/dialog/__tests__/DangerousQueryDialog.spec.ts` | テストコード |

### 7.2 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/components/query-builder/QueryBuilderToolbar.vue` | 実行ボタンクリック時のダイアログ表示ロジック追加 |

### 7.3 変更なしファイル

| ファイル | 理由 |
|---------|------|
| `app/stores/query-builder.ts` | 既存のanalysisResult, executeQueryをそのまま使用 |
| `app/types/query-analysis.ts` | 既存の型をそのまま使用 |
