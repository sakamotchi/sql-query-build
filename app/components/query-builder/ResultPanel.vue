<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-table-cells" class="text-lg" />
        <span class="text-sm font-medium">実行結果</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          color="gray"
          variant="ghost"
          title="エクスポート"
        />
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          color="gray"
          variant="ghost"
          title="閉じる"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- 実行結果テーブル (タスク1.7.5で実装) -->
    <div class="flex-1 overflow-auto p-4">
      <div class="flex flex-col items-center justify-center h-full">
        <UIcon name="i-heroicons-table-cells" class="text-4xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">実行結果テーブル</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">(タスク1.7.5で実装)</p>
      </div>
    </div>
  </div>
</template>
