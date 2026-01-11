<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import type { Column } from '@/types/database-structure'
import InsertRowForm from './InsertRowForm.vue'

interface InsertRowData {
  id: string
  values: Record<string, { value: any; isNull: boolean }>
}

const mutationStore = useMutationBuilderStore()
const databaseStructureStore = useDatabaseStructureStore()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()

const { t } = useI18n()

const connectionId = computed(() =>
  connectionStore.activeConnection?.id || windowStore.currentConnectionId
)

const parseTableIdentifier = (fullName: string) => {
  const parts = fullName.split('.')
  if (parts.length >= 2) {
    return { schema: parts[0], table: parts.slice(1).join('.') }
  }
  return { schema: null, table: fullName }
}

const tableColumns = computed<Column[]>(() => {
  if (!mutationStore.selectedTable || !connectionId.value) return []

  const structure = databaseStructureStore.getStructure(connectionId.value)
  if (!structure) return []

  const { schema, table } = parseTableIdentifier(mutationStore.selectedTable)

  const schemas = structure.schemas.filter((s) => !s.isSystem)
  const matchedSchema = schema ? schemas.find((s) => s.name === schema) : null

  if (matchedSchema) {
    const columns = matchedSchema.tables.find((t) => t.name === table)?.columns || []
    return [...columns].sort((a, b) => a.ordinalPosition - b.ordinalPosition)
  }

  for (const candidate of schemas) {
    const found = candidate.tables.find((t) => t.name === table)
    if (found) return [...found.columns].sort((a, b) => a.ordinalPosition - b.ordinalPosition)
  }

  return []
})

const createRowId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isBooleanType = (column: Column) => {
  return column.dataType.toUpperCase().includes('BOOL')
}

const isNumericType = (column: Column) => {
  const upper = column.dataType.toUpperCase()
  return (
    upper.includes('INT') ||
    upper.includes('NUMERIC') ||
    upper.includes('DECIMAL') ||
    upper.includes('FLOAT') ||
    upper.includes('DOUBLE') ||
    upper.includes('REAL')
  )
}

const getDefaultValue = (column: Column) => {
  if (isBooleanType(column)) return false
  if (isNumericType(column)) return ''
  return ''
}

const normalizeValue = (column: Column, rawValue: any) => {
  if (rawValue === null || rawValue === undefined) return null
  if (isBooleanType(column)) return Boolean(rawValue)
  if (isNumericType(column)) {
    if (rawValue === '') return null
    const parsed = Number(rawValue)
    return Number.isNaN(parsed) ? rawValue : parsed
  }
  return rawValue
}

const buildRowsFromValues = (values: Array<Record<string, any>>) => {
  const columns = tableColumns.value
  if (!columns.length) return []

  if (!values.length) {
    return [createEmptyRow()]
  }

  return values.map((rowValue) => {
    const valuesMap: Record<string, { value: any; isNull: boolean }> = {}
    columns.forEach((column) => {
      const cellValue = rowValue ? rowValue[column.name] : null
      const isNull = cellValue === null || cellValue === undefined
      valuesMap[column.name] = {
        value: isNull ? getDefaultValue(column) : cellValue,
        isNull,
      }
    })

    return {
      id: createRowId(),
      values: valuesMap,
    }
  })
}

const createEmptyRow = (): InsertRowData => {
  const values: Record<string, { value: any; isNull: boolean }> = {}
  tableColumns.value.forEach((column) => {
    values[column.name] = {
      value: getDefaultValue(column),
      isNull: false,
    }
  })

  return {
    id: createRowId(),
    values,
  }
}

const rows = ref<InsertRowData[]>([])
const internalUpdate = ref(false)

const syncStore = () => {
  if (!mutationStore.selectedTable || !tableColumns.value.length) {
    mutationStore.updateInsertQueryModel({ columns: [], values: [] })
    return
  }

  // 自動採番カラムを除外
  const insertableColumns = tableColumns.value.filter((column) => !column.isAutoIncrement)

  const columns = insertableColumns.map((column) => column.name)
  const values = rows.value.map((row) => {
    const rowData: Record<string, any> = {}
    insertableColumns.forEach((column) => {
      const cell = row.values[column.name]
      if (!cell || cell.isNull) {
        rowData[column.name] = null
        return
      }
      rowData[column.name] = normalizeValue(column, cell.value)
    })
    return rowData
  })

  mutationStore.updateInsertQueryModel({ columns, values })
}

const addRow = () => {
  rows.value.push(createEmptyRow())
}

const removeRow = (rowId: string) => {
  if (rows.value.length <= 1) return
  rows.value = rows.value.filter((row) => row.id !== rowId)
}

watch(rows, () => {
  if (internalUpdate.value) return
  syncStore()
}, { deep: true })

watch([tableColumns, () => mutationStore.selectedTable], () => {
  if (!mutationStore.selectedTable || !tableColumns.value.length) {
    internalUpdate.value = true
    rows.value = []
    nextTick(() => {
      internalUpdate.value = false
    })
    mutationStore.updateInsertQueryModel({ columns: [], values: [] })
    return
  }

  const modelValues = mutationStore.queryModel?.type === 'INSERT'
    ? mutationStore.queryModel.values
    : []

  internalUpdate.value = true
  rows.value = buildRowsFromValues(modelValues)
  nextTick(() => {
    internalUpdate.value = false
  })
  syncStore()
}, { immediate: true })

// 外部からのクエリモデル変更を監視（履歴復元など）
// deep watchを削除し、内部更新による無限ループを防ぐ
const externalQueryModelChange = computed(() => {
  if (!mutationStore.queryModel || mutationStore.queryModel.type !== 'INSERT') return null
  return mutationStore.queryModel.values.length
})

watch(externalQueryModelChange, () => {
  if (internalUpdate.value) return
  const model = mutationStore.queryModel
  if (!model || model.type !== 'INSERT') return
  if (!mutationStore.selectedTable) return

  // 外部から変更された場合のみ更新（行数が変わった場合など）
  if (rows.value.length !== model.values.length) {
    internalUpdate.value = true
    rows.value = buildRowsFromValues(model.values)
    nextTick(() => {
      internalUpdate.value = false
    })
  }
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="!mutationStore.selectedTable" class="text-center text-gray-500 dark:text-gray-400 py-12">
      <UIcon name="i-heroicons-table-cells" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">{{ t('mutationBuilder.formInput.selectPrompt') }}</p>
    </div>

    <div v-else-if="tableColumns.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-12">
      <UIcon name="i-heroicons-circle-stack" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">{{ t('mutationBuilder.formInput.noColumns') }}</p>
    </div>

    <div v-else class="space-y-4">
      <InsertRowForm
        v-for="(row, index) in rows"
        :key="row.id"
        :row="row"
        :row-index="index"
        :columns="tableColumns"
        :can-remove="rows.length > 1"
        @remove="removeRow(row.id)"
      />

      <UButton
        icon="i-heroicons-plus"
        color="primary"
        variant="soft"
        @click="addRow"
      >
        {{ t('mutationBuilder.formInput.addRow') }}
      </UButton>
    </div>
  </div>
</template>
