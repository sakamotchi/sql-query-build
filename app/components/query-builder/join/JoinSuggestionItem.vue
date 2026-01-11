<script setup lang="ts">
import { computed } from 'vue'
import type { JoinSuggestion } from '@/types/join-suggestion'

const { t } = useI18n()

const props = defineProps<{
  suggestion: JoinSuggestion
}>()

const emit = defineEmits<{
  (e: 'apply', suggestion: JoinSuggestion): void
}>()

// 信頼度を星表現に変換
const stars = computed(() => {
  const count = Math.round(props.suggestion.confidence * 5)
  return '★'.repeat(count) + '☆'.repeat(5 - count)
})

// 信頼度に応じた色
const confidenceColor = computed(() => {
  if (props.suggestion.confidence >= 0.8) return 'text-green-600 dark:text-green-400'
  if (props.suggestion.confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-gray-600 dark:text-gray-400'
})

const conditionText = computed(() => {
  return props.suggestion.conditions
    .map((c) => `${c.leftColumn} ${c.operator} ${c.rightColumn}`)
    .join(' AND ')
})
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span :class="confidenceColor" class="text-sm font-medium">
            {{ stars }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ suggestion.reason }}
          </span>
        </div>
        <div class="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
          {{ suggestion.joinType }} {{ suggestion.toTable }}
        </div>
        <div class="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 truncate">
          ON {{ conditionText }}
        </div>
      </div>
      <UButton
        size="xs"
        color="primary"
        icon="i-heroicons-check"
        @click="emit('apply', suggestion)"
      >
        {{ t('common.actions.add') }}
      </UButton>
    </div>
  </div>
</template>
