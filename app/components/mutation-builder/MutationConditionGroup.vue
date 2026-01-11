<script setup lang="ts">
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import ConditionRow from '@/components/query-builder/where/ConditionRow.vue'
import type { WhereCondition, ConditionGroup as ConditionGroupType } from '@/types/query'

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

const mutationStore = useMutationBuilderStore()
const { t } = useI18n()

const handleRemove = (id: string) => {
  if (props.groupId) {
    mutationStore.removeConditionFromGroup(props.groupId, id)
  } else {
    mutationStore.removeWhereCondition(id)
  }
}

const handleUpdate = (id: string, updates: Partial<WhereCondition>) => {
  mutationStore.updateWhereCondition(id, updates)
}

const addConditionToGroup = () => {
  if (props.groupId) {
    mutationStore.addConditionToGroup(props.groupId, {
      id: crypto.randomUUID(),
      type: 'condition',
      column: null,
      operator: '=',
      value: '',
      isValid: false,
    })
  }
}

const removeGroup = () => {
  if (props.groupId) {
    mutationStore.removeWhereCondition(props.groupId)
  }
}

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
    <div v-if="!isRoot" class="flex items-center justify-between mb-2">
      <span class="text-xs font-bold text-gray-500 uppercase">{{ logic }} {{ t('mutationBuilder.conditionGroup.groupSuffix') }}</span>
      <UButton
        icon="i-heroicons-x-mark"
        color="error"
        variant="ghost"
        size="xs"
        @click="removeGroup"
      />
    </div>

    <div class="flex flex-col gap-2">
      <template v-for="(item, index) in conditions" :key="item.id">
        <div v-if="index > 0" class="flex items-center py-1">
          <div class="rounded px-1">
            <template v-if="isRoot">
              <span class="text-xs font-bold text-gray-500">AND</span>
            </template>
            <template v-else>
              <UButton
                :label="logic"
                :color="logic === 'AND' ? 'primary' : 'warning'"
                variant="soft"
                size="xs"
                @click="groupId ? mutationStore.updateGroupLogic(groupId, logic === 'AND' ? 'OR' : 'AND') : null"
              />
            </template>
          </div>
          <div class="h-px bg-gray-200 dark:bg-gray-700 flex-1 ml-2"></div>
        </div>

        <ConditionRow
          v-if="isCondition(item)"
          :condition="item"
          :available-columns="availableColumns"
          @update="(updates) => handleUpdate(item.id, updates)"
          @remove="handleRemove(item.id)"
        />

        <MutationConditionGroup
          v-else
          :conditions="item.conditions"
          :available-columns="availableColumns"
          :is-root="false"
          :logic="item.logic"
          :group-id="item.id"
        />
      </template>
    </div>

    <div v-if="!isRoot" class="mt-2">
      <UButton
        label="条件追加"
        icon="i-heroicons-plus"
        size="xs"
        variant="ghost"
        color="primary"
        @click="addConditionToGroup"
      />
    </div>
  </div>
</template>
