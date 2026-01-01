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
    <div class="flex flex-col flex-1 min-h-[200px] overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">SQLプレビュー</span>
      </div>

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
        <div v-if="queryInfo.affectedRows === null && queryInfo.executionTime === null">
          クエリを実行してください
        </div>
      </div>
    </div>
  </div>
</template>
