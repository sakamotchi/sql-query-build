<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FunctionCall } from '@/types/expression-node'
import type { AvailableColumn } from '@/stores/query-builder'
import { sqlIdentifierAttrs } from '@/composables/useSqlIdentifierInput'
import ColumnSelector from './ColumnSelector.vue'
import FunctionBuilder from '../FunctionBuilder.vue'

const emit = defineEmits<{
  (
    e: 'apply',
    type: 'table' | 'function' | 'subquery' | 'expression',
    data: AvailableColumn[] | FunctionCall | string,
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
    label: 'テーブルから選択',
    icon: 'i-heroicons-table-cells',
    description: 'テーブルのカラムを選択します',
  },
  {
    value: 'function',
    label: 'データベース関数',
    icon: 'i-heroicons-calculator',
    description: 'UPPER、CONCAT等の関数を使用します',
  },
  {
    value: 'subquery',
    label: 'サブクエリ',
    icon: 'i-heroicons-queue-list',
    description: 'サブクエリで値を取得します',
    disabled: true,
    badge: 'Phase 3',
  },
  {
    value: 'expression',
    label: '式の組み合わせ（自由入力）',
    icon: 'i-heroicons-code-bracket',
    description: 'SQL式を直接入力します（例: price * quantity）',
  },
]

const selectedTypeOption = ref<TypeOption>(typeOptions[0]!)
const alias = ref('')

const selectedColumns = ref<AvailableColumn[]>([])
const functionNode = ref<FunctionCall | null>(null)
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
      return false
    default:
      return false
  }
})

const aliasDisabled = computed(
  () => selectedType.value === 'table' && selectedColumns.value.length > 1
)

const aliasDescription = computed(() => {
  if (aliasDisabled.value) {
    return '複数選択時はエイリアスを指定できません'
  }
  return 'AS句で指定する別名'
})

function handleApply() {
  let data: AvailableColumn[] | FunctionCall | string

  switch (selectedType.value) {
    case 'table':
      data = selectedColumns.value
      break
    case 'function':
      data = functionNode.value as FunctionCall
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
    title="SELECT項目を追加"
    description="SELECT句に追加する項目を選択してください。"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="項目タイプ" name="type">
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
            <label class="text-sm font-medium">カラムを選択</label>
            <ColumnSelector v-model="selectedColumns" :multiple="true" />
            <p class="text-xs text-gray-500">
              複数選択可能です。Ctrl/Cmd+クリックで複数選択できます。
            </p>
          </div>

          <div v-else-if="selectedType === 'function'">
            <FunctionBuilder
              v-model="functionNode"
              :show-alias="false"
              :show-footer="false"
            />
          </div>

          <div v-else-if="selectedType === 'subquery'" class="p-6 bg-gray-50 dark:bg-gray-800 rounded text-center">
            <UIcon name="i-heroicons-clock" class="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p class="text-sm text-gray-600 dark:text-gray-400">Phase 3で実装予定</p>
            <p class="text-xs text-gray-500 mt-1">サブクエリビルダーはPhase 3で追加されます</p>
          </div>

          <div v-else-if="selectedType === 'expression'" class="space-y-2">
            <UFormField
              label="SQL式"
              name="expression"
              description="例: price * quantity, CASE WHEN ... END"
            >
              <UTextarea v-model="expressionText" placeholder="price * quantity" :rows="4" />
            </UFormField>
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p class="text-xs text-gray-600 dark:text-gray-400">
                <strong>ヒント:</strong> 式の組み合わせでは、算術演算子（+, -, *, /）や
                CASE文などの複雑なSQL式を直接入力できます。
              </p>
            </div>
          </div>
        </div>

        <UFormField
          v-if="selectedType !== 'subquery'"
          label="エイリアス（オプション）"
          name="alias"
          :description="aliasDescription"
        >
          <UInput
            v-model="alias"
            placeholder="例: total_price, upper_name"
            :disabled="aliasDisabled"
            v-bind="sqlIdentifierAttrs"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">
          キャンセル
        </UButton>
        <UButton :disabled="!canSubmit" @click="handleApply">
          追加
        </UButton>
      </div>
    </template>
  </UModal>
</template>
