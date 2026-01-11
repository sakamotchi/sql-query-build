<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import MutationWhereTab from './MutationWhereTab.vue'

const mutationStore = useMutationBuilderStore()

const showWarning = computed(() => {
  return mutationStore.selectedTable && !mutationStore.hasWhereConditions
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div v-if="showWarning" class="p-4 border-b border-gray-200 dark:border-gray-800">
      <UAlert
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="警告: WHERE句がありません"
        description="WHERE句を指定しないと、テーブルの全行が削除されます。本当に全行削除する場合のみ実行してください。"
      />
    </div>

    <div class="flex-1 overflow-hidden">
      <MutationWhereTab />
    </div>
  </div>
</template>
