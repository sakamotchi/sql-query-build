<script setup lang="ts">
import { ref } from 'vue'
import SetTab from './SetTab.vue'
import MutationWhereTab from './MutationWhereTab.vue'

const items = [
  { key: 'set', label: 'SET', value: 'set' },
  { key: 'where', label: 'WHERE', value: 'where' },
]

const selectedTab = ref('set')
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <UTabs
      v-model="selectedTab"
      :items="items"
      class="border-b border-gray-200 dark:border-gray-800"
    />

    <div class="flex-1 overflow-auto p-4">
      <div v-if="selectedTab === 'set'" class="h-full">
        <SetTab />
      </div>

      <div v-else class="h-full">
        <MutationWhereTab />
      </div>
    </div>
  </div>
</template>
