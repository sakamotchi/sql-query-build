<script setup lang="ts">
import { ref, computed } from 'vue'
import SelectTab from './select/SelectTab.vue'
import WhereTab from './where/WhereTab.vue'
import GroupByTab from './group-by/GroupByTab.vue'
import OrderByTab from './order-by/OrderByTab.vue'

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

// 選択中のタブ（インデックス）
const selectedIndex = ref(0)

// 選択中のタブキー
const selectedKey = computed(() => items[selectedIndex.value]?.key)
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- タブヘッダー -->
    <UTabs
      v-model="selectedIndex"
      :items="items"
      class="border-b border-gray-200 dark:border-gray-800"
    />

    <!-- タブコンテンツ -->
    <div class="flex-1 overflow-auto p-4">
      <div v-if="selectedKey === 'select'" class="h-full">
        <SelectTab />
      </div>

      <div v-else-if="selectedKey === 'where'" class="h-full">
        <WhereTab />
      </div>

      <div v-else-if="selectedKey === 'group'" class="h-full">
        <GroupByTab />
      </div>

      <div v-else-if="selectedKey === 'order'" class="h-full">
        <OrderByTab />
      </div>

      <div v-else-if="selectedKey === 'limit'" class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-numbered-list" class="text-3xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">LIMIT句設定</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.9で実装)</p>
      </div>
    </div>
  </div>
</template>
