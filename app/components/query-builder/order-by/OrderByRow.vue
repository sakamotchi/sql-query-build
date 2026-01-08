<script setup lang="ts">
import { computed } from 'vue'
import type { OrderByColumn } from '@/types/query'
import ColumnSelect from '../where/ColumnSelect.vue'

// ColumnOption definition matching ColumnSelect's expectation
interface ColumnOption {
  id: string
  label: string
  tableId: string
  tableAlias: string
  tableName: string
  columnName: string
  displayName: string
  dataType: string
}

const props = defineProps<{
  item: OrderByColumn
  availableColumns: ColumnOption[]
}>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'change'): void
}>()

const directions = [
  { label: '昇順 (ASC)', value: 'ASC' },
  { label: '降順 (DESC)', value: 'DESC' }
]

const selectedColumnModel = computed({
  get: () => {
    if (!props.item.column) return null
    return {
      tableAlias: props.item.column.tableAlias,
      columnName: props.item.column.columnName
    }
  },
  set: (val) => {
    if (!val) {
      props.item.column = null
      emit('change')
      return
    }
    // Find the full column info from availableColumns
    const found = props.availableColumns.find(
      c => c.tableAlias === val.tableAlias && c.columnName === val.columnName
    )
    
    if (found) {
      props.item.column = {
        tableId: found.tableId,
        tableAlias: found.tableAlias,
        columnName: found.columnName,
        columnAlias: null,
        dataType: found.dataType
      }
      emit('change')
    }
  }
})

const onDirectionChange = () => {
  emit('change')
}
</script>

<template>
  <div class="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-800 shadow-sm">
     <!-- Drag Handle -->
     <UIcon name="i-heroicons-bars-2" class="drag-handle cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
     
     <!-- Column Select -->
     <div class="flex-1">
       <ColumnSelect 
         v-model="selectedColumnModel" 
         :columns="availableColumns" 
       />
     </div>

     <!-- Direction Select -->
     <div class="w-[140px]">
       <USelect
         v-model="item.direction"
         :items="directions"
         
         value-key="value"
         @update:model-value="onDirectionChange"
       />
     </div>

     <!-- Remove Button -->
     <UButton icon="i-heroicons-x-mark" color="red" variant="ghost" size="sm" @click="$emit('remove')" />
  </div>
</template>
