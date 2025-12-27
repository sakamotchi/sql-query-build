<script setup lang="ts">
import { ref } from 'vue'

// 検索クエリ
const searchQuery = ref('')

// ツリーのフィルタリング(実装はタスク1.6.3で詳細化)
const handleSearch = (query: string) => {
  searchQuery.value = query
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-medium">データベース構造</span>
      <UButton
        icon="i-heroicons-arrow-path"
        size="xs"
        color="gray"
        variant="ghost"
        title="更新"
      />
    </div>

    <!-- 検索ボックス -->
    <div class="p-2 border-b border-gray-200 dark:border-gray-800">
      <UInput
        v-model="searchQuery"
        size="sm"
        placeholder="テーブル・カラムを検索..."
        icon="i-heroicons-magnifying-glass"
        @update:model-value="handleSearch"
      />
    </div>

    <!-- DB構造ツリー(タスク1.6.3で実装) -->
    <div class="flex-1 overflow-auto p-2">
      <slot name="tree">
        <!-- DatabaseTree コンポーネントをここに配置 -->
        <div class="flex flex-col items-center justify-center h-full gap-2">
          <UIcon name="i-heroicons-circle-stack" class="text-4xl text-gray-400" />
          <p class="text-gray-500 dark:text-gray-400">DB構造ツリー</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.6.3で実装)</p>
        </div>
      </slot>
    </div>
  </div>
</template>
