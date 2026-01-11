<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ExpressionNode, SubqueryExpression } from '~/types/expression-node'
import type { WhereClause, WhereCondition, WhereOperator } from '~/types/query-model'
import { useQueryBuilderStore } from '~/stores/query-builder'
import { sqlIdentifierAttrs } from '~/composables/useSqlIdentifierInput'
import CorrelatedConditionEditor from './CorrelatedConditionEditor.vue'

type CorrelatedCondition = {
  id: string
  column: string
  operator: WhereOperator
  value: string
  isCorrelated: boolean
}

type LiteralValue = string | number | boolean | null

type TableOption = {
  id: string
  label: string
  schema: string
  table: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: SubqueryExpression | null
    parentTables?: string[]
    showFooter?: boolean
  }>(),
  {
    modelValue: null,
    parentTables: () => [],
    showFooter: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: SubqueryExpression): void
  (e: 'cancel'): void
}>()

const store = useQueryBuilderStore()

const selectedTableValue = ref('')
const tableAlias = ref('')
const selectType = ref<'column' | 'aggregate'>('aggregate')
const aggregateFunction = ref('COUNT')
const aggregateColumnValue = ref('*')
const selectedColumnValue = ref('')
const whereConditions = ref<CorrelatedCondition[]>([])

const tableOptions = computed<TableOption[]>(() =>
  store.availableTables.map((table) => ({
    id: `${table.schema}.${table.name}`,
    label: table.schema ? `${table.schema}.${table.name}` : table.name,
    schema: table.schema,
    table: table.name,
    value: table.name,
  }))
)

const tableColumns = computed(() => {
  if (!selectedTableValue.value) return []
  const table = store.availableTables.find((t) => t.name === selectedTableValue.value)
  if (!table) return []
  return table.columns.map((col) => ({
    value: col.name,
    label: `${col.name} (${col.displayType || col.dataType})`,
  }))
})

const parentColumns = computed(() => {
  if (!props.parentTables || props.parentTables.length === 0) return []

  return store.selectedTables
    .filter(
      (table) =>
        props.parentTables?.includes(table.alias) ||
        props.parentTables?.includes(table.name)
    )
    .flatMap((table) =>
      table.columns.map((col) => ({
        value: `${table.alias}.${col.name}`,
        label: `外部: ${table.alias}.${col.name}`,
      }))
    )
})

const selectTypes = [
  { value: 'column', label: '単一カラム' },
  { value: 'aggregate', label: '集計関数' },
]

const aggregateFunctions = [
  { value: 'COUNT', label: 'COUNT - 行数' },
  { value: 'SUM', label: 'SUM - 合計' },
  { value: 'AVG', label: 'AVG - 平均' },
  { value: 'MIN', label: 'MIN - 最小値' },
  { value: 'MAX', label: 'MAX - 最大値' },
]

const supportsStar = computed(() => aggregateFunction.value === 'COUNT')

const aggregateColumnOptions = computed(() => {
  const columns = tableColumns.value
  if (supportsStar.value) {
    return [{ value: '*', label: '* (全件)' }, ...columns]
  }
  return columns
})

const canSubmit = computed(() => {
  if (!selectedTableValue.value) return false
  if (selectType.value === 'aggregate') {
    if (!aggregateFunction.value) return false
    if (!supportsStar.value && !aggregateColumnValue.value) return false
    return true
  }
  return selectedColumnValue.value.trim().length > 0
})

const isSyncingFromModel = ref(false)

watch(
  () => selectedTableValue.value,
  (value) => {
    if (!value) return
    if (isSyncingFromModel.value) return
    if (!tableAlias.value) {
      tableAlias.value = value.charAt(0)
    }
    selectedColumnValue.value = ''
    if (!supportsStar.value) {
      aggregateColumnValue.value = ''
    } else {
      aggregateColumnValue.value = '*'
    }
    whereConditions.value = []
  }
)

watch(
  () => aggregateFunction.value,
  () => {
    if (!supportsStar.value && aggregateColumnValue.value === '*') {
      aggregateColumnValue.value = ''
    }
    if (supportsStar.value && !aggregateColumnValue.value) {
      aggregateColumnValue.value = '*'
    }
  }
)

