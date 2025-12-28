<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import OrderByRow from './OrderByRow.vue'
import draggable from 'vuedraggable'

const queryBuilderStore = useQueryBuilderStore()

const isEmpty = computed(() => queryBuilderStore.selectedTables.length === 0)

const orderByColumns = computed({
  get: () => queryBuilderStore.orderByColumns,
  set: (val) => {
    queryBuilderStore.updateOrderByColumns(val)
  }
})

// Utilizable columns for ColumnSelect
const availableColumns = computed(() => {
  return queryBuilderStore.selectedTables.flatMap((table) => {
    return table.columns.map((col) => ({
      id: `${table.id}-${col.name}`,
      label: `${table.alias}.${col.name}`,
      tableId: table.id,
      tableAlias: table.alias,
      tableName: table.name,
      columnName: col.name,
      displayName: `${table.alias}.${col.name}`,
      dataType: col.dataType
    }))
  })
})

const addOrderByColumn = () => {
    queryBuilderStore.addOrderByColumn({
        id: crypto.randomUUID(),
        column: null,
        direction: 'ASC'
    })
}

const removeOrderByColumn = (id: string) => {
    queryBuilderStore.removeOrderByColumn(id)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="isEmpty" class="flex flex-col items-center justify-center h-full text-gray-500">
       <UIcon name="i-heroicons-table-cells" class="text-4xl mb-2" />
       <p>テーブルを選択してください</p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium">ORDER BY条件</span>
        <UButton
          label="カラム追加"
          icon="i-heroicons-plus"
          size="sm"
          variant="soft"
          @click="addOrderByColumn"
        />
      </div>

      <div class="p-4 overflow-y-auto flex-1">
        <!-- Draggable List -->
        <draggable 
           v-model="orderByColumns" 
           item-key="id"
           handle=".drag-handle"
           class="flex flex-col space-y-2"
           :animation="200"
           ghost-class="opacity-50"
           :force-fallback="true"
           @end="queryBuilderStore.regenerateSql()"
        >
          <template #item="{ element }">
             <OrderByRow 
                :item="element" 
                :available-columns="availableColumns"
                @remove="removeOrderByColumn(element.id)"
                @change="queryBuilderStore.regenerateSql()"
             />
          </template>
        </draggable>

        <div v-if="orderByColumns.length === 0" class="text-center text-gray-400 mt-8 text-sm">
           ソート順を適用するカラムを追加してください
        </div>
      </div>
    </template>
  </div>
</template>
