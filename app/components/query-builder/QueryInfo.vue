<script setup lang="ts">
import { computed } from 'vue'
import type { QueryInfo } from '@/types/query'

const props = defineProps<{
  info: QueryInfo
}>()

const { t } = useI18n()

const formattedExecutionTime = computed(() => {
  if (props.info.executionTime === null) return '-'
  return `${props.info.executionTime}ms`
})

const formattedLastExecuted = computed(() => {
  if (props.info.lastExecutedAt === null) return '-'
  return new Date(props.info.lastExecutedAt).toLocaleString()
})
</script>

<template>
  <div class="p-3">
    <div class="space-y-2">
      <div class="flex justify-between items-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ t('queryBuilder.info.rows') }}</span>
        <span class="font-medium">{{ info.rowCount }}</span>
      </div>
      <div class="flex justify-between items-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ t('queryBuilder.info.executionTime') }}</span>
        <span class="font-medium">{{ formattedExecutionTime }}</span>
      </div>
      <div class="flex justify-between items-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ t('queryBuilder.info.lastExecuted') }}</span>
        <span class="font-medium text-xs">{{ formattedLastExecuted }}</span>
      </div>
    </div>
  </div>
</template>
