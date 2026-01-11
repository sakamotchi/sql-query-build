<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import SqlPreview from '@/components/query-builder/SqlPreview.vue'

const store = useMutationBuilderStore()

const generatedSql = computed(() => store.generatedSql)
const analysisResult = computed(() => store.analysisResult)
const queryError = computed(() => store.queryError)
const queryInfo = computed(() => store.queryInfo)
const mutationType = computed(() => store.mutationType)
const hasWhereConditions = computed(() => store.hasWhereConditions)
const { smartQuote } = storeToRefs(store)

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedSql.value)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const formattedExecutionTime = computed(() => {
  if (queryInfo.value.executionTimeMs === null) return '-'
  if (queryInfo.value.executionTimeMs < 1000) return `${queryInfo.value.executionTimeMs}ms`
  return `${(queryInfo.value.executionTimeMs / 1000).toFixed(2)}s`
})

const formattedLastExecuted = computed(() => {
  if (!queryInfo.value.lastExecutedAt) return '-'
  return new Date(queryInfo.value.lastExecutedAt).toLocaleString('ja-JP')
})

const showWarning = computed(() => {
  return (mutationType.value === 'UPDATE' || mutationType.value === 'DELETE') && !hasWhereConditions.value
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">SQLプレビュー</span>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" title="必要な場合のみ引用符をつける">
          <USwitch
            :model-value="smartQuote"
            @update:model-value="(val) => store.setSmartQuote(val)"
            size="sm"
          />
          <span class="text-xs text-gray-500 dark:text-gray-400">スマート引用符</span>
        </div>
        <UButton
          icon="i-heroicons-clipboard-document"
          size="xs"
          color="neutral"
          variant="ghost"
          title="コピー"
          :disabled="!generatedSql"
          @click="copyToClipboard"
        />
      </div>
    </div>

    <div v-if="store.sqlGenerationError" class="border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2">
      <p class="text-xs text-red-700 dark:text-red-300">{{ store.sqlGenerationError }}</p>
    </div>

    <div v-else-if="queryError" class="border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2">
      <p class="text-xs text-red-700 dark:text-red-300">
        実行エラー: {{ queryError.message }}
      </p>
    </div>

    <div
      v-if="showWarning"
      class="border-b border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 px-3 py-2"
    >
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
        <div class="text-xs text-orange-800 dark:text-orange-200">
          WHERE句がありません。このクエリは全ての行を{{ mutationType === 'DELETE' ? '削除' : '更新' }}します。
        </div>
      </div>
    </div>

    <SqlPreview
      :sql="generatedSql"
      :error-details="queryError?.details"
      :analysis-result="analysisResult"
    />

    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
      <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">クエリ情報</span>
      </div>
      <div class="p-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div class="flex justify-between">
          <span>影響行数:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ queryInfo.affectedRows ?? '-' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>実行時間:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ formattedExecutionTime }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>最終実行:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ formattedLastExecuted }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
