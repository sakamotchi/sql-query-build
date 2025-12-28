<script setup lang="ts">
import { computed } from 'vue'
import ColumnSelect from './ColumnSelect.vue'
import OperatorSelect from './OperatorSelect.vue'
import ValueInput from './ValueInput.vue'
import MultiValueInput from './MultiValueInput.vue'
import RangeInput from './RangeInput.vue'
import type { WhereCondition, WhereOperator } from '@/types/query'

interface AvailableColumn {
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
  condition: WhereCondition
  availableColumns: AvailableColumn[]
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<WhereCondition>): void
  (e: 'remove'): void
}>()

// 選択されたカラムの情報
const selectedColumn = computed(() => {
  if (!props.condition.column) return null
  return props.availableColumns.find(
    (c) =>
      c.tableAlias === props.condition.column?.tableAlias &&
      c.columnName === props.condition.column?.columnName
  )
})

// 値入力タイプ
const valueInputType = computed(() => {
  const op = props.condition.operator
  if (op === 'IS NULL' || op === 'IS NOT NULL') return 'none'
  if (op === 'IN' || op === 'NOT IN') return 'multi'
  if (op === 'BETWEEN') return 'range'
  return 'single'
})

// カラム変更
const handleColumnChange = (column: { tableAlias: string; columnName: string } | null) => {
  emit('update', {
    column,
    value: '',
    isValid: false,
  })
}

// 演算子変更
const handleOperatorChange = (operator: WhereOperator) => {
  let newValue: any = props.condition.value

  const isMulti = operator === 'IN' || operator === 'NOT IN'
  const isRange = operator === 'BETWEEN'
  const isNull = operator === 'IS NULL' || operator === 'IS NOT NULL'

  if (isNull) {
    newValue = ''
  } else if (isMulti) {
    // 配列でない場合は配列に変換
    if (!Array.isArray(newValue)) {
      if (typeof newValue === 'object' && newValue !== null && 'from' in newValue) {
        newValue = [] // Rangeからの変換等はリセット
      } else {
        newValue = newValue ? [newValue] : []
      }
    }
  } else if (isRange) {
    // Rangeでない場合は初期値設定
    if (typeof newValue !== 'object' || newValue === null || !('from' in newValue)) {
      newValue = { from: '', to: '' }
    }
  } else {
    // 単一値の場合
    if (Array.isArray(newValue)) {
      newValue = newValue[0] || ''
    } else if (typeof newValue === 'object' && newValue !== null && 'from' in newValue) {
      newValue = ''
    }
  }

  // 有効性チェック
  let isValid = false
  if (props.condition.column) {
    if (isNull) {
      isValid = true
    } else if (isMulti) {
      isValid = Array.isArray(newValue) && newValue.length > 0
    } else if (isRange) {
      isValid = typeof newValue === 'object' && newValue.from !== '' && newValue.to !== ''
    } else {
      isValid = newValue !== ''
    }
  }

  emit('update', {
    operator,
    value: newValue,
    isValid,
  })
}

// 値変更
const handleValueChange = (value: string | string[] | { from: string; to: string }) => {
  const isValid = checkValidity(value)
  emit('update', { value, isValid })
}

// バリデーションロジック（純粋関数的に）
const checkValidity = (value: any): boolean => {
  if (!props.condition.column) {
    return false
  } else if (props.condition.operator === 'IS NULL' || props.condition.operator === 'IS NOT NULL') {
    return true
  } else if (valueInputType.value === 'multi') {
    return Array.isArray(value) && value.length > 0
  } else if (valueInputType.value === 'range') {
    return typeof value === 'object' && value.from !== '' && value.to !== ''
  } else {
    return value !== ''
  }
}

// 既存のvalidateConditionは削除し、checkValidityを使用するように変更
// ただし、handleOperatorChangeでもisValid計算が必要なため、そこも修正が必要だが、
// handleOperatorChangeはすでに内部でisValidを計算している。
// 念のため共通化する。

/*
  FIX: handleOperatorChange内のisValid計算とcheckValidityを共通化したいが、
  handleOperatorChangeではnewValueを計算してからチェックしている。
  ここではhandleValueChangeの修正に集中する。
*/
</script>

<template>
  <div
    class="flex flex-wrap items-start gap-2 p-2 border rounded-md bg-white dark:bg-gray-800"
    :class="{ 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-900/10': !condition.isValid }"
  >
    <!-- カラム選択 -->
    <div class="flex-2 min-w-[150px] w-full sm:w-auto">
      <ColumnSelect
        :model-value="condition.column"
        :columns="availableColumns"
        @update:model-value="handleColumnChange"
      />
    </div>

    <!-- 演算子選択 -->
    <div class="flex-1 min-w-[140px] w-full sm:w-auto">
      <OperatorSelect
        :model-value="condition.operator"
        :data-type="selectedColumn?.dataType"
        @update:model-value="handleOperatorChange"
      />
    </div>

    <!-- 値入力 -->
    <div
      class="min-w-[150px]"
      :class="[
        valueInputType === 'range' 
          ? 'w-full basis-full mt-2' 
          : 'flex-2 w-full sm:w-auto'
      ]"
    >
      <template v-if="valueInputType === 'single'">
        <ValueInput
          :model-value="condition.value as string"
          :data-type="selectedColumn?.dataType"
          @update:model-value="handleValueChange"
        />
      </template>

      <template v-else-if="valueInputType === 'multi'">
        <MultiValueInput
          :model-value="condition.value as string[]"
          :data-type="selectedColumn?.dataType"
          @update:model-value="handleValueChange"
        />
      </template>

      <template v-else-if="valueInputType === 'range'">
        <RangeInput
          :model-value="condition.value as { from: string; to: string }"
          :data-type="selectedColumn?.dataType"
          @update:model-value="handleValueChange"
        />
      </template>

      <div v-else class="text-sm text-gray-500 italic py-1.5 px-2">
        （値不要）
      </div>
    </div>

    <!-- 削除ボタン -->
    <UButton
      icon="i-heroicons-x-mark"
      color="red"
      variant="ghost"
      size="sm"
      @click="emit('remove')"
    />
  </div>
</template>

<style scoped>
.flex-2 {
  flex: 2;
}
</style>
