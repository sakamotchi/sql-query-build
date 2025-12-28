<script setup lang="ts">
import { computed } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';
import TableColumnGroup from './TableColumnGroup.vue';
import SelectedColumnList from './SelectedColumnList.vue';

const queryBuilderStore = useQueryBuilderStore();

// 選択されたテーブル一覧
const selectedTables = computed(() => queryBuilderStore.selectedTables);

// 選択されたカラム一覧
const selectedColumns = computed(() => queryBuilderStore.selectedColumns);

// 選択カラム数
const selectedColumnCount = computed(() => selectedColumns.value.length);

// 全カラム数
const totalColumnCount = computed(() =>
  selectedTables.value.reduce((sum, table) => sum + table.columns.length, 0)
);

// テーブルがない場合のメッセージ
const isEmpty = computed(() => selectedTables.value.length === 0);
</script>

<template>
  <div class="h-full overflow-hidden">
    <!-- 空状態 -->
    <div v-if="isEmpty" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-table-cells" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">テーブルを選択してください</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        左パネルからテーブルをドラッグ＆ドロップ
      </p>
    </div>

    <template v-else>
      <div class="flex h-full gap-4 p-4">
        <!-- 左: カラム選択 -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">カラム選択</span>
            <span class="text-xs text-gray-500">
              {{ selectedColumnCount }} / {{ totalColumnCount }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto pr-1">
            <TableColumnGroup
              v-for="table in selectedTables"
              :key="table.id"
              :table="table"
            />
          </div>
        </div>

        <!-- 右: 選択されたカラム -->
        <div class="w-[300px] flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800 pl-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">選択されたカラム</span>
            <UButton
              v-if="selectedColumnCount > 0"
              variant="ghost"
              size="2xs"
              color="red"
              label="全解除"
              @click="queryBuilderStore.clearSelectedColumns()"
            />
          </div>

          <SelectedColumnList :columns="selectedColumns" />
        </div>
      </div>
    </template>
  </div>
</template>
