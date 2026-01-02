<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import FormInputTab from './FormInputTab.vue'

const store = useMutationBuilderStore()
const mutationType = computed(() => store.mutationType)

const items = [
  { key: 'form', label: 'フォーム形式', value: 'form' },
  { key: 'grid', label: '表形式', value: 'grid' },
]

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
            表形式はPhase 2で実装予定です
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
      {{ mutationType }} はPhase 8.3以降で実装予定です
    </div>
  </div>
</template>
