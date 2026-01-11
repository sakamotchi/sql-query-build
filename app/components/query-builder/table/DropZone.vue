<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center justify-center h-full p-6 pointer-events-none">
    <div class="flex flex-col items-center text-center">
      <UIcon name="i-heroicons-table-cells" class="text-5xl text-gray-300 dark:text-gray-600" />
      <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400 mt-3">
        {{ t('queryBuilder.relationArea.emptyTitle') }}
      </h3>
      <p 
        class="text-sm text-gray-400 dark:text-gray-500 mt-1 whitespace-pre-line"
      >
        {{ t('queryBuilder.relationArea.emptyDesc') }}
      </p>
    </div>
  </div>
</template>
