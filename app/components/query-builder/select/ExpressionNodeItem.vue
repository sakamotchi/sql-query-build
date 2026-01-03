<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedExpressionNode } from '@/types/query'
import { generatePreviewSql } from '@/utils/expression-preview'

const props = defineProps<{
  expression: SelectedExpressionNode
}>()

const emit = defineEmits<{
  (e: 'update', id: string, updates: Partial<SelectedExpressionNode>): void
  (e: 'remove', id: string): void
}>()

const aliasValue = computed({
  get: () => props.expression.alias ?? '',
  set: (value: string) => emit('update', props.expression.id, { alias: value }),
})

const preview = computed(() => generatePreviewSql(props.expression.expressionNode))

const handleRemove = () => {
  emit('remove', props.expression.id)
}
</script>

<template>
  <div class="p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col gap-2">
    <div class="text-xs text-gray-500 break-all">{{ preview }}</div>
    <div class="flex items-center gap-2">
      <UInput v-model="aliasValue" placeholder="エイリアス（任意）" size="xs" />
      <UButton
        icon="i-heroicons-x-mark"
        size="2xs"
        color="gray"
        variant="ghost"
        @click.stop="handleRemove"
      />
    </div>
  </div>
</template>