watch(
  () => props.modelValue,
  async (value) => {
    if (!value) return
    isSyncingFromModel.value = true
    selectedTableValue.value = value.query.from
    tableAlias.value = value.query.alias ?? ''

    const selectNode = value.query.select
    if (selectNode.type === 'function' && selectNode.category === 'aggregate') {
      selectType.value = 'aggregate'
      aggregateFunction.value = selectNode.name
      if (selectNode.arguments.length === 0) {
        aggregateColumnValue.value = '*'
      } else if (selectNode.arguments[0]?.type === 'column') {
        aggregateColumnValue.value = selectNode.arguments[0].column
      }
    } else if (selectNode.type === 'column') {
      selectType.value = 'column'
      selectedColumnValue.value = selectNode.column
    }

    const whereClause = value.query.where
    if (whereClause?.conditions?.length) {
      whereConditions.value = whereClause.conditions
        .filter((item) => item.type === 'condition')
        .map((item) => {
          const condition = item as WhereCondition
          if (condition.value.type === 'column') {
            return {
              id: condition.id,
              column: condition.column.columnName,
              operator: condition.operator as WhereOperator,
              value: `${condition.value.tableAlias}.${condition.value.columnName}`,
              isCorrelated: true,
            }
          }
          // literal型の場合のみvalueプロパティを参照
          const literalValue = condition.value.type === 'literal' ? condition.value.value : ''
          return {
            id: condition.id,
            column: condition.column.columnName,
            operator: condition.operator as WhereOperator,
            value: String(literalValue ?? ''),
            isCorrelated: false,
          }
        })
    }
    
    await nextTick()
    isSyncingFromModel.value = false
  },
  { immediate: true }
)

// リアルタイムで親コンポーネントに変更を通知
watch(
  () => [
    selectedTableValue.value,
    tableAlias.value,
    selectType.value,
    aggregateFunction.value,
    aggregateColumnValue.value,
    selectedColumnValue.value,
    whereConditions.value,
  ],
  () => {
    // showFooterがfalseの場合のみリアルタイム更新
    if (!props.showFooter && !isSyncingFromModel.value) {
      if (!selectedTableValue.value) {
        return
      }

      const alias = tableAlias.value.trim()
      const effectiveAlias = alias || selectedTableValue.value

      let selectNode: ExpressionNode

      if (selectType.value === 'aggregate') {
        const args: ExpressionNode[] =
          aggregateColumnValue.value === '*' && supportsStar.value
            ? [{ type: 'column', column: '*' }]
            : [
                {
                  type: 'column',
                  table: effectiveAlias,
                  column: aggregateColumnValue.value,
                },
              ]

        selectNode = {
          type: 'function',
          name: aggregateFunction.value,
          category: 'aggregate',
          arguments: args,
        }
      } else {
        selectNode = {
          type: 'column',
          table: effectiveAlias,
          column: selectedColumnValue.value,
        }
      }

      const whereClause = buildWhereClause(effectiveAlias)

      const subquery: SubqueryExpression = {
        type: 'subquery',
        query: {
          select: selectNode,
          from: selectedTableValue.value,
          alias: alias || undefined,
          where: whereClause,
        },
      }

      emit('update:modelValue', subquery)
    }
  },
  { deep: true }
)

function addWhereCondition() {
  whereConditions.value.push({
    id: crypto.randomUUID(),
    column: '',
    operator: '=',
    value: '',
    isCorrelated: false,
  })
}

function removeWhereCondition(index: number) {
  whereConditions.value.splice(index, 1)
}

function parseLiteralValue(raw: string): LiteralValue {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === 'null') return null
  if (lower === 'true') return true
  if (lower === 'false') return false
  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && trimmed !== '') return numeric
  return trimmed
}

function parseParentColumn(value: string) {
  const [tableAlias, ...rest] = value.split('.')
  const columnName = rest.join('.')
  if (!tableAlias || !columnName) return null
  return { tableAlias, columnName }
}

function buildWhereClause(alias: string): WhereClause | undefined {
  const conditions = whereConditions.value
    .filter((condition) => condition.column && condition.value.trim().length > 0)
    .map((condition) => {
      const base = {
        type: 'condition' as const,
        id: condition.id,
        column: {
          tableAlias: alias,
          columnName: condition.column,
        },
        operator: condition.operator,
      }

      if (condition.isCorrelated) {
        const columnRef = parseParentColumn(condition.value)
        if (!columnRef) return null
        return {
          ...base,
          value: {
            type: 'column' as const,
            tableAlias: columnRef.tableAlias,
            columnName: columnRef.columnName,
          },
        }
      }

      return {
        ...base,
        value: {
          type: 'literal' as const,
          value: parseLiteralValue(condition.value),
        },
      }
    })
    .filter(Boolean) as WhereCondition[]

  if (conditions.length === 0) return undefined

  return {
    logic: 'AND',
    conditions,
  }
}

