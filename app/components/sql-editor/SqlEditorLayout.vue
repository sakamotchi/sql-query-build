<script setup lang="ts">
import ResultPanel from '~/components/sql-editor/ResultPanel.vue'
</script>

<template>
  <div class="h-full flex flex-col">
    <SqlEditorToolbar class="flex-shrink-0" />

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 min-h-0">
        <SqlTextEditor />
      </div>

      <div class="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
        <ResultPanel class="h-full" />
      </div>
    </div>
  </div>
</template>
