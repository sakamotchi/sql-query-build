<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

const store = useMutationBuilderStore()

const mutationType = computed(() => store.mutationType)
const selectedTable = computed(() => store.selectedTable)
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">{{ mutationType }} 設定</span>
    </div>

    <div class="flex-1 overflow-auto p-4">
      <div v-if="!selectedTable" class="text-center text-gray-500 dark:text-gray-400 mt-8">
        <UIcon name="i-heroicons-table-cells" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p class="text-sm">左側のツリーからテーブルを選択してください</p>
      </div>

      <div v-else class="space-y-4">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          テーブル: <span class="font-medium text-gray-900 dark:text-gray-100">{{ selectedTable }}</span>
        </div>

        <div class="text-center text-gray-500 dark:text-gray-400 mt-8">
          <p class="text-sm">{{ mutationType }}パネルは次のタスクで実装します</p>
        </div>
      </div>
    </div>
  </div>
</template>
