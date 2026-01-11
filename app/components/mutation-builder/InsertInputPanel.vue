<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import FormInputTab from './FormInputTab.vue'

const store = useMutationBuilderStore()
const { t } = useI18n()
const mutationType = computed(() => store.mutationType)

const items = computed(() => [
  { key: 'form', label: t('mutationBuilder.insertPanel.modes.form'), value: 'form' },
  { key: 'grid', label: t('mutationBuilder.insertPanel.modes.grid'), value: 'grid' },
])

const selectedTab = computed({
  get: () => store.insertInputMode,
  set: (value: string) => store.setInsertInputMode(value === 'grid' ? 'grid' : 'form'),
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <template v-if="mutationType === 'INSERT'">
      <UTabs
        v-model="selectedTab"
        :items="items"
        class="border-b border-gray-200 dark:border-gray-800"
      />

      <div class="flex-1 overflow-auto p-4">
        <div v-if="selectedTab === 'form'" class="h-full">
          <FormInputTab />
        </div>

        <div v-else class="h-full flex items-center justify-center">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('mutationBuilder.insertPanel.gridNotImplemented') }}
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
      {{ t('mutationBuilder.layout.notImplemented', { type: mutationType }) }}
    </div>
  </div>
</template>
