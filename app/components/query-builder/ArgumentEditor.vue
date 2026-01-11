<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import type { ExpressionNode, FunctionCall } from '~/types/expression-node'
import { useQueryBuilderStore } from '~/stores/query-builder'
import { generatePreviewSql } from '~/utils/expression-preview'

const { t } = useI18n()

const FunctionBuilder = defineAsyncComponent(() => import('./FunctionBuilder.vue'))

const props = withDefaults(
  defineProps<{
    modelValue: ExpressionNode
    index: number
    allowFunction?: boolean
  }>(),
  {
    allowFunction: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ExpressionNode): void
}>()

const store = useQueryBuilderStore()

const argType = ref<'column' | 'literal' | 'function'>(
  props.modelValue.type as 'column' | 'literal' | 'function'
)
const literalType = ref<'string' | 'number'>('string')
const literalValue = ref<string>('')

const nestedOpen = ref(false)

const argTypes = computed(() => {
  const base = [
    { value: 'column', label: t('queryBuilder.argumentEditor.types.column') },
    { value: 'literal', label: t('queryBuilder.argumentEditor.types.literal') },
  ]
  if (props.allowFunction) {
    base.push({ value: 'function', label: t('queryBuilder.argumentEditor.types.function') })
  }
  return base
})

const columnItems = computed(() =>
  store.availableColumns.map((col) => ({
    value: col.id,
    label: col.label,
  }))
)

const selectedColumn = computed({
  get: () => {
    if (props.modelValue.type !== 'column') return undefined
    const table = props.modelValue.table
    return table ? `${table}.${props.modelValue.column}` : props.modelValue.column
  },
  set: (value: string | undefined) => {
    if (!value) {
      emit('update:modelValue', { type: 'column', column: '' })
      return
    }
    const parts = value.split('.')
    const table = parts.length > 1 ? parts[0] : undefined
    const column = parts.length > 1 ? parts.slice(1).join('.') : value
    emit('update:modelValue', { type: 'column', table, column })
  },
})

const functionPreview = computed(() => {
  if (props.modelValue.type !== 'function') return ''
  if (!props.modelValue.name) return ''
  return generatePreviewSql(props.modelValue)
})

watch(
  () => props.modelValue,
  (value) => {
    argType.value = value.type as 'column' | 'literal' | 'function'
    if (value.type === 'literal') {
      literalType.value = value.valueType === 'number' ? 'number' : 'string'
      literalValue.value = value.value !== null ? String(value.value) : ''
    }
  },
  { immediate: true }
)

watch(
  () => argType.value,
  () => {
    if (argType.value === 'column') {
      emit('update:modelValue', { type: 'column', column: '' })
    } else if (argType.value === 'literal') {
      emitLiteral()
    } else if (argType.value === 'function' && props.allowFunction) {
      emit('update:modelValue', {
        type: 'function',
        name: '',
        category: 'string',
        arguments: [],
      })
    }
  }
)

watch(
  () => [literalType.value, literalValue.value],
  () => {
    if (argType.value === 'literal') emitLiteral()
  }
)

function emitLiteral() {
  const value =
    literalType.value === 'number'
      ? Number(literalValue.value || 0)
      : literalValue.value

  emit('update:modelValue', {
    type: 'literal',
    valueType: literalType.value,
    value,
  })
}

function openNestedBuilder() {
  nestedOpen.value = true
}

function handleNestedApply(func: FunctionCall) {
  emit('update:modelValue', func)
  nestedOpen.value = false
}

function handleNestedCancel() {
  nestedOpen.value = false
}
</script>

<template>
  <div class="flex gap-2 flex-1 items-center">
    <USelect v-model="argType" :items="argTypes" value-key="value" class="w-32" />

    <USelectMenu
      v-if="argType === 'column'"
      v-model="selectedColumn"
      :items="columnItems"
      value-key="value"
      searchable
      :placeholder="t('queryBuilder.argumentEditor.placeholders.selectColumn')"
      class="flex-1"
    />

    <div v-else-if="argType === 'literal'" class="flex gap-2 flex-1">
      <USelect
        v-model="literalType"
        :items="[
          { value: 'string', label: t('queryBuilder.argumentEditor.labels.string') },
          { value: 'number', label: t('queryBuilder.argumentEditor.labels.number') }
        ]"
        value-key="value"
        class="w-24"
      />
      <UInput
        v-model="literalValue"
        :type="literalType === 'number' ? 'number' : 'text'"
        :placeholder="t('queryBuilder.argumentEditor.placeholders.inputVal')"
        class="flex-1"
      />
    </div>

    <div v-else-if="argType === 'function'" class="flex gap-2 flex-1">
      <UButton variant="outline" size="sm" class="flex-1" @click="openNestedBuilder">
        {{ functionPreview || t('queryBuilder.argumentEditor.placeholders.selectFunction') }}
      </UButton>
    </div>
  </div>

  <UModal v-model:open="nestedOpen" :title="t('queryBuilder.argumentEditor.nested.title')" :description="t('queryBuilder.argumentEditor.nested.desc')">
    <template #body>
      <FunctionBuilder
        :model-value="props.modelValue.type === 'function' ? props.modelValue : null"
        :show-alias="false"
        :allow-nested="false"
        @apply="handleNestedApply"
        @cancel="handleNestedCancel"
      />
    </template>
  </UModal>
</template>
