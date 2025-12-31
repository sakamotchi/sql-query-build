<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useQueryBuilderStore } from '@/stores/query-builder'
import JoinConditionRow from './JoinConditionRow.vue'
import JoinSuggestionList from '../join/JoinSuggestionList.vue'
import type { JoinClause, JoinCondition, SelectedTable } from '@/types/query-model'
import type { JoinSuggestion } from '@/types/join-suggestion'

interface Props {
  join?: JoinClause  // 編集時は既存JOIN、追加時はundefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'save', join: JoinClause | Omit<JoinClause, 'id'>): void
}>()

const store = useQueryBuilderStore()
const { joinSuggestions, isLoadingJoinSuggestions } = storeToRefs(store)

// ダイアログの開閉状態
const isOpen = defineModel<boolean>({ required: true })

// フォーム状態
interface FormState {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  selectedTable: SelectedTable | null
  tableAlias: string
  conditions: JoinCondition[]
  conditionLogic: 'AND' | 'OR'
}

const initialState = (): FormState => {
  const firstAvailableTable = store.selectedTables[1] // FROMテーブル以外の最初のテーブル
  return {
    type: 'INNER',
    selectedTable: firstAvailableTable || null,
    tableAlias: firstAvailableTable?.alias || '',
    conditions: [],
    conditionLogic: 'AND'
  }
}

const state = ref<FormState>(initialState())
const suppressSuggestionFetch = ref(false)

// 編集モードかどうか
const isEdit = computed(() => !!props.join)

// JOIN種別の選択肢
const joinTypes = [
  { label: 'INNER', value: 'INNER' },
  { label: 'LEFT', value: 'LEFT' },
  { label: 'RIGHT', value: 'RIGHT' },
  { label: 'FULL OUTER', value: 'FULL' },
  { label: 'CROSS', value: 'CROSS' }
]

// テーブル選択肢（FROMテーブル以外）
const tableOptions = computed(() =>
  store.selectedTables
    .filter((_: SelectedTable, index: number) => index > 0)  // FROMテーブル（最初のテーブル）を除外
    .map((t: SelectedTable) => ({
      label: `${t.name} (${t.alias})`,
      value: t.alias,
      table: t
    }))
)

// propsが変更されたときにフォームを初期化
watch(() => props.join, (join) => {
  if (join) {
    const selectedTable = store.selectedTables.find(t => t.alias === join.table.alias)
    state.value = {
      type: join.type,
      selectedTable: selectedTable || null,
      tableAlias: join.table.alias,
      conditions: [...join.conditions],
      conditionLogic: join.conditionLogic
    }
  } else {
    state.value = initialState()
  }
}, { immediate: true })

// テーブル選択やJOIN種別変更時に提案を取得
watch(
  () => [isOpen.value, state.value.selectedTable, state.value.type],
  async ([open, selectedTable, joinType]) => {
    if (suppressSuggestionFetch.value) {
      return
    }
    if (!open) {
      store.joinSuggestions = []
      return
    }
    if (!selectedTable || joinType === 'CROSS') {
      store.joinSuggestions = []
      return
    }
    if (store.selectedTables.length < 2) {
      store.joinSuggestions = []
      return
    }

    const fromTable = store.selectedTables[0]
    if (!fromTable) return

    await store.fetchJoinSuggestions(fromTable.name, selectedTable.name)
  },
  { immediate: true }
)

// ダイアログ開閉でフォーム状態をリセット（同じ操作の再オープンで古い条件を残さない）
watch(isOpen, (open) => {
  if (open) {
    // 最新のprops.joinに合わせて初期化
    if (props.join) {
      const selectedTable = store.selectedTables.find(t => t.alias === props.join!.table.alias)
      state.value = {
        type: props.join.type,
        selectedTable: selectedTable || null,
        tableAlias: props.join.table.alias,
        conditions: [...props.join.conditions],
        conditionLogic: props.join.conditionLogic
      }
    } else {
      state.value = initialState()
    }
  } else {
    state.value = initialState()
    store.joinSuggestions = []
  }
})

// テーブル選択時
const handleTableChange = (alias: string) => {
  const option = tableOptions.value.find((opt: { value: string; table: SelectedTable }) => opt.value === alias)
  if (option) {
    state.value.selectedTable = option.table
    state.value.tableAlias = alias
  }
}

// 条件追加
const addCondition = () => {
  if (!state.value.selectedTable) return

  const newCondition: JoinCondition = {
    left: {
      tableAlias: store.selectedTables[0]?.alias || '',  // FROMテーブル
      columnName: ''
    },
    operator: '=',
    right: {
      tableAlias: state.value.tableAlias,
      columnName: ''
    }
  }
  state.value.conditions.push(newCondition)
}

