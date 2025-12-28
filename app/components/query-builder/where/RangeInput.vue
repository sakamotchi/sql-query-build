<script setup lang="ts">
import { computed } from 'vue'

import ValueInput from './ValueInput.vue'

const props = defineProps<{
  // modelValueがオブジェクトであることを期待するが、any型で渡される可能性もあるため型安全に
  modelValue: { from: string; to: string } | any
  dataType?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { from: string; to: string }): void
}>()

const fromValue = computed({
  get: () => props.modelValue?.from || '',
  set: (v) => {
    const current = props.modelValue && typeof props.modelValue === 'object' ? props.modelValue : { from: '', to: '' }
    emit('update:modelValue', { from: v, to: current.to || '' })
  },
})

const toValue = computed({
  get: () => props.modelValue?.to || '',
  set: (v) => {
    const current = props.modelValue && typeof props.modelValue === 'object' ? props.modelValue : { from: '', to: '' }
    emit('update:modelValue', { from: current.from || '', to: v })
  },
})


</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <ValueInput
      v-model="fromValue"
      :data-type="dataType"
      class="flex-1 min-w-[120px] w-full sm:w-auto"
    />
    <span class="text-gray-500 w-full sm:w-auto text-center">〜</span>
    <ValueInput
      v-model="toValue"
      :data-type="dataType"
      class="flex-1 min-w-[120px] w-full sm:w-auto"
    />
  </div>
</template>
