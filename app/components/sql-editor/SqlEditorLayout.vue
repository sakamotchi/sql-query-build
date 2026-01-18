<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import SqlEditorHistoryPanel from '~/components/sql-editor/SqlEditorHistoryPanel.vue'
import SqlEditorSavedPanel from '~/components/sql-editor/SqlEditorSavedPanel.vue'
import SqlEditorSaveDialog from '~/components/sql-editor/SqlEditorSaveDialog.vue'
import EditorTabs from '~/components/sql-editor/EditorTabs.vue'
import { useSqlEditorStore } from '~/stores/sql-editor'

const sqlEditorStore = useSqlEditorStore()
const { editorPanelHeightPercent, isLeftPanelVisible } = storeToRefs(sqlEditorStore)

const mainPanelRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)

const startResize = (event: MouseEvent) => {
  event.preventDefault()
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !mainPanelRef.value) return
  const rect = mainPanelRef.value.getBoundingClientRect()
  const offset = event.clientY - rect.top
  const percent = (offset / rect.height) * 100
  sqlEditorStore.setEditorPanelHeightPercent(percent)
}

const stopResize = () => {
  if (!isResizing.value) return
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  sqlEditorStore.persistEditorPanelHeight()
}

onMounted(() => {
  sqlEditorStore.loadEditorPanelHeight()
  sqlEditorStore.loadLeftPanelVisibility()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <SqlEditorToolbar class="flex-shrink-0" />
    <EditorTabs class="flex-shrink-0" />

    <div class="flex-1 flex overflow-hidden">
      <div
        v-if="isLeftPanelVisible"
        class="w-80 min-w-[18rem] max-w-[22rem] h-full flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700"
      >
        <div class="flex-1 min-h-0">
          <SqlEditorSavedPanel />
        </div>
        <div class="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
          <SqlEditorHistoryPanel />
        </div>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div ref="mainPanelRef" class="flex-1 min-h-0 flex flex-col">
          <div
            class="flex-shrink-0 min-h-0"
            :style="{ height: `${editorPanelHeightPercent}%` }"
          >
            <SqlTextEditor />
          </div>

          <div
            class="h-1 bg-gray-200 dark:bg-gray-700 cursor-row-resize hover:bg-primary-400"
            @mousedown="startResize"
          />

          <div class="flex-1 min-h-0">
            <SqlEditorResultPanel class="h-full" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <SqlEditorSaveDialog />
</template>