function buildSubquery() {
  if (!selectedTableValue.value) return

  const alias = tableAlias.value.trim()
  const effectiveAlias = alias || selectedTableValue.value

  let selectNode: ExpressionNode

  if (selectType.value === 'aggregate') {
    const args: ExpressionNode[] =
      aggregateColumnValue.value === '*' && supportsStar.value
        ? [{ type: 'column', column: '*' }]
        : [
            {
              type: 'column',
              table: effectiveAlias,
              column: aggregateColumnValue.value,
            },
          ]

    selectNode = {
      type: 'function',
      name: aggregateFunction.value,
      category: 'aggregate',
      arguments: args,
    }
  } else {
    selectNode = {
      type: 'column',
      table: effectiveAlias,
      column: selectedColumnValue.value,
    }
  }

  const whereClause = buildWhereClause(effectiveAlias)

  const subquery: SubqueryExpression = {
    type: 'subquery',
    query: {
      select: selectNode,
      from: selectedTableValue.value,
      alias: alias || undefined,
      where: whereClause,
    },
  }

  emit('update:modelValue', subquery)
}

function formatLiteral(value: LiteralValue) {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replace(/'/g, "''")}'`
}

const previewSql = computed(() => {
  if (!selectedTableValue.value) return ''
  const alias = tableAlias.value.trim() || selectedTableValue.value

  let selectPart = ''
  if (selectType.value === 'aggregate') {
    const arg =
      aggregateColumnValue.value === '*' && supportsStar.value
        ? '*'
        : `${alias}.${aggregateColumnValue.value}`
    selectPart = `${aggregateFunction.value}(${arg})`
  } else if (selectedColumnValue.value) {
    selectPart = `${alias}.${selectedColumnValue.value}`
  }

  if (!selectPart) return ''

  let sql = `(SELECT ${selectPart} FROM ${selectedTableValue.value}`
  if (tableAlias.value.trim()) {
    sql += ` ${tableAlias.value.trim()}`
  }

  const whereParts = whereConditions.value
    .filter((condition) => condition.column && condition.value.trim().length > 0)
    .map((condition) => {
      const left = `${alias}.${condition.column}`
      const right = condition.isCorrelated
        ? condition.value
        : formatLiteral(parseLiteralValue(condition.value))
      return `${left} ${condition.operator} ${right}`
    })

  if (whereParts.length > 0) {
    sql += ` WHERE ${whereParts.join(' AND ')}`
  }

  sql += ')'
  return sql
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">サブクエリビルダー</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        スカラー値を返すサブクエリを構築します
      </p>
    </template>

    <div class="space-y-4">
      <UFormField label="テーブル" name="table" required>
        <USelectMenu
          v-model="selectedTableValue"
          :items="tableOptions"
          value-key="value"
          searchable
          placeholder="テーブルを選択..."
          class="w-full"
        />
      </UFormField>

      <UFormField label="エイリアス（オプション）" name="alias">
        <UInput v-model="tableAlias" placeholder="例: o" v-bind="sqlIdentifierAttrs" />
      </UFormField>

      <div v-if="selectedTableValue">
        <UFormField label="SELECT句" name="selectType">
          <USelect v-model="selectType" :items="selectTypes" />
        </UFormField>

        <div v-if="selectType === 'aggregate'" class="mt-2 space-y-2">
          <UFormField label="集計関数" name="aggregateFunction">
            <USelect v-model="aggregateFunction" :items="aggregateFunctions" />
          </UFormField>

          <UFormField label="カラム" name="aggregateColumn">
            <USelectMenu
              v-model="aggregateColumnValue"
              :items="aggregateColumnOptions"
              value-key="value"
              searchable
              placeholder="カラムを選択..."
              class="w-full"
            />
          </UFormField>
        </div>

        <div v-else class="mt-2">
          <UFormField label="カラム" name="column">
            <USelectMenu
              v-model="selectedColumnValue"
              :items="tableColumns"
              value-key="value"
              searchable
              placeholder="カラムを選択..."
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <div v-if="selectedTableValue">
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium">WHERE条件</label>
          <UButton size="xs" @click="addWhereCondition">条件を追加</UButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="(condition, index) in whereConditions"
            :key="condition.id"
            class="flex gap-2 items-start"
          >
            <CorrelatedConditionEditor
              :model-value="condition"
              :table-columns="tableColumns"
              :parent-columns="parentColumns"
              @update:model-value="(val) => whereConditions[index] = { ...val, id: condition.id, operator: val.operator as WhereOperator }"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="removeWhereCondition(index)"
            />
          </div>
        </div>
      </div>

      <div v-if="previewSql" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">プレビュー:</p>
        <code class="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
          {{ previewSql }}
        </code>
      </div>

      <UAlert
        v-if="selectType === 'column'"
        color="warning"
        variant="soft"
        title="注意"
        description="サブクエリは必ずスカラー値（単一の値）を返す必要があります。複数行が返される場合はエラーになります。"
      />
    </div>

    <template v-if="props.showFooter" #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">キャンセル</UButton>
        <UButton :disabled="!canSubmit" @click="buildSubquery">追加</UButton>
      </div>
    </template>
  </UCard>
</template>
