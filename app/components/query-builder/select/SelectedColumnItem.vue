<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { SelectedColumn } from '@/types/query';

const props = defineProps<{
  column: SelectedColumn;
  index: number;
  isDragging: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove', tableId: string, columnName: string): void;
  (e: 'update-alias', tableId: string, columnName: string, alias: string | null): void;
  (e: 'drag-start', index: number): void;
  (e: 'drag-over', index: number): void;
  (e: 'drag-end'): void;
}>();

// エイリアス編集
const isEditingAlias = ref(false);
const editingAlias = ref('');
const aliasInput = ref<HTMLInputElement | null>(null);

// 表示用のカラム名
const displayName = computed(() =>
  `${props.column.tableAlias}.${props.column.columnName}`
);

// 表示用のエイリアス
const displayAlias = computed(() =>
  props.column.columnAlias || props.column.columnName
);

/**
 * エイリアス編集開始
 */
const startEditAlias = async () => {
  isEditingAlias.value = true;
  editingAlias.value = props.column.columnAlias || props.column.columnName;
  await nextTick();
  aliasInput.value?.focus();
};

/**
 * エイリアス確定
 */
const confirmAlias = () => {
  isEditingAlias.value = false;
  const alias = editingAlias.value.trim();
  const finalAlias = alias === props.column.columnName ? null : alias || null;
  emit('update-alias', props.column.tableId, props.column.columnName, finalAlias);
};

/**
 * エイリアスキャンセル
 */
const cancelAlias = () => {
  isEditingAlias.value = false;
};

/**
 * キー入力
 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') confirmAlias();
  if (e.key === 'Escape') cancelAlias();
};

/**
 * 削除
 */
const handleRemove = () => {
  emit('remove', props.column.tableId, props.column.columnName);
};

/**
 * ドラッグ開始
 */
const handleDragStart = () => {
  emit('drag-start', props.index);
};

/**
 * ドラッグオーバー
 */
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  emit('drag-over', props.index);
};

/**
 * ドラッグ終了
 */
const handleDragEnd = () => {
  emit('drag-end');
};
</script>

<template>
  <div
    class="flex items-center p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md gap-2 transition-all"
    :class="{ 'opacity-50 bg-primary-50 dark:bg-primary-900/10 border-dashed border-primary-500': isDragging }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @dragend="handleDragEnd"
  >
    <!-- ドラッグハンドル -->
    <UIcon
      name="i-heroicons-bars-2"
      class="cursor-grab text-gray-400 w-4 h-4"
    />

    <UIcon name="i-heroicons-table-cells" class="w-4 h-4 text-primary-500" />

    <!-- カラム名とエイリアス -->
    <div class="flex-1 min-w-0 mr-2">
      <div v-if="!isEditingAlias" class="flex items-center gap-1.5 cursor-text group" @click="startEditAlias">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ displayName }}</span>
        <span class="text-xs text-gray-400">→</span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200" :class="{ 'text-primary-600 dark:text-primary-400': !!column.columnAlias }">
          {{ displayAlias }}
        </span>
        <UIcon name="i-heroicons-pencil-square" class="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div v-else class="w-full">
        <input
          ref="aliasInput"
          v-model="editingAlias"
          type="text"
          class="w-full px-1.5 py-0.5 text-sm border border-primary-500 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
          @blur="confirmAlias"
          @keydown="handleKeyDown"
        />
      </div>
    </div>

    <!-- 削除ボタン -->
    <UButton
      icon="i-heroicons-x-mark"
      size="xs"
      color="neutral"
      variant="ghost"
      @click.stop="handleRemove"
    />
  </div>
</template>
