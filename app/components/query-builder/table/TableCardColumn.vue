<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '@/types/database-structure'

const props = defineProps<{
  column: Column
}>()

const emit = defineEmits<{
  (e: 'click', column: Column): void
}>()

// アイコンと色
const iconConfig = computed(() => {
  if (props.column.isPrimaryKey) {
    return { icon: 'i-heroicons-key', color: 'text-amber-500' }
  }
  if (props.column.isForeignKey) {
    return { icon: 'i-heroicons-link', color: 'text-blue-500' }
  }
  if (props.column.isUnique) {
    return { icon: 'i-heroicons-star', color: 'text-purple-500' }
  }
  return { icon: 'i-heroicons-document-text', color: 'text-gray-400' }
})

const handleClick = () => {
  emit('click', props.column)
}
</script>

<template>
  <div
    class="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
    @click="handleClick"
  >
    <UIcon :name="iconConfig.icon" :class="['w-3.5 h-3.5 shrink-0', iconConfig.color]" />
    <span class="text-xs truncate flex-1">{{ column.name }}</span>
    <span class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ column.displayType }}</span>
    <span v-if="!column.nullable" class="text-xs text-red-500 font-bold" title="NOT NULL">*</span>
  </div>
</template>
