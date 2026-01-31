<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { SqlEditorHistoryEntry } from '~/types/sql-editor'

const store = useSqlEditorStore()
const { filteredHistories, isLoadingHistories, historySearchKeyword, historySuccessOnly, isDirty, isExecuting } =
  storeToRefs(store)
const { t, locale } = useI18n()
const toast = useToast()

const pendingHistory = ref<SqlEditorHistoryEntry | null>(null)
const confirmLoadOpen = ref(false)

const deleteDialogOpen = ref(false)
const historyToDelete = ref<SqlEditorHistoryEntry | null>(null)

const reExecuteTargetId = ref<string | null>(null)

onMounted(() => {
  if (store.histories.length === 0 && !store.isLoadingHistories) {
    void store.fetchHistories()
  }
})

const handleLoad = (history: SqlEditorHistoryEntry) => {
  if (isDirty.value) {
    pendingHistory.value = history
    confirmLoadOpen.value = true
    return
  }
  void executeLoad(history)
}

const executeLoad = async (history: SqlEditorHistoryEntry) => {
  try {
    await store.loadHistory(history.id)
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.loadSuccess'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.loadFailed'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleConfirmLoad = async () => {
  if (!pendingHistory.value) return
  await executeLoad(pendingHistory.value)
  pendingHistory.value = null
}

const handleReExecute = async (history: SqlEditorHistoryEntry) => {
  if (isExecuting.value) return
  reExecuteTargetId.value = history.id

  toast.add({
    title: t('sqlEditor.historyPanel.toasts.reExecuteStart'),
    color: 'primary',
    icon: 'i-heroicons-play',
  })

  await store.executeSqlText(history.sql)

  if (store.error) {
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.reExecuteFailed'),
      description: store.error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } else {
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.reExecuteSuccess'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }

  reExecuteTargetId.value = null
}

const handleDelete = (history: SqlEditorHistoryEntry) => {
  historyToDelete.value = history
  deleteDialogOpen.value = true
}

const executeDelete = async () => {
  if (!historyToDelete.value) return

  try {
    await store.deleteHistory(historyToDelete.value.id)
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.deleteSuccess'),
      color: 'success',
      icon: 'i-heroicons-trash',
    })
  } catch (error) {
    toast.add({
      title: t('sqlEditor.historyPanel.toasts.deleteFailed'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    historyToDelete.value = null
  }
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 60_000) return t('sqlEditor.historyPanel.relativeTime.fewSecondsAgo')
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000)
    return t('sqlEditor.historyPanel.relativeTime.minutesAgo', { minutes })
  }

  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    const time = date.toLocaleTimeString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return t('sqlEditor.historyPanel.relativeTime.today', { time })
  }

  return date.toLocaleString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatExecutionTime = (ms: number) => {
  if (ms < 1000) return t('sqlEditor.historyPanel.executionTime', { ms })
  return t('sqlEditor.historyPanel.executionTimeSeconds', { seconds: (ms / 1000).toFixed(2) })
}

const formatSqlSnippet = (sql: string) => {
  const lines = sql.trim().split(/\r?\n/).slice(0, 2)
  const snippet = lines.join('\n').trim()
  if (snippet.length <= 80) return snippet
  return `${snippet.slice(0, 77)}...`
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900">
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
      <UInput
        :model-value="historySearchKeyword"
        @update:model-value="store.setHistorySearchKeyword"
        icon="i-heroicons-magnifying-glass"
        :placeholder="$t('sqlEditor.historyPanel.search')"
        clearable
      />
      <UCheckbox
        :model-value="historySuccessOnly"
        @update:model-value="(value) => store.setHistorySuccessOnly(value === true)"
        :label="$t('sqlEditor.historyPanel.filterSuccessOnly')"
      />
    </div>

    <div class="flex-1 overflow-auto p-3">
      <div v-if="isLoadingHistories" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      </div>

      <div v-else-if="filteredHistories.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('sqlEditor.historyPanel.empty') }}
      </div>

      <div v-else class="space-y-2">
        <UCard
          v-for="history in filteredHistories"
          :key="history.id"
          class="group cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all [&>div]:p-3"
          @click="handleLoad(history)"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UBadge
                  :color="history.status === 'success' ? 'success' : 'error'"
                  variant="subtle"
                  size="xs"
                >
                  {{ history.status === 'success' ? $t('sqlEditor.historyPanel.status.success') : $t('sqlEditor.historyPanel.status.failure') }}
                </UBadge>
                <span class="text-xs text-gray-500">
                  {{ formatRelativeTime(history.executedAt) }}
                </span>
                <span class="text-xs text-gray-500">
                  ({{ formatExecutionTime(history.executionTimeMs) }})
                </span>
              </div>

              <div class="font-mono text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded line-clamp-2 break-words whitespace-pre-wrap mb-1">
                {{ formatSqlSnippet(history.sql) }}
              </div>

              <div class="text-xs text-gray-500 space-y-1">
                <span v-if="history.status === 'success' && history.rowCount !== undefined">
                  {{ $t('sqlEditor.historyPanel.rowCount', { count: history.rowCount }) }}
                </span>
                <span v-if="history.status === 'error' && history.errorMessage" class="text-red-500 line-clamp-2">
                  {{ history.errorMessage }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1 ml-1 opacity-0 group-hover:opacity-100 transition">
              <UButton
                icon="i-heroicons-play"
                color="neutral"
                variant="ghost"
                size="xs"
                :title="$t('sqlEditor.historyPanel.actions.reExecute')"
                :loading="reExecuteTargetId === history.id"
                :disabled="isExecuting"
                @click.stop="handleReExecute(history)"
              />
              <UButton
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                size="xs"
                :title="$t('sqlEditor.historyPanel.actions.delete')"
                @click.stop="handleDelete(history)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <Teleport to="body">
      <ConfirmDialog
        v-model:open="confirmLoadOpen"
        :title="$t('sqlEditor.historyPanel.dialogs.confirmLoad.title')"
        :description="$t('sqlEditor.historyPanel.dialogs.confirmLoad.description')"
        :confirm-label="$t('sqlEditor.historyPanel.dialogs.confirmLoad.confirmLabel')"
        confirm-color="warning"
        @confirm="handleConfirmLoad"
        @cancel="pendingHistory = null"
      />

      <ConfirmDialog
        v-model:open="deleteDialogOpen"
        :title="$t('sqlEditor.historyPanel.dialogs.deleteHistory.title')"
        :description="historyToDelete ? $t('sqlEditor.historyPanel.dialogs.deleteHistory.description') : undefined"
        :confirm-label="$t('sqlEditor.historyPanel.dialogs.deleteHistory.confirmLabel')"
        @confirm="executeDelete"
        @cancel="historyToDelete = null"
      />
    </Teleport>
  </div>
</template>
