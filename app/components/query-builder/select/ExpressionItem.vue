<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedExpression } from '@/types/query'
import { sqlIdentifierAttrs } from '@/composables/useSqlIdentifierInput'

const props = defineProps<{
  expression: SelectedExpression
}>()

const emit = defineEmits<{
  (e: 'update', id: string, updates: Partial<SelectedExpression>): void
  (e: 'remove', id: string): void
}>()

const expressionValue = computed({
  get: () => props.expression.expression,
  set: (value: string) => emit('update', props.expression.id, { expression: value }),
})

const aliasValue = computed({
  get: () => props.expression.alias ?? '',
  set: (value: string) => emit('update', props.expression.id, { alias: value }),
})

const handleRemove = () => {
  emit('remove', props.expression.id)
}
</script>

<template>
  <div class="p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col gap-2">
    <UInput v-model="expressionValue" placeholder="例: UPPER(u.name)" size="xs" v-bind="sqlIdentifierAttrs" />
    <div class="flex items-center gap-2">
      <UInput v-model="aliasValue" placeholder="エイリアス（任意）" size="xs" v-bind="sqlIdentifierAttrs" />
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
