<template>
  <div class="flex items-center gap-2 w-full">
    <!-- Left Table -->
    <div class="w-36">
      <USelect
        :model-value="condition.left.tableAlias"
        :items="tableOptions"
        placeholder="Table"
        size="sm"
        class="w-full"
        @update:model-value="updateLeftTable"
      />
    </div>

    <span class="text-gray-500 text-xs flex-shrink-0">.</span>

    <!-- Left Column -->
    <div class="flex-1 min-w-0">
      <USelect
        :model-value="condition.left.columnName"
        :items="leftColumnOptions"
        placeholder="Column"
        searchable
        size="sm"
        class="w-full"
        @update:model-value="updateLeftColumn"
      />
    </div>

    <!-- Operator -->
    <div class="w-16 flex-shrink-0">
      <USelect
        :model-value="condition.operator"
        :items="operatorOptions"
        size="sm"
        class="w-full"
        @update:model-value="updateOperator"
      />
    </div>

    <!-- Right Table -->
    <div class="w-36">
      <USelect
        :model-value="condition.right.tableAlias"
        :items="tableOptions"
        placeholder="Table"
        size="sm"
        class="w-full"
        @update:model-value="updateRightTable"
      />
    </div>

    <span class="text-gray-500 text-xs flex-shrink-0">.</span>

    <!-- Right Column -->
    <div class="flex-1 min-w-0">
      <USelect
        :model-value="condition.right.columnName"
        :items="rightColumnOptions"
        placeholder="Column"
        searchable
        size="sm"
        class="w-full"
        @update:model-value="updateRightColumn"
      />
    </div>

    <!-- Remove Button -->
    <div class="flex-shrink-0">
      <UButton
        icon="i-heroicons-x-mark"
        color="red"
        variant="ghost"
        size="xs"
        @click="$emit('remove')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JoinCondition, SelectedTable } from '~/types/query-model'

interface Props {
  condition: JoinCondition
  availableTables: SelectedTable[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update', condition: JoinCondition): void
  (e: 'remove'): void
}>()

// Options for table selection
const tableOptions = computed(() => {
  return props.availableTables.map(t => ({
    label: `${t.name} (${t.alias})`,
    value: t.alias,
    table: t
  }))
})

// Options for operators
const operatorOptions = ['=', '!=', '>', '>=', '<', '<=']

// Helper to get columns for a given table alias
const getColumnsForTable = (alias: string) => {
  const table = props.availableTables.find(t => t.alias === alias)
  return table ? table.columns.map((c: any) => c.name) : []
}

// Left column options based on selected left table
const leftColumnOptions = computed(() => {
  return getColumnsForTable(props.condition.left.tableAlias)
})

// Right column options based on selected right table
const rightColumnOptions = computed(() => {
  return getColumnsForTable(props.condition.right.tableAlias)
})

// Update handlers
const updateLeftTable = (alias: string) => {
  emit('update', {
    ...props.condition,
    left: {
      ...props.condition.left,
      tableAlias: alias,
      columnName: '' // Reset column when table changes
    }
  })
}

const updateLeftColumn = (column: string) => {
  emit('update', {
    ...props.condition,
    left: {
      ...props.condition.left,
      columnName: column
    }
  })
}

const updateOperator = (op: any) => {
  emit('update', {
    ...props.condition,
    operator: op
  })
}

const updateRightTable = (alias: string) => {
  emit('update', {
    ...props.condition,
    right: {
      ...props.condition.right,
      tableAlias: alias,
      columnName: '' // Reset column when table changes
    }
  })
}

const updateRightColumn = (column: string) => {
  emit('update', {
    ...props.condition,
    right: {
      ...props.condition.right,
      columnName: column
    }
  })
}
</script>
