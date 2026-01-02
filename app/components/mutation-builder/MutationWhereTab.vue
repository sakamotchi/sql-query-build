<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import MutationConditionGroup from './MutationConditionGroup.vue'
import type { Column } from '@/types/database-structure'
import type { WhereCondition, ConditionGroup as ConditionGroupType } from '@/types/query'

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

const selectedTable = computed(() => mutationStore.selectedTable)

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

const tableAlias = computed(() => {
  if (!selectedTable.value) return ''
  return parseTableIdentifier(selectedTable.value).table
})

const whereConditions = computed<Array<WhereCondition | ConditionGroupType>>(() => {
  if (!mutationStore.queryModel || mutationStore.queryModel.type !== 'UPDATE') return []
  return mutationStore.queryModel.whereConditions
})

const isEmpty = computed(() => !selectedTable.value)
const hasColumns = computed(() => tableColumns.value.length > 0)

const availableColumns = computed(() => {
  if (!selectedTable.value) return []

  return tableColumns.value.map((column) => ({
    id: `${tableAlias.value}.${column.name}`,
    label: `${tableAlias.value}.${column.name}`,
    tableId: selectedTable.value,
    tableAlias: tableAlias.value,
    tableName: tableAlias.value,
    columnName: column.name,
    displayName: `${tableAlias.value}.${column.name}`,
    dataType: column.dataType,
  }))
})

const addCondition = () => {
  mutationStore.addWhereCondition({
    id: crypto.randomUUID(),
    type: 'condition',
    column: null,
    operator: '=',
    value: '',
    isValid: false,
  })
}

const addGroup = () => {
  mutationStore.addWhereConditionGroup({
    id: crypto.randomUUID(),
    type: 'group',
    logic: 'OR',
    conditions: [],
  })
}
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <div v-if="isEmpty" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-table-cells" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">テーブルを選択してください</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        WHERE条件を設定するにはテーブルが必要です
      </p>
    </div>

    <template v-else>
      <div v-if="!hasColumns" class="flex flex-col items-center justify-center h-full p-6 text-center">
        <UIcon name="i-heroicons-circle-stack" class="text-5xl text-gray-300 dark:text-gray-600" />
        <p class="text-gray-500 dark:text-gray-400 mt-4">カラム情報が見つかりません</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          テーブル情報を更新して再度お試しください
        </p>
      </div>

      <template v-else>
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">WHERE条件</span>
        <UButton
          label="条件追加"
          icon="i-heroicons-plus"
          size="sm"
          variant="soft"
          color="primary"
          @click="addCondition"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div
          v-if="whereConditions.length === 0"
          class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <UIcon name="i-heroicons-funnel" class="text-3xl text-gray-300 dark:text-gray-600" />
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            条件がありません。「条件追加」で追加してください。
          </p>
        </div>

        <template v-else>
          <MutationConditionGroup
            :conditions="whereConditions"
            :available-columns="availableColumns"
            :is-root="true"
            logic="AND"
          />

          <div class="mt-4">
            <UButton
              label="グループ追加"
              icon="i-heroicons-folder-plus"
              size="sm"
              variant="ghost"
              color="gray"
              @click="addGroup"
            />
          </div>
        </template>
      </div>
      </template>
    </template>
  </div>
</template>
