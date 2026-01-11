<script setup lang="ts">
import type { QueryResultColumn, QueryResultRow, QueryValue } from '@/types/query-result'

defineProps<{
  row: QueryResultRow
  columns: QueryResultColumn[]
  getColumnWidth: (columnName: string) => number
}>()

// 値の表示フォーマット
function formatValue(value: QueryValue, column: QueryResultColumn | undefined): string {
  if (value === null) {
    return '' // NULLは別途スタイルで表示
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    // バイナリデータ
    return `[${value.length} bytes]`
  }
  // JSON型などの場合
  if (column?.dataType.includes('JSON')) {
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      }
    } catch {
      // ignore
    }
  }
  return String(value)
}

function isNull(value: QueryValue): boolean {
  return value === null
}
</script>

<template>
  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
    <td
      v-for="(value, index) in row.values"
      :key="index"
      class="px-4 py-2 text-sm overflow-hidden text-ellipsis"
      :class="{
        'text-gray-400 dark:text-gray-500 italic': isNull(value),
        'text-gray-900 dark:text-gray-100': !isNull(value),
      }"
      :style="{
        width: `${getColumnWidth(columns[index]?.name ?? '')}px`,
        minWidth: `${getColumnWidth(columns[index]?.name ?? '')}px`,
        maxWidth: `${getColumnWidth(columns[index]?.name ?? '')}px`
      }"
      :title="!isNull(value) ? String(value) : ''"
    >
      <div class="whitespace-nowrap overflow-hidden text-ellipsis">
        <template v-if="isNull(value)">
          <span class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs select-none">NULL</span>
        </template>
        <template v-else>
          {{ formatValue(value, columns[index]) }}
        </template>
      </div>
    </td>
  </tr>
</template>
