<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import GroupByRow from './GroupByRow.vue'
import draggable from 'vuedraggable'

const queryBuilderStore = useQueryBuilderStore()

// 選択されたテーブルがない場合
const isEmpty = computed(() => queryBuilderStore.selectedTables.length === 0)

// GROUP BYカラム
const groupByColumns = computed({
  get: () => queryBuilderStore.groupByColumns,
  set: (val) => {
    // ストア側でセッターがなければ直接入るが、アクション経由の方が良い場合は検討
    // 現状はストアのstateを直接バインドで動く想定
    queryBuilderStore.groupByColumns = val
  }
})

// 利用可能な全カラム（ColumnSelect用）
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

const addGroupByColumn = () => {
    queryBuilderStore.groupByColumns.push({
        id: crypto.randomUUID(),
        column: null
    })
    queryBuilderStore.regenerateSql()
}

const removeGroupByColumn = (id: string) => {
    const index = queryBuilderStore.groupByColumns.findIndex(c => c.id === id)
    if (index !== -1) {
      queryBuilderStore.groupByColumns.splice(index, 1)
      queryBuilderStore.regenerateSql()
    }
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
        <span class="text-sm font-medium">GROUP BY条件</span>
        <UButton
          label="カラム追加"
          icon="i-heroicons-plus"
          size="sm"
          variant="soft"
          @click="addGroupByColumn"
        />
      </div>

      <div class="p-4 overflow-y-auto flex-1">
        <!-- Draggableリスト -->
        <draggable 
           v-model="groupByColumns" 
           item-key="id"
           handle=".drag-handle"
           class="flex flex-col space-y-2"
           :animation="200"
           ghost-class="opacity-50"
           :force-fallback="true"
           @end="queryBuilderStore.regenerateSql()"
        >
          <template #item="{ element }">
             <GroupByRow 
                :item="element" 
                :available-columns="availableColumns"
                @remove="removeGroupByColumn(element.id)"
                @change="queryBuilderStore.regenerateSql()"
             />
          </template>
        </draggable>

        <div v-if="groupByColumns.length === 0" class="text-center text-gray-400 mt-8 text-sm">
           グループ化するカラムを追加してください
        </div>
      </div>
    </template>
  </div>
</template>
