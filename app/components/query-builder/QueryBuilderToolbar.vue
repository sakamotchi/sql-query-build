<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'

const emit = defineEmits<{
  (e: 'toggle-left-panel'): void
  (e: 'toggle-right-panel'): void
  (e: 'toggle-result-panel'): void
}>()

const queryBuilderStore = useQueryBuilderStore()
const { toggleColorMode, isDark } = useTheme()

// 実行可能かどうか
const canExecute = computed(() => queryBuilderStore.canExecuteQuery)

// 実行中かどうか
const isExecuting = computed(() => queryBuilderStore.isExecuting)

/**
 * クエリ実行
 */
const executeQuery = () => {
  queryBuilderStore.executeQuery()
}

/**
 * クエリ保存
 */
const saveQuery = () => {
  // TODO: クエリ保存ダイアログを開く
  console.log('Save query')
}

/**
 * 新規クエリ作成
 */
const createNewQuery = () => {
  queryBuilderStore.resetQuery()
}

/**
 * クエリ履歴を開く
 */
const openHistory = () => {
  // TODO: クエリ履歴パネルを開く
  console.log('Open history')
}
</script>

<template>
  <nav class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <!-- 左パネル切り替え -->
    <UButton
      icon="i-heroicons-circle-stack"
      size="sm"
      color="gray"
      variant="ghost"
      title="DB構造パネル"
      @click="emit('toggle-left-panel')"
    />

    <UDivider orientation="vertical" class="h-6" />

    <!-- メインアクション -->
    <UButton
      color="primary"
      size="sm"
      :disabled="!canExecute || isExecuting"
      :loading="isExecuting"
      @click="executeQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-play" />
      </template>
      実行
    </UButton>

    <UButton
      variant="ghost"
      color="gray"
      size="sm"
      @click="saveQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-document-arrow-down" />
      </template>
      保存
    </UButton>

    <UButton
      variant="ghost"
      color="gray"
      size="sm"
      @click="createNewQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-document-plus" />
      </template>
      新規
    </UButton>

    <UDivider orientation="vertical" class="h-6" />

    <!-- 履歴 -->
    <UButton
      icon="i-heroicons-clock"
      size="sm"
      color="gray"
      variant="ghost"
      title="クエリ履歴"
      @click="openHistory"
    />

    <div class="flex-1" />

    <!-- 表示切り替え -->
    <UButton
      icon="i-heroicons-table-cells"
      size="sm"
      color="gray"
      variant="ghost"
      title="結果パネル"
      @click="emit('toggle-result-panel')"
    />

    <UButton
      icon="i-heroicons-code-bracket"
      size="sm"
      color="gray"
      variant="ghost"
      title="SQLプレビューパネル"
      @click="emit('toggle-right-panel')"
    />

    <UDivider orientation="vertical" class="h-6" />

    <!-- ダークモード切り替え -->
    <UButton
      :icon="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
      size="sm"
      color="gray"
      variant="ghost"
      :title="isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'"
      @click="toggleColorMode"
    />
  </nav>
</template>
