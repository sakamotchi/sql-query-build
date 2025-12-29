<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import ResultTable from './result/ResultTable.vue'
import ResultPagination from './result/ResultPagination.vue'

const store = useQueryBuilderStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 計算プロパティ
const hasResult = computed(() => store.queryResult !== null)
const isLoading = computed(() => store.isExecuting)
const executionInfo = computed(() => {
  if (!store.queryResult) return null
  return {
    rowCount: store.queryResult.rowCount,
    executionTimeMs: store.queryResult.executionTimeMs,
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-table-cells" class="text-lg" />
        <span class="text-sm font-medium">実行結果</span>
        <!-- 実行情報 -->
        <template v-if="executionInfo">
          <span class="text-xs text-gray-500">
            {{ executionInfo.rowCount }}行
          </span>
          <span class="text-xs text-gray-400">
            ({{ executionInfo.executionTimeMs }}ms)
          </span>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          color="gray"
          variant="ghost"
          title="エクスポート"
          :disabled="!hasResult"
        />
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          color="gray"
          variant="ghost"
          title="閉じる"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- コンテンツ -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- ローディング -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        <span class="ml-2 text-gray-500">実行中...</span>
      </div>

      <!-- エラー -->
      <div v-else-if="store.error" class="flex-1 flex flex-col items-center justify-center p-4">
        <UIcon name="i-heroicons-exclamation-circle" class="text-4xl text-red-500 mb-2" />
        <p class="text-red-500 font-medium whitespace-pre-wrap text-center">{{ store.error }}</p>
      </div>

      <!-- 結果なし -->
      <div v-else-if="!hasResult" class="flex-1 flex flex-col items-center justify-center">
        <UIcon name="i-heroicons-table-cells" class="text-4xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">クエリを実行してください</p>
      </div>

      <!-- 結果表示 -->
      <template v-else>
        <div class="flex-1 overflow-auto">
          <ResultTable
            :columns="store.queryResult!.columns"
            :rows="store.paginatedRows"
          />
        </div>
        <div class="border-t border-gray-200 dark:border-gray-800">
          <ResultPagination
            :current-page="store.currentPage"
            :page-size="store.pageSize"
            :total-rows="store.queryResult!.rowCount"
            @page-change="store.setCurrentPage"
            @page-size-change="store.setPageSize"
          />
        </div>
      </template>
    </div>
  </div>
</template>
