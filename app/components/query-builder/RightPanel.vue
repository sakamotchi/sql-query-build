<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import SqlPreview from './SqlPreview.vue'
import QueryInfo from './QueryInfo.vue'

const queryBuilderStore = useQueryBuilderStore()

const generatedSql = computed(() => queryBuilderStore.generatedSql)
const queryInfo = computed(() => queryBuilderStore.queryInfo)

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
        <UButton
          icon="i-heroicons-clipboard-document"
          size="xs"
          color="gray"
          variant="ghost"
          title="コピー"
          @click="copyToClipboard"
        />
      </div>
      <SqlPreview :sql="generatedSql" />
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
