<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import type { Column } from '@/types/database-structure'
import SetColumnField from './SetColumnField.vue'

interface SetColumnEntry {
  id: string
  column: Column
  value: any
  isNull: boolean
}

const mutationStore = useMutationBuilderStore()
const databaseStructureStore = useDatabaseStructureStore()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()

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

const isBooleanType = (column: Column) => column.dataType.toUpperCase().includes('BOOL')

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

const buildSetClauseFromEntries = (entries: SetColumnEntry[]) => {
  const setClause: Record<string, { value: any; isNull: boolean }> = {}
  entries.forEach((entry) => {
    setClause[entry.column.name] = {
      value: entry.isNull ? null : normalizeValue(entry.column, entry.value),
      isNull: entry.isNull,
    }
  })
  return setClause
}

const buildColumnsFromModel = (setClause: Record<string, { value: any; isNull: boolean }>) => {
  if (!tableColumns.value.length) return []

  return tableColumns.value
    .filter((column) => setClause[column.name])
    .map((column) => {
      const config = setClause[column.name]
      return {
        id: column.name,
        column,
        value: config.isNull ? getDefaultValue(column) : (config.value ?? getDefaultValue(column)),
        isNull: config.isNull,
      }
    })
}

const setColumns = ref<SetColumnEntry[]>([])
const columnToAdd = ref<Column | null>(null)
const internalUpdate = ref(false)

const columnsForAdd = computed(() => {
  const usedColumnNames = setColumns.value.map((sc) => sc.column.name)
  return tableColumns.value.filter((col) => !usedColumnNames.includes(col.name))
})

const syncStore = () => {
  if (!mutationStore.selectedTable || !tableColumns.value.length) {
    mutationStore.updateSetClause({})
    return
  }

  const setClause = buildSetClauseFromEntries(setColumns.value)

  mutationStore.updateSetClause(setClause)
}

const addColumn = (column?: Column | null) => {
  if (!column) return
  setColumns.value.push({
    id: column.name,
    column,
    value: getDefaultValue(column),
    isNull: false,
  })
  columnToAdd.value = null
  syncStore()
}

const removeColumn = (id: string) => {
  setColumns.value = setColumns.value.filter((sc) => sc.id !== id)
  syncStore()
}

watch(
  setColumns,
  () => {
    if (internalUpdate.value) return
    syncStore()
  },
  { deep: true }
)

watch(
  [tableColumns, () => mutationStore.selectedTable],
  () => {
    if (!mutationStore.selectedTable || !tableColumns.value.length) {
      internalUpdate.value = true
      setColumns.value = []
      nextTick(() => {
        internalUpdate.value = false
      })
      mutationStore.updateSetClause({})
      return
    }

    const model = mutationStore.queryModel
    const setClause = model && model.type === 'UPDATE' ? model.setClause : {}

    internalUpdate.value = true
    setColumns.value = buildColumnsFromModel(setClause)
    nextTick(() => {
      internalUpdate.value = false
    })
    syncStore()
  },
  { immediate: true }
)

const externalSetClauseSignature = computed(() => {
  if (!mutationStore.queryModel || mutationStore.queryModel.type !== 'UPDATE') return ''
  return JSON.stringify(mutationStore.queryModel.setClause || {})
})

watch(externalSetClauseSignature, () => {
  if (internalUpdate.value) return
  if (!mutationStore.selectedTable || !tableColumns.value.length) return

  const model = mutationStore.queryModel
  if (!model || model.type !== 'UPDATE') return
  if (externalSetClauseSignature.value === JSON.stringify(buildSetClauseFromEntries(setColumns.value))) {
    return
  }

  internalUpdate.value = true
  setColumns.value = buildColumnsFromModel(model.setClause)
  nextTick(() => {
    internalUpdate.value = false
  })
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="!mutationStore.selectedTable" class="text-center text-gray-500 dark:text-gray-400 py-12">
      <UIcon name="i-heroicons-table-cells" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">テーブルを選択してください</p>
    </div>

    <div v-else-if="tableColumns.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-12">
      <UIcon name="i-heroicons-circle-stack" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">カラム情報が見つかりません</p>
    </div>

    <div v-else class="space-y-4">
      <div class="space-y-3">
        <SetColumnField
          v-for="sc in setColumns"
          :key="sc.id"
          :column="sc.column"
          :value="sc.value"
          :is-null="sc.isNull"
          @update:value="(val) => (sc.value = val)"
          @update:is-null="(val) => (sc.isNull = val)"
          @remove="removeColumn(sc.id)"
        />
      </div>

      <USelectMenu
        v-if="columnsForAdd.length > 0"
        v-model="columnToAdd"
        :items="columnsForAdd"
        label-key="name"
        :filter-fields="['name', 'displayType']"
        placeholder="カラムを追加"
        search-input
        class="max-w-xs"
        @update:model-value="addColumn"
      />

      <UAlert
        v-if="setColumns.length === 0"
        color="amber"
        icon="i-heroicons-exclamation-triangle"
        title="カラムが選択されていません"
        description="少なくとも1つのカラムを選択してください"
      />
    </div>
  </div>
</template>
