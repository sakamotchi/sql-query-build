<script setup lang="ts">
import { computed } from 'vue'

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
  set: (v) => emit('update:modelValue', { ...props.modelValue, from: v }),
})

const toValue = computed({
  get: () => props.modelValue?.to || '',
  set: (v) => emit('update:modelValue', { ...props.modelValue, to: v }),
})
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput
      v-model="fromValue"
      placeholder="開始値"
      class="flex-1"
    />
    <span class="text-gray-500">〜</span>
    <UInput
      v-model="toValue"
      placeholder="終了値"
      class="flex-1"
    />
  </div>
</template>
