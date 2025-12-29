<script setup lang="ts">
import type { QueryAnalysisResult } from '@/types/query-analysis'

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
let timerId: ReturnType<typeof setInterval> | null = null

const canExecute = computed(() => {
  if (props.analysisResult.riskLevel === 'danger') {
    return countdown.value === 0 && !isCountingDown.value
  }
  return true
})

// タイマーをクリア
const clearTimer = () => {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

// Dangerレベルの場合、3秒カウントダウン開始
const startCountdown = () => {
  if (props.analysisResult.riskLevel !== 'danger') return

  // 既存タイマーをクリア
  clearTimer()

  countdown.value = 3
  isCountingDown.value = true

  timerId = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearTimer()
      isCountingDown.value = false
    }
  }, 1000)
}

// ダイアログが開いたときにカウントダウン開始
watch(isOpen, (open) => {
  if (open && props.analysisResult.riskLevel === 'danger') {
    startCountdown()
  } else {
    clearTimer()
    countdown.value = 0
    isCountingDown.value = false
  }
}, { immediate: true })

// コンポーネント破棄時のクリーンアップ
onUnmounted(() => {
  clearTimer()
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
