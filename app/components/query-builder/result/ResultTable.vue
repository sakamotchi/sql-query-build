<script setup lang="ts">
import type { QueryResultColumn, QueryResultRow } from '@/types/query-result'
import ResultColumnHeader from './ResultColumnHeader.vue'
import ResultRow from './ResultRow.vue'
import { useColumnResize } from '@/composables/useColumnResize'

defineProps<{
  columns: QueryResultColumn[]
  rows: QueryResultRow[]
}>()

const { getColumnWidth, startResize } = useColumnResize()
</script>

<template>
  <div class="inline-block min-w-full align-middle">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
      <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
        <tr>
          <ResultColumnHeader
            v-for="column in columns"
            :key="column.name"
            :column="column"
            :width="getColumnWidth(column.name)"
            @resize="startResize"
          />
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
        <ResultRow
          v-for="(row, index) in rows"
          :key="index"
          :row="row"
          :columns="columns"
          :get-column-width="getColumnWidth"
        />
        <!-- 結果が0件の場合 -->
        <tr v-if="rows.length === 0">
          <td
            :colspan="columns.length"
            class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
          >
            結果が0件です
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
