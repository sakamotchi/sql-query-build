<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  dataType?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// 入力タイプ（データ型に応じて変更）
const inputType = computed(() => {
  if (!props.dataType) return 'text'

  const type = props.dataType.toLowerCase()
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal')) {
    return 'number'
  }
  if (type.includes('date') && !type.includes('time')) {
    return 'date'
  }
  if (type.includes('time') && !type.includes('date')) {
    return 'time'
  }
  if (type.includes('timestamp') || type.includes('datetime')) {
    return 'datetime-local'
  }
  return 'text'
})

// プレースホルダー
const placeholder = computed(() => {
  if (inputType.value === 'number') return '数値を入力'
  if (inputType.value === 'date') return '日付を選択'
  return '値を入力'
})
</script>

<template>
  <UInput
    v-model="value"
    :type="inputType"
    :placeholder="placeholder"
  />
</template>
