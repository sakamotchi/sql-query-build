<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useQueryBuilderStore } from '@/stores/query-builder'
import SqlPreview from './SqlPreview.vue'
import QueryInfo from './QueryInfo.vue'

const queryBuilderStore = useQueryBuilderStore()

const generatedSql = computed(() => queryBuilderStore.generatedSql)
const queryInfo = computed(() => queryBuilderStore.queryInfo)
const { smartQuote } = storeToRefs(queryBuilderStore) // Pinia state to ref

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedSql.value)
    console.log('Copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- SQLプレビュー -->
    <div class="flex flex-col flex-1 min-h-[200px] overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">SQLプレビュー</span>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5" title="必要な場合のみ引用符をつける">
            <USwitch
              :model-value="smartQuote"
              @update:model-value="(val) => queryBuilderStore.setSmartQuote(val)"
              size="sm"
            />
            <span class="text-xs text-gray-500 dark:text-gray-400">スマート引用符</span>
          </div>
          <UButton
            icon="i-heroicons-clipboard-document"
            size="xs"
            color="gray"
            variant="ghost"
            title="コピー"
            @click="copyToClipboard"
          />
        </div>
      </div>
      <SqlPreview
        :sql="generatedSql"
        :error-details="queryBuilderStore.queryError?.details"
      />
    </div>

    <!-- クエリ情報 -->
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">クエリ情報</span>
      </div>
      <QueryInfo :info="queryInfo" />
    </div>
  </div>
</template>
