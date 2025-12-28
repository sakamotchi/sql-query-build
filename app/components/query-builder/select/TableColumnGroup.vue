<script setup lang="ts">
import { computed } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';
import ColumnCheckbox from './ColumnCheckbox.vue';
import type { SelectedTable } from '@/types/query';

const props = defineProps<{
  table: SelectedTable;
}>();

const queryBuilderStore = useQueryBuilderStore();

// このテーブルから選択されたカラム
const selectedColumnsForTable = computed(() =>
  queryBuilderStore.selectedColumns.filter((c) => c.tableId === props.table.id)
);

// 全選択状態
const isAllSelected = computed(
  () =>
    props.table.columns.length > 0 &&
    selectedColumnsForTable.value.length === props.table.columns.length
);

// 一部選択状態
const isIndeterminate = computed(
  () =>
    selectedColumnsForTable.value.length > 0 &&
    selectedColumnsForTable.value.length < props.table.columns.length
);

/**
 * 全選択/解除
 */
const toggleSelectAll = (_value: any) => {
  if (isAllSelected.value) {
    queryBuilderStore.deselectAllColumnsFromTable(props.table.id);
  } else {
    queryBuilderStore.selectAllColumnsFromTable(props.table);
  }
};

/**
 * カラムの選択状態を変更
 */
const handleColumnToggle = (columnName: string, selected: boolean) => {
  const column = props.table.columns.find((c) => c.name === columnName);
  if (!column) return;

  if (selected) {
    queryBuilderStore.selectColumn({
      tableId: props.table.id,
      tableAlias: props.table.alias,
      columnName: column.name,
      columnAlias: null,
      dataType: column.dataType,
    });
  } else {
    queryBuilderStore.deselectColumn(props.table.id, columnName);
  }
};

/**
 * カラムが選択されているか
 */
const isColumnSelected = (columnName: string): boolean => {
  return selectedColumnsForTable.value.some((c) => c.columnName === columnName);
};
</script>

<template>
  <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
    <!-- グループヘッダー -->
    <div class="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 gap-2">
      <UCheckbox
        :model-value="isAllSelected"
        :indeterminate="isIndeterminate"
        @update:model-value="toggleSelectAll"
      />

      <UIcon name="i-heroicons-table-cells" class="w-4 h-4 text-primary-500" />
      <span class="text-sm font-medium truncate max-w-[150px] text-gray-700 dark:text-gray-200" :title="table.name">{{ table.name }}</span>
      <span class="text-xs text-primary-500 font-medium">({{ table.alias }})</span>

      <div class="flex-1"></div>

      <span class="text-xs text-gray-500">{{ selectedColumnsForTable.length }} / {{ table.columns.length }}</span>
    </div>

    <!-- カラムリスト -->
    <div class="p-2 space-y-0.5">
      <ColumnCheckbox
        v-for="column in table.columns"
        :key="column.name"
        :column="column"
        :table-alias="table.alias"
        :selected="isColumnSelected(column.name)"
        @toggle="handleColumnToggle"
      />
    </div>
  </div>
</template>
