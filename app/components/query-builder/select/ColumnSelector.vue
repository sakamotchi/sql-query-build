<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore, type AvailableColumn } from '@/stores/query-builder'

const props = withDefaults(
  defineProps<{
    modelValue: AvailableColumn[]
    multiple?: boolean
  }>(),
  {
    multiple: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: AvailableColumn[]): void
}>()

const store = useQueryBuilderStore()

const columns = computed(() => store.availableColumns)

const selected = computed({
  get: () => props.modelValue,
  set: (value: AvailableColumn[] | null) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="columns"
    by="id"
    :search-attributes="['label', 'tableName', 'columnName']"
    searchable
    :multiple="props.multiple"
    placeholder="カラムを選択"
    class="w-full"
  >
    <template #option="{ option }">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-table-cells" class="w-4 h-4 text-gray-400" />
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-700 dark:text-gray-200 truncate">
            {{ option.label }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ option.tableName }}
          </div>
        </div>
        <span class="text-xs text-gray-400">{{ option.dataType }}</span>
      </div>
    </template>
  </USelectMenu>
</template>
