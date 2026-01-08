<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueryBuilderStore, type AvailableColumn } from '@/stores/query-builder'
import draggable from 'vuedraggable'
import SelectColumnDialog from './SelectColumnDialog.vue'
import type { FunctionCall, SubqueryExpression } from '@/types/expression-node'

const queryBuilderStore = useQueryBuilderStore()

const dialogOpen = ref(false)

const hasTables = computed(() => queryBuilderStore.selectedTables.length > 0)
const parentTables = computed(() =>
  queryBuilderStore.selectedTables.map((table) => table.alias || table.name)
)

const localItems = ref<Array<{
  key: string
  preview: string
  alias: string | null
  remove: () => void
}>>([])

const syncLocalItems = () => {
  const items: Array<{
    key: string
    preview: string
    alias: string | null
    remove: () => void
  }> = []

  queryBuilderStore.selectedColumns.forEach((col) => {
    items.push({
      key: `column:${col.tableId}:${col.columnName}`,
      preview: `${col.tableAlias}.${col.columnName}`,
      alias: col.columnAlias,
      remove: () => queryBuilderStore.deselectColumn(col.tableId, col.columnName),
    })
  })

  queryBuilderStore.selectedExpressions.forEach((expr) => {
    items.push({
      key: `expression:${expr.id}`,
      preview: expr.expression,
      alias: expr.alias,
      remove: () => queryBuilderStore.removeExpression(expr.id),
    })
  })

  queryBuilderStore.selectedExpressionNodes.forEach((expr) => {
    items.push({
      key: `expression_node:${expr.id}`,
      preview: queryBuilderStore.getExpressionPreviewSql(expr),
      alias: expr.alias,
      remove: () => queryBuilderStore.removeExpressionNode(expr.id),
    })
  })

  // Sort items based on store.selectItemOrder
  if (queryBuilderStore.selectItemOrder && queryBuilderStore.selectItemOrder.length > 0) {
    const orderMap = new Map(
      queryBuilderStore.selectItemOrder.map((id, index) => [id, index])
    )
    items.sort((a, b) => {
      const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999999
      const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999999
      return indexA - indexB
    })
  }

  localItems.value = items
}

watch(
  [
    () => queryBuilderStore.selectedColumns,
    () => queryBuilderStore.selectedExpressions,
    () => queryBuilderStore.selectedExpressionNodes,
    () => queryBuilderStore.selectItemOrder,
  ],
  syncLocalItems,
  { deep: true, immediate: true }
)

const onDragChange = () => {
  const newOrder = localItems.value.map((item) => item.key)
  queryBuilderStore.updateSelectItemOrder(newOrder)
}

const openDialog = () => {
  dialogOpen.value = true
}

const handleDialogApply = (
  type: 'table' | 'function' | 'subquery' | 'expression',
  data: AvailableColumn[] | FunctionCall | SubqueryExpression | string,
  alias?: string
) => {
  const aliasValue = alias?.trim() || null

  if (type === 'table') {
    const columns = data as AvailableColumn[]
    const applyAlias = columns.length === 1 ? aliasValue : null

    columns.forEach((col) => {
      queryBuilderStore.selectColumn({
        tableId: col.tableId,
        tableAlias: col.tableAlias,
        columnName: col.columnName,
        columnAlias: applyAlias,
        dataType: col.dataType,
      })
    })
  } else if (type === 'function') {
    queryBuilderStore.addFunction(data as FunctionCall, aliasValue)
  } else if (type === 'subquery') {
    queryBuilderStore.addExpressionNode(data as SubqueryExpression, aliasValue)
  } else if (type === 'expression') {
    const expression = (data as string).trim()
    if (expression) {
      queryBuilderStore.addExpression(expression, aliasValue)
    }
  }

  dialogOpen.value = false
}

const handleDialogCancel = () => {
  dialogOpen.value = false
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <div v-if="!hasTables" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-table-cells" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">テーブルを選択してください</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        左パネルからテーブルをドラッグ＆ドロップ
      </p>
    </div>

    <div v-else class="h-full overflow-y-auto p-4">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">SELECT句の項目</h3>
          <UButton icon="i-heroicons-plus" @click="openDialog">
            項目を追加
          </UButton>
        </div>

        <div class="space-y-2">
          <draggable
            v-model="localItems"
            item-key="key"
            handle=".drag-handle"
            tag="div"
            :animation="200"
            class="space-y-2"
            ghost-class="opacity-50"
            :force-fallback="true"
            @change="onDragChange"
          >
            <template #item="{ element: item }">
              <UCard
                class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="drag-handle cursor-move p-1 text-gray-400 hover:text-gray-600 shrink-0 flex items-center">
                      <UIcon name="i-heroicons-bars-3" class="text-lg" />
                    </div>
                    <div class="min-w-0">
                       <p class="font-mono text-sm break-all">{{ item.preview }}</p>
                       <p v-if="item.alias" class="text-xs text-gray-500">AS {{ item.alias }}</p>
                    </div>
                  </div>
                  <UButton
                    icon="i-heroicons-trash"
                    variant="ghost"
                    color="red"
                    size="xs"
                    @click="item.remove"
                  />
                </div>
              </UCard>
            </template>
          </draggable>

          <div v-if="localItems.length === 0" class="text-center py-8 text-gray-500">
            「項目を追加」ボタンから SELECT 句の項目を追加してください
          </div>
        </div>
      </div>
    </div>
  </div>

  <SelectColumnDialog
    v-if="dialogOpen"
    :parent-tables="parentTables"
    @apply="handleDialogApply"
    @cancel="handleDialogCancel"
  />
</template>
