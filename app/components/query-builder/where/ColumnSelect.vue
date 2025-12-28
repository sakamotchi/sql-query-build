<script setup lang="ts">
import { computed } from 'vue'

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
  modelValue: { tableAlias: string; columnName: string } | null
  columns: ColumnOption[]
}>()

// デバッグ用
// console.log('ColumnSelect columns:', props.columns)

const emit = defineEmits<{
  (e: 'update:modelValue', value: { tableAlias: string; columnName: string } | null): void
}>()

// 選択値
const selected = computed({
  get: () => {
    if (!props.modelValue) return undefined
    return props.columns.find(
      (c) =>
        c.tableAlias === props.modelValue?.tableAlias &&
        c.columnName === props.modelValue?.columnName
    )
  },
  set: (value: ColumnOption | undefined) => {
    if (!value) {
      emit('update:modelValue', null)
      return
    }
    emit('update:modelValue', {
      tableAlias: value.tableAlias,
      columnName: value.columnName,
    })
  },
})
</script>

<template>
  <div class="w-full">
    <!-- デバッグ用: カラム数表示 -->
    <!-- <div class="text-[10px] text-gray-400 mb-1">Cols: {{ columns?.length }}</div> -->
    
    <USelectMenu
      v-model="selected"
      :items="columns"
      by="id"
      :search-attributes="['displayName', 'tableName', 'columnName']"
      option-attribute="displayName"
      placeholder="カラムを選択"
      searchable
      clearable
      class="w-full"
    />
  </div>
</template>
