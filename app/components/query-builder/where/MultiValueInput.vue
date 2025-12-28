<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  dataType?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const inputValue = ref('')

const values = computed({
  // modelValueがstring[]であることを保証（初期化時などundefinedの可能性考慮）
  get: () => Array.isArray(props.modelValue) ? props.modelValue : [],
  set: (v) => emit('update:modelValue', v),
})

/**
 * 値を追加
 */
const addValue = () => {
  const trimmed = inputValue.value.trim()
  if (trimmed && !values.value.includes(trimmed)) {
    emit('update:modelValue', [...values.value, trimmed])
    inputValue.value = ''
  }
}

/**
 * 値を削除
 */
const removeValue = (index: number) => {
  const newValues = [...values.value]
  newValues.splice(index, 1)
  emit('update:modelValue', newValues)
}

/**
 * Enterで追加
 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addValue()
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="values.length > 0" class="flex flex-wrap gap-1 min-h-6">
      <UBadge
        v-for="(val, index) in values"
        :key="index"
        color="primary"
        variant="subtle"
        size="sm"
        class="cursor-default"
      >
        {{ val }}
        <UIcon
          name="i-heroicons-x-mark"
          class="ml-1 cursor-pointer hover:text-red-500"
          @click="removeValue(index)"
        />
      </UBadge>
    </div>

    <UInput
      v-model="inputValue"
      placeholder="値を入力してEnter"
      @keydown="handleKeyDown"
    >
      <template #trailing>
        <UButton
          v-if="inputValue.trim()"
          color="gray"
          variant="link"
          icon="i-heroicons-plus"
          :padded="false"
          @click="addValue"
        />
      </template>
    </UInput>
  </div>
</template>
