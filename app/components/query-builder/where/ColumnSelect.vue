<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()

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

const emit = defineEmits<{
  (e: 'update:modelValue', value: { tableAlias: string; columnName: string } | null): void
}>()

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
    <USelectMenu
      v-model="selected"
      :items="columns"
      by="id"
      :search-attributes="['displayName', 'tableName', 'columnName']"
      :placeholder="t('queryBuilder.columnSelect.placeholder')"
      searchable
      clearable
      class="w-full"
    />
  </div>
</template>
