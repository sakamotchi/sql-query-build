<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'

const { t } = useI18n()
const queryBuilderStore = useQueryBuilderStore()

const limit = computed({
  get: () => queryBuilderStore.limit,
  set: (val) => queryBuilderStore.updateLimit(val)
})

const offset = computed({
  get: () => queryBuilderStore.offset,
  set: (val) => queryBuilderStore.updateOffset(val)
})
</script>

<template>
  <div class="h-full p-4 flex flex-col gap-6">
    <div class="p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-medium mb-4 text-gray-700 dark:text-gray-200">{{ t('queryBuilder.limitTab.title') }}</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- LIMIT -->
        <UFormField :label="t('queryBuilder.limitTab.limit.label')" :help="t('queryBuilder.limitTab.limit.help')">
          <UInput type="number" v-model.number="limit" :placeholder="t('queryBuilder.limitTab.limit.placeholder')" min="0" />
        </UFormField>

        <!-- OFFSET -->
        <UFormField :label="t('queryBuilder.limitTab.offset.label')" :help="t('queryBuilder.limitTab.offset.help')">
           <UInput type="number" v-model.number="offset" :placeholder="t('queryBuilder.limitTab.offset.placeholder')" min="0" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
