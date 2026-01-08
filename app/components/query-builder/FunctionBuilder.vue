<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExpressionNode, FunctionCall } from '~/types/expression-node'
import { getFunctionCatalog } from '~/data/function-catalog'
import { generatePreviewSql } from '~/utils/expression-preview'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import { sqlIdentifierAttrs } from '@/composables/useSqlIdentifierInput'
import ArgumentEditor from './ArgumentEditor.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: FunctionCall | null
    showAlias?: boolean
    allowNested?: boolean
    showFooter?: boolean
  }>(),
  {
    modelValue: null,
    showAlias: true,
    allowNested: true,
    showFooter: true,
  }
)

const emit = defineEmits<{
  (e: 'apply', value: FunctionCall, alias?: string | null): void
  (e: 'cancel'): void
  (e: 'update:modelValue', value: FunctionCall | null): void
}>()

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()

const selectedCategory = ref<string>('string')
const selectedFunctionItem = ref<{ value: string; label: string } | null>(null)
const functionArgs = ref<ExpressionNode[]>([])
const aliasValue = ref<string>('')
const isInternalUpdate = ref(false) // 内部更新フラグ

const selectedFunction = computed(() => selectedFunctionItem.value?.value || '')

const currentDbType = computed(() => {
  const active = connectionStore.activeConnection
  if (active?.type) return active.type

  const connectionId = windowStore.currentConnectionId
  const fallback = connectionStore.connections.find((c) => c.id === connectionId)
  return fallback?.type || 'postgresql'
})

const availableFunctions = computed(() => getFunctionCatalog(currentDbType.value))

const categories = computed(() => {
  const uniqueCategories = [...new Set(availableFunctions.value.map((f) => f.category))]
  return uniqueCategories.map((cat) => ({
    value: cat,
    label: getCategoryLabel(cat),
  }))
})

const functions = computed(() => {
  return availableFunctions.value
    .filter((f) => f.category === selectedCategory.value)
    .map((f) => ({
      value: f.name,
      label: `${f.name} - ${f.description}`,
    }))
})

const functionDef = computed(() =>
  availableFunctions.value.find((f) => f.name === selectedFunction.value)
)

const argumentCount = computed(() => functionDef.value?.paramCount ?? 0)
const argumentCountValid = computed(() => {
  if (!functionDef.value) return false
  if (argumentCount.value === 'variable') return functionArgs.value.length > 0
  return functionArgs.value.length === argumentCount.value
})

const canAddArgument = computed(() => {
  if (argumentCount.value === 'variable') return true
  if (typeof argumentCount.value === 'number') {
    return functionArgs.value.length < argumentCount.value
  }
  return false
})

const canRemoveArgument = computed(() => (index: number) => {
  if (argumentCount.value === 'variable') return functionArgs.value.length > 1
  if (typeof argumentCount.value === 'number') {
    return functionArgs.value.length > argumentCount.value
  }
  return false
})

const argumentsValid = computed(() => functionArgs.value.every(isArgumentValid))

const canSubmit = computed(() => {
  if (!selectedFunction.value) return false
  if (!argumentCountValid.value) return false
  return argumentsValid.value
})

const previewSql = computed(() => {
  if (!selectedFunction.value) return ''
  const func: FunctionCall = {
    type: 'function',
    name: selectedFunction.value,
    category: (functionDef.value?.category || selectedCategory.value) as FunctionCall['category'],
    arguments: functionArgs.value,
  }
  return generatePreviewSql(func)
})

watch(
  () => props.modelValue,
  (value) => {
    if (isInternalUpdate.value) {
      isInternalUpdate.value = false
      return
    }
    if (!value) return
    selectedCategory.value = value.category
    const funcItem = functions.value.find((f: { value: string; label: string }) => f.value === value.name)
    if (funcItem) {
      selectedFunctionItem.value = funcItem
    }
    functionArgs.value = value.arguments.map((arg) => ({ ...arg }))
  },
  { immediate: true }
)

watch(
  () => selectedCategory.value,
  () => {
    if (!selectedFunction.value) return
    const exists = functions.value.some((item) => item.value === selectedFunction.value)
    if (!exists) {
      selectedFunctionItem.value = null
      functionArgs.value = []
    }
  }
)

