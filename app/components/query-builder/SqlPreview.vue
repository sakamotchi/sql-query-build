<script setup lang="ts">
defineProps<{
  sql: string
}>()
</script>

<template>
  <div class="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-950">
    <pre
      v-if="sql"
      class="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap"
    ><code>{{ sql }}</code></pre>
    <div v-else class="flex flex-col items-center justify-center h-full">
      <UIcon name="i-heroicons-code-bracket" class="text-3xl text-gray-400" />
      <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">SQLプレビュー</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">クエリを構築すると表示されます</p>
    </div>
  </div>
</template>
