<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { SqlEditorHistoryEntry } from '~/types/sql-editor'

const store = useSqlEditorStore()
const { filteredHistories, isLoadingHistories, historySearchKeyword, historySuccessOnly, isDirty, isExecuting } =
  storeToRefs(store)
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
      title: '履歴を読み込みました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: '履歴の読み込みに失敗しました',
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
    title: '履歴を再実行しています',
    color: 'primary',
    icon: 'i-heroicons-play',
  })

  await store.executeSqlText(history.sql)

  if (store.error) {
    toast.add({
      title: '履歴の再実行に失敗しました',
      description: store.error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } else {
    toast.add({
      title: '履歴を再実行しました',
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
      title: '履歴を削除しました',
      color: 'success',
      icon: 'i-heroicons-trash',
    })
  } catch (error) {
    toast.add({
      title: '履歴の削除に失敗しました',
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

  if (diffMs < 60_000) return '数秒前'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}分前`

  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return `今日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
  }

  return date.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatExecutionTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}秒`
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
        placeholder="履歴を検索..."
        clearable
      />
      <UCheckbox
        :model-value="historySuccessOnly"
        @update:model-value="(value) => store.setHistorySuccessOnly(value === true)"
        label="成功のみ表示"
      />
    </div>

    <div class="flex-1 overflow-auto p-3">
      <div v-if="isLoadingHistories" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      </div>

      <div v-else-if="filteredHistories.length === 0" class="text-center py-8 text-gray-500">
        履歴がありません
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
                  {{ history.status === 'success' ? '成功' : '失敗' }}
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
                  {{ history.rowCount }}行
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
                title="再実行"
                :loading="reExecuteTargetId === history.id"
                :disabled="isExecuting"
                @click.stop="handleReExecute(history)"
              />
              <UButton
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                size="xs"
                title="削除"
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
        title="未保存の変更があります"
        description="現在の編集内容は失われます。続行しますか？"
        confirm-label="読み込み"
        confirm-color="warning"
        @confirm="handleConfirmLoad"
        @cancel="pendingHistory = null"
      />

      <ConfirmDialog
        v-model:open="deleteDialogOpen"
        title="履歴を削除しますか？"
        :description="historyToDelete ? 'この履歴は元に戻せません。' : undefined"
        confirm-label="削除"
        @confirm="executeDelete"
        @cancel="historyToDelete = null"
      />
    </Teleport>
  </div>
</template>
