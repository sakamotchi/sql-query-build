<script setup lang="ts">
import DatabaseTree from '@/components/query-builder/DatabaseTree.vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import type { Table } from '@/types/database-structure'

const store = useMutationBuilderStore()

const handleTableSelect = (table: Table) => {
  store.setSelectedTable(table.name)
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">データベース</span>
    </div>
    <div class="flex-1 overflow-auto">
      <DatabaseTree @select-table="handleTableSelect" />
    </div>
  </div>
</template>
