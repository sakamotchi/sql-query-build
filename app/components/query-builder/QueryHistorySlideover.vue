<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQueryHistoryStore } from '@/stores/query-history'
import type { QueryHistoryMetadata, QueryHistory } from '@/types/query-history'
import SaveQueryDialog from './dialog/SaveQueryDialog.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'loaded', id: string): void
}>()

const store = useQueryHistoryStore()
const toast = useToast()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const searchQuery = ref('')
const successOnly = ref(false)
const showSaveDialog = ref(false)
const historyToSave = ref<QueryHistory | null>(null)
const confirmDialogOpen = ref(false)
const historyToDelete = ref<QueryHistoryMetadata | null>(null)

// 初期ロード
onMounted(() => {
  store.fetchHistories()
})

// 検索・フィルタリング
watch([searchQuery, successOnly], () => {
  store.setSearchKeyword(searchQuery.value)
  store.setSuccessOnly(successOnly.value)
})

// ダイアログが開かれたときにリストを更新
watch(() => props.open, (newVal) => {
  if (newVal) {
    store.fetchHistories()
  }
})

const handleLoad = async (history: QueryHistoryMetadata) => {
  try {
    const loadedHistory = await store.loadToBuilder(history.id)
    if (loadedHistory) {
        toast.add({
        title: '復元成功',
        description: `履歴（${formatDate(history.executedAt)}）を復元しました`,
        color: 'green',
        icon: 'i-heroicons-check-circle'
        })
        emit('loaded', history.id)
        isOpen.value = false
    }
  } catch (error) {
    toast.add({
      title: '復元失敗',
      description: '履歴の復元に失敗しました',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

const handleSave = async (historyMeta: QueryHistoryMetadata) => {
    try {
        const history = await store.loadHistory(historyMeta.id)
        if (history) {
            historyToSave.value = history
            showSaveDialog.value = true
        }
    } catch(e) {
        toast.add({
            title: 'エラー',
            description: '履歴の読み込みに失敗しました',
            color: 'red',
            icon: 'i-heroicons-exclamation-circle'
        })
    }
}

const handleDelete = (history: QueryHistoryMetadata) => {
  historyToDelete.value = history
  confirmDialogOpen.value = true
}

const executeDelete = async () => {
  if (!historyToDelete.value) return

  await store.deleteHistory(historyToDelete.value.id)
  toast.add({
    title: '削除成功',
    description: '履歴を削除しました',
    color: 'green',
    icon: 'i-heroicons-trash'
  })
  confirmDialogOpen.value = false
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

const formatExecutionTime = (ms?: number) => {
    if (ms === undefined || ms === null) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
}
</script>

<template>
  <USlideover v-model:open="isOpen" title="クエリ履歴" description="実行したクエリの履歴です。">
    <template #body>
      <div class="flex flex-col h-full">
        <!-- 検索・フィルタ -->
        <div class="mb-4 space-y-2">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="SQLを検索..."
            clearable
          />
          <div class="flex items-center">
            <UCheckbox v-model="successOnly" label="成功のみ表示" />
          </div>
        </div>

        <!-- リスト -->
        <div class="flex-1 space-y-3 overflow-y-auto">
          <div v-if="store.isLoading" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
          </div>
          
          <div v-else-if="store.filteredHistories.length === 0" class="text-center py-8 text-gray-500">
            履歴はありません
          </div>

          <UCard
            v-for="history in store.filteredHistories"
            :key="history.id"
            class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all [&>div]:p-4"
          >
            <div class="flex justify-between items-start">
              <div @click="handleLoad(history)" class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <UBadge :color="history.success ? 'green' : 'red'" variant="subtle" size="xs">
                        {{ history.success ? '成功' : '失敗' }}
                    </UBadge>
                    <span class="text-xs text-gray-500">
                        {{ formatDate(history.executedAt) }}
                    </span>
                </div>

                <div class="font-mono text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded line-clamp-3 mb-2">
                    {{ history.sql }}
                </div>
                
                <div class="flex gap-4 text-xs text-gray-500">
                  <span v-if="history.resultCount !== undefined">
                    {{ history.resultCount }} 行
                  </span>
                  <span v-if="history.executionTimeMs !== undefined">
                    {{ formatExecutionTime(history.executionTimeMs) }}
                  </span>
                </div>
              </div>
              
              <div class="flex flex-col gap-1 ml-2">
                <UButton
                  icon="i-heroicons-document-arrow-down"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  title="保存済みクエリとして保存"
                  @click.stop="handleSave(history)"
                />
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  title="履歴から削除"
                  @click.stop="handleDelete(history)"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </USlideover>

  <ConfirmDialog
    v-model:open="confirmDialogOpen"
    title="履歴の削除"
    description="この履歴を削除してもよろしいですか？（元に戻せません）"
    confirm-label="削除"
    @confirm="executeDelete"
  />

  <SaveQueryDialog
    v-model:open="showSaveDialog"
    :default-name="`History ${historyToSave ? formatDate(historyToSave.executedAt) : ''}`"
    :query="historyToSave?.query"
    :connection-id="historyToSave?.connectionId"
  />
</template>
