<script setup lang="ts">
import { computed } from 'vue';
import type { Column } from '@/types/database-structure';

const props = defineProps<{
  column: Column;
  tableAlias: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', columnName: string, selected: boolean): void;
}>();

// カラムアイコン
const columnIcon = computed(() => {
  if (props.column.isPrimaryKey) return { icon: 'i-heroicons-key', color: 'text-yellow-600' };
  if (props.column.isForeignKey) return { icon: 'i-heroicons-link', color: 'text-blue-500' };
  if (props.column.isUnique) return { icon: 'i-heroicons-star', color: 'text-purple-500' };
  return { icon: 'i-heroicons-document-text', color: 'text-gray-400' };
});

/**
 * チェックボックス変更
 */
const handleChange = (value: any) => {
  // Nuxt UI Checkbox emits boolean
  emit('toggle', props.column.name, !!value);
};
</script>

<template>
  <div 
    class="flex items-center px-2 py-1.5 gap-2 rounded cursor-pointer transition-colors"
    :class="selected ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
    @click="handleChange(!selected)"
  >
    <UCheckbox
      :model-value="selected"
      :ui="{ wrapper: 'flex items-center' }"
      @update:model-value="handleChange"
      @click.stop
    />

    <UIcon
      :name="columnIcon.icon"
      class="w-4 h-4 flex-shrink-0"
      :class="columnIcon.color"
    />

    <span class="text-sm flex-1 truncate text-gray-700 dark:text-gray-200" :title="column.name">{{ column.name }}</span>

    <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{{ column.displayType }}</span>

    <span v-if="!column.nullable" class="text-red-500 font-bold text-xs flex-shrink-0" title="NOT NULL">*</span>
  </div>
</template>
