<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import SqlEditorHistoryPanel from '~/components/sql-editor/SqlEditorHistoryPanel.vue'
import SqlEditorSavedPanel from '~/components/sql-editor/SqlEditorSavedPanel.vue'
import SqlEditorSaveDialog from '~/components/sql-editor/SqlEditorSaveDialog.vue'
import EditorTabs from '~/components/sql-editor/EditorTabs.vue'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useDatabaseStructureStore } from '~/stores/database-structure'

const sqlEditorStore = useSqlEditorStore()
const databaseStructureStore = useDatabaseStructureStore()
const { editorPanelHeightPercent, isLeftPanelVisible, isSavedPanelOpen, isHistoryPanelOpen } = storeToRefs(sqlEditorStore)
const { t } = useI18n()

const summaryLoading = computed(() => {
  if (!sqlEditorStore.connectionId) return false
  return databaseStructureStore.isSummaryLoading(sqlEditorStore.connectionId)
})
const backgroundProgress = computed(() => {
  if (!sqlEditorStore.connectionId) return null
  return databaseStructureStore.getBackgroundProgress(sqlEditorStore.connectionId)
})
const backgroundProgressPercent = computed(() => {
  if (!backgroundProgress.value) return 0
  const { loaded, total } = backgroundProgress.value
  return total > 0 ? Math.round((loaded / total) * 100) : 0
})

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
  sqlEditorStore.loadSavedPanelOpen()
  sqlEditorStore.loadHistoryPanelOpen()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <div class="relative h-full flex flex-col">
    <SqlEditorToolbar class="flex-shrink-0" />
    <EditorTabs class="flex-shrink-0" />

    <div class="flex-1 flex overflow-hidden">
      <div
        v-if="isLeftPanelVisible"
        class="w-80 min-w-[18rem] max-w-[22rem] h-full flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <!-- 保存クエリパネル -->
        <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            @click="sqlEditorStore.toggleSavedPanelOpen()"
          >
            <span class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ $t('sqlEditor.layout.savedPanelTitle') }}</span>
            <UIcon
              :name="isSavedPanelOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-5 h-5 text-gray-500"
            />
          </button>
        </div>
        <div v-if="isSavedPanelOpen" class="flex-1 min-h-0 overflow-hidden">
          <SqlEditorSavedPanel />
        </div>

        <!-- 履歴パネル -->
        <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            @click="sqlEditorStore.toggleHistoryPanelOpen()"
          >
            <span class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ $t('sqlEditor.layout.historyPanelTitle') }}</span>
            <UIcon
              :name="isHistoryPanelOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-5 h-5 text-gray-500"
            />
          </button>
        </div>
        <div v-if="isHistoryPanelOpen" class="flex-1 min-h-0 overflow-hidden">
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

    <!-- フルオーバーレイ（Phase 1: サマリー取得 / Phase 2: カラム取得） -->
    <Transition name="fade">
      <div
        v-if="summaryLoading || backgroundProgress"
        class="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80"
      >
        <div class="flex w-72 flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-xl dark:bg-gray-800">
          <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-primary-500" />
          <div class="w-full text-center">
            <p class="font-semibold text-gray-800 dark:text-gray-100">
              {{ summaryLoading ? t('sqlEditor.structureLoading.summary') : t('sqlEditor.structureLoading.backgroundTitle') }}
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ summaryLoading ? t('sqlEditor.structureLoading.summarySubtitle') : t('sqlEditor.structureLoading.background', { loaded: backgroundProgress!.loaded, total: backgroundProgress!.total }) }}
            </p>
          </div>
          <!-- Phase 2 プログレスバー -->
          <div v-if="backgroundProgress" class="w-full">
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-full rounded-full bg-primary-500 transition-all duration-500"
                :style="{ width: `${backgroundProgressPercent}%` }"
              />
            </div>
            <p class="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">{{ backgroundProgressPercent }}%</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <SqlEditorSaveDialog />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
