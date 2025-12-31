<script setup lang="ts">
import { nextTick, ref } from 'vue'
import SelectTab from './select/SelectTab.vue'
import WhereTab from './where/WhereTab.vue'
import GroupByTab from './group-by/GroupByTab.vue'
import OrderByTab from './order-by/OrderByTab.vue'
import LimitTab from './limit/LimitTab.vue'
import JoinPanel from './JoinPanel.vue'
import type { JoinClause } from '@/types/query-model'

// タブアイテム
const items = [
  {
    key: 'select',
    label: 'SELECT',
    value: 'select',
  },
  {
    key: 'join',
    label: 'JOIN',
    value: 'join',
  },
  {
    key: 'where',
    label: 'WHERE',
    value: 'where',
  },
  {
    key: 'group',
    label: 'GROUP BY',
    value: 'group',
  },
  {
    key: 'order',
    label: 'ORDER BY',
    value: 'order',
  },
  {
    key: 'limit',
    label: 'LIMIT',
    value: 'limit',
  },
]

// 選択中のタブ
const selectedTab = ref('select')
const joinPanelRef = ref<InstanceType<typeof JoinPanel> | null>(null)

const openJoinTab = () => {
  selectedTab.value = 'join'
}

const openJoinAddDialog = () => {
  openJoinTab()
  nextTick(() => joinPanelRef.value?.openAddJoin())
}

const openJoinEditDialog = (join: JoinClause) => {
  openJoinTab()
  nextTick(() => joinPanelRef.value?.openEditJoin(join))
}

defineExpose({
  openJoinTab,
  openJoinAddDialog,
  openJoinEditDialog,
})
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
      <div v-if="selectedTab === 'select'" class="h-full">
        <SelectTab />
      </div>

      <div v-else-if="selectedTab === 'join'" class="h-full">
        <JoinPanel ref="joinPanelRef" />
      </div>

      <div v-else-if="selectedTab === 'where'" class="h-full">
        <WhereTab />
      </div>

      <div v-else-if="selectedTab === 'group'" class="h-full">
        <GroupByTab />
      </div>

      <div v-else-if="selectedTab === 'order'" class="h-full">
        <OrderByTab />
      </div>

      <div v-else-if="selectedTab === 'limit'" class="h-full">
        <LimitTab />
      </div>
    </div>
  </div>
</template>