watch(
  () => selectedFunction.value,
  () => {
    const def = functionDef.value
    if (!def) {
      functionArgs.value = []
      return
    }
    if (def.paramCount === 0) {
      functionArgs.value = []
      return
    }
    if (def.paramCount === 'variable') {
      if (functionArgs.value.length === 0) {
        functionArgs.value = [createDefaultArgument()]
      }
      return
    }

    const desiredCount = def.paramCount
    if (functionArgs.value.length > desiredCount) {
      functionArgs.value = functionArgs.value.slice(0, desiredCount)
      return
    }
    if (functionArgs.value.length < desiredCount) {
      const shortage = desiredCount - functionArgs.value.length
      functionArgs.value = functionArgs.value.concat(
        Array.from({ length: shortage }, () => createDefaultArgument())
      )
    }
  }
)

// リアルタイムで親コンポーネントに変更を通知
watch(
  () => [selectedFunction.value, selectedCategory.value, functionArgs.value],
  () => {
    // showFooterがfalseの場合のみリアルタイム更新
    if (!props.showFooter) {
      if (!selectedFunction.value || !functionDef.value) {
        isInternalUpdate.value = true
        emit('update:modelValue', null)
        return
      }

      const func: FunctionCall = {
        type: 'function',
        name: selectedFunction.value,
        category: functionDef.value.category,
        arguments: functionArgs.value,
      }

      isInternalUpdate.value = true
      emit('update:modelValue', func)
    }
  },
  { deep: true }
)

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    string: '文字列関数',
    date: '日付関数',
    numeric: '数値関数',
    conditional: '条件関数',
    aggregate: '集計関数',
  }
  return labels[category] || category
}

function createDefaultArgument(): ExpressionNode {
  return {
    type: 'column',
    column: '',
  }
}

function isArgumentValid(arg: ExpressionNode): boolean {
  if (arg.type === 'column') {
    return Boolean(arg.column && arg.column.trim())
  }
  if (arg.type === 'literal') {
    return arg.valueType !== undefined && arg.value !== null && arg.value !== undefined
  }
  if (arg.type === 'function') {
    return Boolean(arg.name && arg.name.trim())
  }
  return false
}

function addArgument() {
  if (argumentCount.value !== 'variable') return
  functionArgs.value.push(createDefaultArgument())
}

function removeArgument(index: number) {
  functionArgs.value.splice(index, 1)
}

function buildFunction() {
  if (!functionDef.value) return

  const func: FunctionCall = {
    type: 'function',
    name: selectedFunction.value,
    category: functionDef.value.category,
    arguments: functionArgs.value,
  }

  emit('apply', func, props.showAlias ? aliasValue.value.trim() || null : null)
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-base font-semibold">関数ビルダー</h3>
    </template>

    <div class="space-y-4">
      <UFormField label="カテゴリ" name="category">
        <USelect v-model="selectedCategory" :items="categories" value-key="value" />
      </UFormField>

      <UFormField label="関数" name="function">
        <USelectMenu
          v-model="selectedFunctionItem"
          :items="functions"
          searchable
          placeholder="関数を選択..."
          class="w-full"
        />
      </UFormField>

      <div v-if="functionDef" class="p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ functionDef.description }}
        </p>
        <p class="text-xs text-gray-500 mt-1">
          引数: {{ functionDef.paramCount }} 個
        </p>
        <p v-if="functionDef.example" class="text-xs text-gray-500 mt-1">
          例: {{ functionDef.example }}
        </p>
      </div>

      <div v-if="selectedFunction && argumentCount !== 0">
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium">引数</label>
          <UButton size="xs" :disabled="!canAddArgument" @click="addArgument">
            引数を追加
          </UButton>
        </div>

        <div class="space-y-2">
          <div v-for="(arg, index) in functionArgs" :key="index" class="flex gap-2 items-center">
            <ArgumentEditor
              v-model="functionArgs[index]"
              :index="index"
              :allow-function="props.allowNested"
            />
            <UButton
              v-if="canRemoveArgument(index)"
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="removeArgument(index)"
            />
          </div>
        </div>
      </div>

      <UFormField v-if="props.showAlias" label="エイリアス" name="alias">
        <UInput
          v-model="aliasValue"
          placeholder="例: upper_name"
          v-bind="sqlIdentifierAttrs"
        />
      </UFormField>

      <div v-if="previewSql" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">プレビュー:</p>
        <code class="text-sm text-blue-600 dark:text-blue-400">{{ previewSql }}</code>
      </div>

      <p v-if="selectedFunction && !argumentCountValid" class="text-xs text-red-500">
        引数の数が正しくありません
      </p>
    </div>

    <template v-if="props.showFooter" #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('cancel')">キャンセル</UButton>
        <UButton :disabled="!canSubmit" @click="buildFunction">追加</UButton>
      </div>
    </template>
  </UCard>
</template>
