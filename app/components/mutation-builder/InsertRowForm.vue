<script setup lang="ts">
import type { Column } from '@/types/database-structure'
import ColumnInputField from './ColumnInputField.vue'

interface InsertRowData {
  id: string
  values: Record<string, { value: any; isNull: boolean }>
}

const props = defineProps<{
  row: InsertRowData
  rowIndex: number
  columns: Column[]
  canRemove: boolean
}>()

const emit = defineEmits<{
  (e: 'remove'): void
}>()

const ensureCell = (columnName: string) => {
  if (!props.row.values[columnName]) {
    props.row.values[columnName] = { value: null, isNull: false }
  }
  return props.row.values[columnName]
}

const updateValue = (columnName: string, value: any) => {
  ensureCell(columnName).value = value
}

const updateIsNull = (columnName: string, value: boolean) => {
  ensureCell(columnName).isNull = value
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
        行 {{ rowIndex + 1 }}
      </span>
      <UButton
        v-if="canRemove"
        icon="i-heroicons-trash"
        color="red"
        variant="ghost"
        size="xs"
        @click="emit('remove')"
      />
    </div>

    <div class="p-4 form-input-grid">
      <ColumnInputField
        v-for="column in columns"
        :key="column.name"
        :column="column"
        :value="row.values[column.name]?.value ?? null"
        :is-null="row.values[column.name]?.isNull ?? false"
        @update:value="(val) => updateValue(column.name, val)"
        @update:is-null="(val) => updateIsNull(column.name, val)"
      />
    </div>
  </div>
</template>
