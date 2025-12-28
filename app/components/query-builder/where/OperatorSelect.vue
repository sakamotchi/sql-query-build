<script setup lang="ts">
import { computed } from 'vue'
import type { WhereOperator } from '@/types/query'

const props = defineProps<{
  modelValue: WhereOperator
  dataType?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: WhereOperator): void
}>()

// 全演算子
const allOperators: Array<{ value: WhereOperator; label: string }> = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'IN', label: 'IN' },
  { value: 'NOT IN', label: 'NOT IN' },
  { value: 'BETWEEN', label: 'BETWEEN' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
]

// データ型に応じてフィルタリング（将来的にはここを洗練させる）
const availableOperators = computed(() => {
  return allOperators
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <USelect
    v-model="selected"
    :items="availableOperators"
    class="w-full"
  />
</template>
