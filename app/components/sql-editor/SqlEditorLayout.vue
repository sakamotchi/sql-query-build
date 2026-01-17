<template>
  <div class="h-full flex flex-col">
    <SqlEditorToolbar class="flex-shrink-0" />

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 min-h-0">
        <SqlTextEditor />
      </div>

      <div class="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
        <div class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          <p>結果パネル（Phase 3で実装）</p>
        </div>
      </div>
    </div>
  </div>
</template>
