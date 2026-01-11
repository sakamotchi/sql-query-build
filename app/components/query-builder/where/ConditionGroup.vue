<script setup lang="ts">
import { useQueryBuilderStore } from '@/stores/query-builder'
import ConditionRow from './ConditionRow.vue'
import type { WhereCondition, ConditionGroup as ConditionGroupType } from '@/types/query'

const { t } = useI18n()

interface AvailableColumn {
  id: string
  label: string
  tableId: string
  tableAlias: string
  tableName: string
  columnName: string
  displayName: string
  dataType: string
}

const props = defineProps<{
  conditions: Array<WhereCondition | ConditionGroupType>
  availableColumns: AvailableColumn[]
  isRoot: boolean
  logic: 'AND' | 'OR'
  groupId?: string
}>()

const queryBuilderStore = useQueryBuilderStore()

/**
 * 条件を削除
 */
const handleRemove = (id: string) => {
  if (props.groupId) {
    queryBuilderStore.removeConditionFromGroup(props.groupId, id)
  } else {
    queryBuilderStore.removeWhereCondition(id)
  }
}

/**
 * 条件を更新
 */
const handleUpdate = (id: string, updates: Partial<WhereCondition>) => {
  queryBuilderStore.updateWhereCondition(id, updates)
}

/**
 * グループ内に条件追加
 */
const addConditionToGroup = () => {
  if (props.groupId) {
    queryBuilderStore.addConditionToGroup(props.groupId, {
      id: crypto.randomUUID(),
      type: 'condition',
      column: null,
      operator: '=',
      value: '',
      isValid: false,
    })
  }
}

/**
 * グループを削除
 */
const removeGroup = () => {
  if (props.groupId) {
    queryBuilderStore.removeWhereCondition(props.groupId)
  }
}

/**
 * 条件かグループかを判定
 */
const isCondition = (item: WhereCondition | ConditionGroupType): item is WhereCondition => {
  return item.type === 'condition'
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    :class="{
      'p-3 border rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700': !isRoot,
      'border-l-4 border-l-primary-500': !isRoot
    }"
  >
    <!-- グループヘッダー（ネストされている場合） -->
    <div v-if="!isRoot" class="flex items-center justify-between mb-2">
      <span class="text-xs font-bold text-gray-500 uppercase">{{ t('queryBuilder.conditionGroup.groupLabel', { logic: logic }) }}</span>
      <UButton
        icon="i-heroicons-x-mark"
        color="error"
        variant="ghost"
        size="xs"
        @click="removeGroup"
      />
    </div>

    <!-- 条件リスト -->
    <div class="flex flex-col gap-2">
      <template v-for="(item, index) in conditions" :key="item.id">
        <!-- ロジック表示（2番目以降） -->
        <div v-if="index > 0" class="flex items-center py-1">
          <!-- ルートでない場合のみロジック変更可能とするか、ルートも変更可能にするか。
               設計書ではルートも変更できるように見える。
               ここではグループIDがある場合（ネスト）またはルートの場合でロジック切り替えを表示 -->
           <div class="rounded px-1">
             <!-- rootグループはAND固定、ネストされたグループは変更可能 -->
             <template v-if="isRoot">
                <span class="text-xs font-bold text-gray-500">AND</span>
             </template>
             <template v-else>
               <UButton
                 :label="logic"
                 :color="logic === 'AND' ? 'primary' : 'warning'"
                 variant="soft"
                 size="xs"
                 @click="groupId ? queryBuilderStore.updateGroupLogic(groupId, logic === 'AND' ? 'OR' : 'AND') : null"
               />
             </template>
           </div>
          <div class="h-px bg-gray-200 dark:bg-gray-700 flex-1 ml-2"></div>
        </div>

        <!-- 条件行 -->
        <ConditionRow
          v-if="isCondition(item)"
          :condition="item"
          :available-columns="availableColumns"
          @update="(updates) => handleUpdate(item.id, updates)"
          @remove="handleRemove(item.id)"
        />

        <!-- ネストされたグループ -->
        <ConditionGroup
          v-else
          :conditions="item.conditions"
          :available-columns="availableColumns"
          :is-root="false"
          :logic="item.logic"
          :group-id="item.id"
        />
      </template>
    </div>

    <!-- グループ内追加ボタン（ネストされている場合） -->
    <div v-if="!isRoot" class="mt-2">
      <UButton
        :label="t('queryBuilder.conditionGroup.addCondition')"
        icon="i-heroicons-plus"
        size="xs"
        variant="ghost"
        color="primary"
        @click="addConditionToGroup"
      />
    </div>
  </div>
</template>
