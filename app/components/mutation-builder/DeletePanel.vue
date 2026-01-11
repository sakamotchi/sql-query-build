<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import MutationWhereTab from './MutationWhereTab.vue'

const mutationStore = useMutationBuilderStore()
const { t } = useI18n()

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
        :title="t('mutationBuilder.deletePanel.warning.title')"
        :description="t('mutationBuilder.deletePanel.warning.desc')"
      />
    </div>

    <div class="flex-1 overflow-hidden">
      <MutationWhereTab />
    </div>
  </div>
</template>
