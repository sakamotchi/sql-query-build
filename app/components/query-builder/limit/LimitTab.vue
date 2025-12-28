<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'

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
      <h3 class="text-sm font-medium mb-4 text-gray-700 dark:text-gray-200">取得制限オプション</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- LIMIT -->
        <UFormField label="LIMIT (取得件数)" help="取得する最大レコード数">
          <UInput type="number" v-model.number="limit" placeholder="例: 100" min="0" />
        </UFormField>

        <!-- OFFSET -->
        <UFormField label="OFFSET (開始位置)" help="スキップするレコード数">
           <UInput type="number" v-model.number="offset" placeholder="例: 0" min="0" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
