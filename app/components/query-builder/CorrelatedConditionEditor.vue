<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const { t } = useI18n()

type CorrelatedCondition = {
  id?: string
  column: string
  operator: string
  value: string
  isCorrelated: boolean
}

const props = defineProps<{
  modelValue: CorrelatedCondition
  tableColumns: { value: string; label: string }[]
  parentColumns: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CorrelatedCondition): void
}>()

const valueType = ref<'literal' | 'parent_column'>(
  props.modelValue.isCorrelated ? 'parent_column' : 'literal'
)

// オブジェクトバインディング用のcomputed
const selectedColumnItem = computed({
  get: () => props.tableColumns.find((col) => col.value === props.modelValue.column),
  set: (newItem) => updateModel({ column: newItem?.value ?? '' }),
})

const selectedParentColumnItem = computed({
  get: () => props.parentColumns.find((col) => col.value === props.modelValue.value),
  set: (newItem) => updateModel({ value: newItem?.value ?? '' }),
})

const valueTypes = computed(() => [
  { value: 'literal', label: t('queryBuilder.correlatedConditionEditor.types.literal') },
  { value: 'parent_column', label: t('queryBuilder.correlatedConditionEditor.types.parentColumn') },
])

const operators = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
]

watch(
  () => props.modelValue.isCorrelated,
  (isCorrelated) => {
    valueType.value = isCorrelated ? 'parent_column' : 'literal'
  }
)

function updateModel(updates: Partial<CorrelatedCondition>) {
  emit('update:modelValue', { ...props.modelValue, ...updates })
}

function onValueTypeChange() {
  updateModel({
    isCorrelated: valueType.value === 'parent_column',
    value: '',
  })
}
</script>

<template>
  <div class="correlated-condition-editor flex gap-2 flex-1">
    <USelectMenu
      v-model="selectedColumnItem"
      :items="tableColumns"
      by="value"
      searchable
      :placeholder="t('queryBuilder.correlatedConditionEditor.placeholders.column')"
      class="w-40"
    />

    <USelect
      :model-value="modelValue.operator"
      @update:model-value="updateModel({ operator: $event })"
      :items="operators"
      class="w-20"
    />

    <USelect
      v-model="valueType"
      :items="valueTypes"
      class="w-40"
      @update:model-value="onValueTypeChange"
    />

    <UInput
      v-if="valueType === 'literal'"
      :model-value="modelValue.value"
      @update:model-value="updateModel({ value: $event })"
      :placeholder="t('queryBuilder.correlatedConditionEditor.placeholders.value')"
      class="flex-1"
    />

    <USelectMenu
      v-else
      v-model="selectedParentColumnItem"
      :items="parentColumns"
      by="value"
      searchable
      :placeholder="t('queryBuilder.correlatedConditionEditor.placeholders.selectParentColumn')"
      class="flex-1"
    />
  </div>
</template>
