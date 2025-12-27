<script setup lang="ts">
import { ref } from 'vue'

// タブアイテム
const items = [
  {
    key: 'select',
    label: 'SELECT',
  },
  {
    key: 'where',
    label: 'WHERE',
  },
  {
    key: 'group',
    label: 'GROUP BY',
  },
  {
    key: 'order',
    label: 'ORDER BY',
  },
  {
    key: 'limit',
    label: 'LIMIT',
  },
]

// 選択中のタブ
const selectedTab = ref('select')
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- タブヘッダー -->
    <UTabs
      v-model="selectedTab"
      :items="items"
      class="border-b border-gray-200 dark:border-gray-800"
    />

    <!-- タブコンテンツ -->
    <div class="flex-1 overflow-auto p-4">
      <div v-if="selectedTab === 'select'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-cursor-arrow-rays" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">SELECT句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.5で実装)</p>
      </div>

      <div v-else-if="selectedTab === 'where'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-funnel" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">WHERE句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.6で実装)</p>
      </div>

      <div v-else-if="selectedTab === 'group'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-squares-plus" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">GROUP BY句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.7で実装)</p>
      </div>

      <div v-else-if="selectedTab === 'order'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-arrows-up-down" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">ORDER BY句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.8で実装)</p>
      </div>

      <div v-else-if="selectedTab === 'limit'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-numbered-list" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">LIMIT句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.9で実装)</p>
      </div>
    </div>
  </div>
</template>
