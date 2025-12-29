<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPage: number
  pageSize: number
  totalRows: number
}>()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
  (e: 'page-size-change', size: number): void
}>()

const totalPages = computed(() => Math.ceil(props.totalRows / props.pageSize))

const pageSizeOptions = [10, 25, 50, 100]

const startRow = computed(() => (props.currentPage - 1) * props.pageSize + 1)
const endRow = computed(() => Math.min(props.currentPage * props.pageSize, props.totalRows))

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit('page-change', page)
  }
}

function onPageSizeChange(size: number) {
  emit('page-size-change', size)
  // ページサイズ変更時は1ページ目に戻る
  emit('page-change', 1)
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800">
    <!-- 左側: 表示件数 -->
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span>表示:</span>
      <USelectMenu
        :model-value="pageSize"
        :items="pageSizeOptions.map(n => ({ value: n, label: `${n}件` }))"
        value-attribute="value"
        option-attribute="label"
        size="xs"
        class="w-24"
        @update:model-value="(v) => onPageSizeChange(Number(v))"
      />
      <span class="text-gray-500 whitespace-nowrap ml-2">
        {{ startRow }} - {{ endRow }} / {{ totalRows }}件
      </span>
    </div>

    <!-- 右側: ページナビゲーション -->
    <div class="flex items-center gap-1">
      <UButton
        icon="i-heroicons-chevron-double-left"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === 1"
        @click="goToPage(1)"
      />
      <UButton
        icon="i-heroicons-chevron-left"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      />
      <span class="px-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap min-w-[3rem] text-center">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <UButton
        icon="i-heroicons-chevron-right"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      />
      <UButton
        icon="i-heroicons-chevron-double-right"
        size="xs"
        color="gray"
        variant="ghost"
        :disabled="currentPage === totalPages"
        @click="goToPage(totalPages)"
      />
    </div>
  </div>
</template>
