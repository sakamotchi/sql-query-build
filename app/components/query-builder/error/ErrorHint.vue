<script setup lang="ts">
import type { ErrorHint } from '@/utils/error-messages'

defineProps<{
  hint: ErrorHint
}>()
</script>

<template>
  <div class="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
    <UIcon
      name="i-heroicons-light-bulb"
      class="text-lg text-amber-500 dark:text-amber-400 flex-shrink-0"
    />
    <div>
      <p class="text-sm text-amber-800 dark:text-amber-200 font-medium">
        {{ hint.title }}
      </p>
      <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
        {{ hint.suggestion }}
      </p>
      <ul v-if="hint.examples?.length" class="mt-2 text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
        <li v-for="example in hint.examples" :key="example">{{ example }}</li>
      </ul>
    </div>
  </div>
</template>
