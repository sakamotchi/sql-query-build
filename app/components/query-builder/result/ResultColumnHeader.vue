<script setup lang="ts">
import type { QueryResultColumn } from '@/types/query-result'
import { computed } from 'vue'

const props = defineProps<{
  column: QueryResultColumn
  width: number
}>()

const emit = defineEmits<{
  resize: [event: MouseEvent, columnName: string]
}>()

// データ型の表示名マッピング
const dataTypeDisplay = computed(() => {
  const typeMap: Record<string, string> = {
    'INT4': 'integer',
    'INT8': 'bigint',
    'FLOAT4': 'real',
    'FLOAT8': 'double',
    'TEXT': 'text',
    'VARCHAR': 'varchar',
    'BOOL': 'boolean',
    'TIMESTAMP': 'timestamp',
    'DATE': 'date',
    'TIMESTAMPTZ': 'timestamptz',
    'UUID': 'uuid',
    'JSONB': 'jsonb',
    'JSON': 'json',
  }
  return typeMap[props.column.dataType] || props.column.dataType.toLowerCase()
})

const handleResizeStart = (event: MouseEvent) => {
  emit('resize', event, props.column.name)
}
</script>

<template>
  <th
    scope="col"
    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative"
    :style="{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }"
  >
    <div class="flex flex-col gap-0.5">
      <span class="text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis">{{ column.name }}</span>
      <span class="text-gray-400 dark:text-gray-500 font-normal normal-case whitespace-nowrap">
        {{ dataTypeDisplay }}
      </span>
    </div>
    <!-- リサイズハンドル -->
    <div
      class="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50 transition-colors"
      @mousedown="handleResizeStart"
    />
  </th>
</template>
