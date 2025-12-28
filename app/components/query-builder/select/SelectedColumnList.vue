<script setup lang="ts">
import { ref } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';
import SelectedColumnItem from './SelectedColumnItem.vue';
import type { SelectedColumn } from '@/types/query';

defineProps<{
  columns: SelectedColumn[];
}>();

const queryBuilderStore = useQueryBuilderStore();

// ドラッグ中のインデックス
const draggedIndex = ref<number | null>(null);

/**
 * カラムを削除
 */
const handleRemove = (tableId: string, columnName: string) => {
  queryBuilderStore.deselectColumn(tableId, columnName);
};

/**
 * エイリアスを更新
 */
const handleAliasUpdate = (
  tableId: string,
  columnName: string,
  alias: string | null
) => {
  queryBuilderStore.updateColumnAlias(tableId, columnName, alias);
};

/**
 * ドラッグ開始
 */
const handleDragStart = (index: number) => {
  draggedIndex.value = index;
};

/**
 * ドラッグオーバー
 */
const handleDragOver = (index: number) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return;

  queryBuilderStore.reorderColumns(draggedIndex.value, index);
  draggedIndex.value = index;
};

/**
 * ドラッグ終了
 */
const handleDragEnd = () => {
  draggedIndex.value = null;
};
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="columns.length === 0" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-list-bullet" class="w-12 h-12 text-gray-300 dark:text-gray-600" />
      <p class="text-xs text-gray-400 mt-2">
        カラムを選択してください
      </p>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="flex flex-col gap-1 p-1">
      <SelectedColumnItem
        v-for="(column, index) in columns"
        :key="`${column.tableId}.${column.columnName}`"
        :column="column"
        :index="index"
        :is-dragging="draggedIndex === index"
        @remove="handleRemove"
        @update-alias="handleAliasUpdate"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drag-end="handleDragEnd"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* リストアニメーション */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
