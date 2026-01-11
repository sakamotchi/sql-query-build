<script setup lang="ts">
import { useQueryBuilderStore } from '@/stores/query-builder'
import ConditionGroup from './ConditionGroup.vue'

const queryBuilderStore = useQueryBuilderStore()

// 選択されたテーブル
const selectedTables = computed(() => queryBuilderStore.selectedTables)

// WHERE条件
const whereConditions = computed(() => queryBuilderStore.whereConditions)

// テーブルがない場合
const isEmpty = computed(() => selectedTables.value.length === 0)

// 利用可能なカラム
const availableColumns = computed(() => {
  const columns: Array<{
    id: string
    label: string
    tableId: string
    tableAlias: string
    tableName: string
    columnName: string
    displayName: string
    dataType: string
  }> = []

  // console.log('WhereTab selectedTables:', selectedTables.value)

  for (const table of selectedTables.value) {
    if (!table.columns) {
      console.warn('Table has no columns:', table)
      continue
    }
    for (const column of table.columns) {
      columns.push({
        id: `${table.alias}.${column.name}`,
        label: `${table.alias}.${column.name}`, // USelectMenu用
        tableId: table.id,
        tableAlias: table.alias,
        tableName: table.name,
        columnName: column.name,
        displayName: `${table.alias}.${column.name}`,
        dataType: column.dataType,
      })
    }
  }

  // console.log('WhereTab calculated availableColumns:', columns)
  return columns
})

/**
 * 条件を追加
 */
const addCondition = () => {
  queryBuilderStore.addWhereCondition({
    id: crypto.randomUUID(),
    type: 'condition',
    column: null,
    operator: '=',
    value: '',
    isValid: false,
  })
}

/**
 * グループを追加
 */
const addGroup = () => {
  queryBuilderStore.addWhereConditionGroup({
    id: crypto.randomUUID(),
    type: 'group',
    logic: 'OR',
    conditions: [],
  })
}
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <!-- 空状態 -->
    <div v-if="isEmpty" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-table-cells" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">テーブルを選択してください</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        WHERE条件を設定するにはテーブルが必要です
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
        <!-- 条件なし -->
        <div v-if="whereConditions.length === 0" class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <UIcon name="i-heroicons-funnel" class="text-3xl text-gray-300 dark:text-gray-600" />
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            条件がありません。「条件追加」で追加してください。
          </p>
        </div>

        <!-- 条件グループ -->
        <template v-else>
          <ConditionGroup
            :conditions="whereConditions"
            :available-columns="availableColumns"
            :is-root="true"
            logic="AND"
          />

          <!-- グループ追加ボタン -->
          <div class="mt-4">
            <UButton
              label="グループ追加"
              icon="i-heroicons-folder-plus"
              size="sm"
              variant="ghost"
              color="neutral"
              @click="addGroup"
            />
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
