<script setup lang="ts">
import type { JoinSuggestion } from '@/types/join-suggestion'
import JoinSuggestionItem from './JoinSuggestionItem.vue'

const { t } = useI18n()

const props = defineProps<{
  suggestions: JoinSuggestion[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', suggestion: JoinSuggestion): void
}>()
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-amber-500" />
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {{ t('queryBuilder.joinSuggestion.title') }}
      </h3>
    </div>

    <div v-if="props.loading" class="flex items-center gap-2 text-gray-500 text-sm">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
      <span>{{ t('queryBuilder.joinSuggestion.loading') }}</span>
    </div>

    <div v-else-if="props.suggestions.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('queryBuilder.joinSuggestion.noSuggestions') }}
    </div>

    <div v-else class="space-y-2">
      <JoinSuggestionItem
        v-for="(suggestion, index) in props.suggestions"
        :key="index"
        :suggestion="suggestion"
        @apply="emit('apply', suggestion)"
      />
    </div>
  </div>
</template>
