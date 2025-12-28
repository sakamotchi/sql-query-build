<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'schema' | 'table' | 'view' | 'column' | 'primary-key' | 'foreign-key' | 'unique'
  isSystem?: boolean
}>()

const iconConfig = computed((): { icon: string; class: string } => {
  const configs: Record<string, { icon: string; class: string }> = {
    schema: {
      icon: 'i-heroicons-folder',
      class: props.isSystem ? 'text-gray-400' : 'text-primary-500',
    },
    table: {
      icon: 'i-heroicons-table-cells',
      class: 'text-primary-500',
    },
    view: {
      icon: 'i-heroicons-eye',
      class: 'text-gray-400',
    },
    column: {
      icon: 'i-heroicons-bars-3-bottom-left',
      class: 'text-gray-400',
    },
    'primary-key': {
      icon: 'i-heroicons-key',
      class: 'text-amber-600 dark:text-amber-500',
    },
    'foreign-key': {
      icon: 'i-heroicons-link',
      class: 'text-blue-500',
    },
    unique: {
      icon: 'i-heroicons-star',
      class: 'text-purple-500',
    },
  }

  return configs[props.type] || configs.column
})
</script>

<template>
  <UIcon :name="iconConfig.icon" :class="iconConfig.class" class="w-4 h-4 shrink-0" />
</template>
