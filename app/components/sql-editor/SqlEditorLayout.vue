<script setup lang="ts">
import SqlEditorSavedPanel from '~/components/sql-editor/SqlEditorSavedPanel.vue'
import SqlEditorSaveDialog from '~/components/sql-editor/SqlEditorSaveDialog.vue'
</script>

<template>
  <div class="h-full flex flex-col">
    <SqlEditorToolbar class="flex-shrink-0" />

    <div class="flex-1 flex overflow-hidden">
      <div class="w-72 min-w-[18rem] max-w-[20rem] h-full flex-shrink-0">
        <SqlEditorSavedPanel />
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 min-h-0">
          <SqlTextEditor />
        </div>

        <div class="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
          <SqlEditorResultPanel class="h-full" />
        </div>
      </div>
    </div>
  </div>

  <SqlEditorSaveDialog />
</template>
