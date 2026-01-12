<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FunctionCall, SubqueryExpression } from '@/types/expression-node'
import type { AvailableColumn } from '@/stores/query-builder'
import { sqlIdentifierAttrs } from '@/composables/useSqlIdentifierInput'
import ColumnSelector from './ColumnSelector.vue'
import FunctionBuilder from '../FunctionBuilder.vue'
import SubqueryBuilder from '../SubqueryBuilder.vue'

const { t } = useI18n()
const props = defineProps<{
  parentTables?: string[]
}>()

const emit = defineEmits<{
  (
    e: 'apply',
    type: 'table' | 'function' | 'subquery' | 'expression',
    data: AvailableColumn[] | FunctionCall | SubqueryExpression | string,
    alias?: string
  ): void
  (e: 'cancel'): void
}>()

const isOpen = ref(true)

interface TypeOption {
  value: 'table' | 'function' | 'subquery' | 'expression'
  label: string
  icon: string
  description: string
  disabled?: boolean
  badge?: string
}

const typeOptions: TypeOption[] = [
  {
    value: 'table',
    label: t('queryBuilder.selectColumnDialog.types.table'),
    icon: 'i-heroicons-table-cells',
    description: t('queryBuilder.selectColumnDialog.types.tableDesc'),
  },
  {
    value: 'function',
    label: t('queryBuilder.selectColumnDialog.types.function'),
    icon: 'i-heroicons-calculator',
    description: t('queryBuilder.selectColumnDialog.types.functionDesc'),
  },
  {
    value: 'subquery',
    label: t('queryBuilder.selectColumnDialog.types.subquery'),
    icon: 'i-heroicons-queue-list',
    description: t('queryBuilder.selectColumnDialog.types.subqueryDesc'),
  },
  {
    value: 'expression',
    label: t('queryBuilder.selectColumnDialog.types.expression'),
    icon: 'i-heroicons-code-bracket',
    description: t('queryBuilder.selectColumnDialog.types.expressionDesc'),
  },
]

const selectedTypeOption = ref<TypeOption>(typeOptions[0]!)
const alias = ref('')

const selectedColumns = ref<AvailableColumn[]>([])
const functionNode = ref<FunctionCall | null>(null)
const subqueryNode = ref<SubqueryExpression | null>(null)
const expressionText = ref('')

// 選択されたタイプの値を取得する算出プロパティ
const selectedType = computed(() => selectedTypeOption.value.value)

const canSubmit = computed(() => {
  switch (selectedType.value) {
    case 'table':
      return selectedColumns.value.length > 0
    case 'function':
      if (!functionNode.value) return false
      // 引数の検証
      const args = functionNode.value.arguments
      if (args.length === 0) return true // 引数なしの関数（例：NOW()）
      return args.every((arg) => {
        if (arg.type === 'column') return Boolean(arg.column && arg.column.trim())
        if (arg.type === 'literal') return arg.valueType !== undefined && arg.value !== null && arg.value !== undefined
        if (arg.type === 'function') return Boolean(arg.name && arg.name.trim())
        return false
      })
    case 'expression':
      return expressionText.value.trim().length > 0
    case 'subquery':
      return subqueryNode.value !== null
    default:
      return false
  }
})

const aliasDisabled = computed(
  () => selectedType.value === 'table' && selectedColumns.value.length > 1
)

const aliasDescription = computed(() => {
  if (aliasDisabled.value) {
    return t('queryBuilder.selectColumnDialog.aliasMultiHint')
  }
  return t('queryBuilder.selectColumnDialog.aliasDesc')
})

function handleApply() {
  let data: AvailableColumn[] | FunctionCall | SubqueryExpression | string

  switch (selectedType.value) {
    case 'table':
      data = selectedColumns.value
      break
    case 'function':
      data = functionNode.value as FunctionCall
      break
    case 'subquery':
      data = subqueryNode.value as SubqueryExpression
      break
    case 'expression':
      data = expressionText.value.trim()
      break
    default:
      return
  }

  const aliasValue = alias.value.trim()
  emit('apply', selectedType.value, data, aliasValue || undefined)
}

// モーダルが閉じられたときにcancelイベントを発火
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('cancel')
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('queryBuilder.selectColumnDialog.title')"
    :description="t('queryBuilder.selectColumnDialog.description')"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('queryBuilder.selectColumnDialog.itemType')" name="type">
          <div class="space-y-2">
            <USelectMenu
              v-model="selectedTypeOption"
              :items="typeOptions"
              class="w-full"
              :ui="{
                content: 'min-w-[600px]',
              }"
            >
              <template #leading>
                <UIcon :name="selectedTypeOption.icon" class="w-4 h-4" />
              </template>
            </USelectMenu>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ selectedTypeOption.description }}
            </div>
          </div>
        </UFormField>

        <div class="border-t pt-4">
          <div v-if="selectedType === 'table'" class="space-y-2">
            <label class="text-sm font-medium">{{ t('queryBuilder.selectColumnDialog.selectColumn') }}</label>
            <ColumnSelector v-model="selectedColumns" :multiple="true" />
            <p class="text-xs text-gray-500">
              {{ t('queryBuilder.selectColumnDialog.multiSelectHint') }}
            </p>
          </div>

          <div v-else-if="selectedType === 'function'">
            <FunctionBuilder
              v-model="functionNode"
              :show-alias="false"
              :show-footer="false"
            />
          </div>

          <div v-else-if="selectedType === 'subquery'">
            <SubqueryBuilder
              v-model="subqueryNode"
              :parent-tables="props.parentTables"
              :show-footer="false"
            />
          </div>

          <div v-else-if="selectedType === 'expression'" class="space-y-2">
            <UFormField
              :label="t('queryBuilder.selectColumnDialog.sqlExpression')"
              name="expression"
              :description="t('queryBuilder.selectColumnDialog.expressionExample')"
            >
              <UTextarea
                v-model="expressionText"
                placeholder="price * quantity"
                :rows="4"
                class="w-full"
              />
            </UFormField>
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p class="text-xs text-gray-600 dark:text-gray-400">
                <strong>{{ t('common.labels.hint') }}:</strong> {{ t('queryBuilder.selectColumnDialog.expressionHint') }}
              </p>
            </div>
          </div>
        </div>

        <UFormField
          :label="t('queryBuilder.selectColumnDialog.alias')"
          name="alias"
          :description="aliasDescription"
        >
          <UInput
            v-model="alias"
            :placeholder="t('queryBuilder.selectColumnDialog.aliasPlaceholder')"
            :disabled="aliasDisabled"
            v-bind="sqlIdentifierAttrs"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">
          {{ t('common.actions.cancel') }}
        </UButton>
        <UButton :disabled="!canSubmit" @click="handleApply">
          {{ t('common.actions.add') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