// 条件更新
const updateCondition = (index: number, condition: JoinCondition) => {
  state.value.conditions[index] = condition
}

// 条件削除
const removeCondition = (index: number) => {
  state.value.conditions.splice(index, 1)
}

// 保存
const save = () => {
  if (!state.value.selectedTable) return

  const joinData: Omit<JoinClause, 'id'> = {
    type: state.value.type,
    table: {
      schema: state.value.selectedTable.schema,
      name: state.value.selectedTable.name,
      alias: state.value.tableAlias
    },
    conditions: state.value.conditions,
    conditionLogic: state.value.conditionLogic
  }

  // 編集モードの場合はidを含める
  if (props.join) {
    emit('save', { ...joinData, id: props.join.id })
  } else {
    emit('save', joinData)
  }

  close()
}

// キャンセル
const close = () => {
  isOpen.value = false
}

// バリデーション
const isValid = computed(() => {
  if (!state.value.selectedTable) return false
  if (!state.value.tableAlias.trim()) return false
  if (state.value.type !== 'CROSS' && state.value.conditions.length === 0) return false
  // 各条件が正しく入力されているかチェック
  if (state.value.type !== 'CROSS') {
    return state.value.conditions.every((c: JoinCondition) =>
      c.left.tableAlias && c.left.columnName && c.right.tableAlias && c.right.columnName
    )
  }
  return true
})

// 提案を適用
const applySuggestion = (suggestion: JoinSuggestion) => {
  try {
    suppressSuggestionFetch.value = true
    const joinData = store.applyJoinSuggestion(suggestion)
    state.value.type = joinData.type
    state.value.conditions = [...state.value.conditions, ...joinData.conditions]
  } catch (error) {
    console.error('Failed to apply join suggestion:', error)
  } finally {
    // すぐに再フェッチさせない
    setTimeout(() => {
      suppressSuggestionFetch.value = false
    }, 0)
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? 'JOINの編集' : 'JOINの追加'"
    :description="'JOINの種類、対象テーブル、結合条件を設定してください。'"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-3xl' }"
  >

    <template #body>
      <div class="space-y-4">
        <!-- JOIN種別 -->
        <UFormField label="JOIN種別" required>
          <USelect
            v-model="state.type"
            :items="joinTypes"
            size="md"
          />
        </UFormField>

        <!-- 結合テーブル -->
        <UFormField label="結合テーブル" required>
          <USelect
            :model-value="state.selectedTable?.alias"
            :items="tableOptions"
            size="md"
            :disabled="isEdit"
            @update:model-value="handleTableChange"
          />
          <template v-if="isEdit" #hint>
            <p class="text-xs text-gray-500 mt-1">
              ※テーブルは変更できません。変更する場合はJOINを削除して再作成してください。
            </p>
          </template>
        </UFormField>

        <!-- エイリアス -->
        <UFormField label="エイリアス" required>
          <UInput
            v-model="state.tableAlias"
            size="md"
            placeholder="例: u, p, o"
          />
        </UFormField>

        <!-- CROSS JOIN以外の場合のみON条件を表示 -->
        <template v-if="state.type !== 'CROSS'">
          <UFormField label="ON条件" required>
            <div class="space-y-2">
              <JoinConditionRow
                v-for="(condition, index) in state.conditions"
                :key="index"
                :condition="condition"
                :available-tables="store.selectedTables"
                @update="updateCondition(index, $event)"
                @remove="removeCondition(index)"
              />
              <UButton
                icon="i-heroicons-plus"
                size="xs"
                color="gray"
                variant="soft"
                label="条件を追加"
                @click="addCondition"
              />
            </div>
          </UFormField>

          <!-- 条件の結合方法 -->
          <UFormField v-if="state.conditions.length > 1" label="条件の結合">
            <URadioGroup
              v-model="state.conditionLogic"
              :items="[
                { label: 'AND', value: 'AND' },
                { label: 'OR', value: 'OR' }
              ]"
            />
          </UFormField>

          <!-- 提案セクション（ON条件の下に配置） -->
          <div
            v-if="state.selectedTable"
            class="border-t border-gray-200 dark:border-gray-700 pt-4"
          >
            <JoinSuggestionList
              :suggestions="joinSuggestions"
              :loading="isLoadingJoinSuggestions"
              @apply="applySuggestion"
            />
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="キャンセル"
          color="gray"
          variant="soft"
          @click="close"
        />
        <UButton
          label="保存"
          color="primary"
          :disabled="!isValid"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
