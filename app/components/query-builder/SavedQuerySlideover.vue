<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import type { SavedQueryMetadata } from '@/types/saved-query'
import type { QueryValidationResult } from '@/types/query-validation'
import { validateSavedQuery } from '@/utils/query-validator'
import { detectQueryType, getQueryBuilderPath, getQueryTypeLabel } from '@/utils/query-type-detector'
import QueryValidationDialog from './QueryValidationDialog.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'load', id: string): void
}>()

const router = useRouter()
const store = useSavedQueryStore()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const toast = useToast()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const searchQuery = ref('')
const selectedTags = ref<string[]>([])

// 初期ロード
onMounted(() => {
  store.fetchQueries()
})

// 検索・フィルタリング
watch([searchQuery, selectedTags], () => {
  store.setSearchKeyword(searchQuery.value)
  store.setSelectedTags(selectedTags.value)
})

// ダイアログが開かれたときにリストを更新
watch(() => props.open, (newVal) => {
  if (newVal) {
    store.fetchQueries()
  }
})

const validationDialogOpen = ref(false)
const validationResult = ref<QueryValidationResult | null>(null)
const queryToLoad = ref<SavedQueryMetadata | null>(null)

const handleLoad = async (query: SavedQueryMetadata) => {
  try {
    // クエリの詳細を取得
    const fullQuery = await store.loadQuery(query.id)
    const currentConnectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

    if (!currentConnectionId) {
      toast.add({
        title: '接続が選択されていません',
        description: '接続を選択してからクエリを開いてください',
        color: 'red',
        icon: 'i-heroicons-exclamation-circle'
      })
      return
    }

    // バリデーション実行
    const validation = await validateSavedQuery(fullQuery, currentConnectionId)

    // エラーまたは警告がある場合はダイアログを表示
    if (validation.status === 'error' || validation.status === 'warning') {
      queryToLoad.value = query
      validationResult.value = validation
      validationDialogOpen.value = true
      return
    }

    // 接続が異なるが全テーブル存在する場合はToast通知
    if (!validation.connectionMatches && validation.message) {
      toast.add({
        title: '接続が異なります',
        description: validation.message,
        color: 'blue',
        icon: 'i-heroicons-information-circle'
      })
    }

    // クエリをロード
    await executeLoad(query)
  } catch (error) {
    toast.add({
      title: '読み込み失敗',
      description: 'クエリの読み込みに失敗しました',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

const executeLoad = async (query: SavedQueryMetadata) => {
  // クエリの詳細を取得してタイプを判定
  const fullQuery = await store.loadQuery(query.id)
  const queryType = detectQueryType(fullQuery.query)
  const targetPath = getQueryBuilderPath(queryType)
  const currentPath = router.currentRoute.value.path

  // クエリタイプに応じて適切なストアにロード
  if (queryType === 'SELECT') {
    // SELECTクエリの場合はquery-builderストアにロード
    await store.loadQueryToBuilder(query.id)
  } else {
    // INSERT/UPDATE/DELETEクエリの場合はmutation-builderストアにロード
    await store.loadQueryToMutationBuilder(query.id)
  }

  toast.add({
    title: '読み込み成功',
    description: `クエリ「${fullQuery.name}」を読み込みました`,
    color: 'green',
    icon: 'i-heroicons-check-circle'
  })

  emit('load', query.id)
  isOpen.value = false

  // 必要に応じて画面遷移
  if (currentPath !== targetPath) {
    const typeLabel = getQueryTypeLabel(queryType)
    toast.add({
      title: '画面を切り替えました',
      description: `${typeLabel}画面に移動しました`,
      color: 'blue',
      icon: 'i-heroicons-arrow-right-circle'
    })
    await router.push(targetPath)
  }
}

const handleValidationConfirm = async () => {
  if (!queryToLoad.value) return
  await executeLoad(queryToLoad.value)
  queryToLoad.value = null
  validationResult.value = null
}

const handleValidationCancel = () => {
  queryToLoad.value = null
  validationResult.value = null
}

const confirmDialogOpen = ref(false)
const queryToDelete = ref<SavedQueryMetadata | null>(null)

const handleDelete = (query: SavedQueryMetadata) => {
  queryToDelete.value = query
  confirmDialogOpen.value = true
}

const executeDelete = async () => {
  if (!queryToDelete.value) return

  await store.deleteQuery(queryToDelete.value.id)
  toast.add({
    title: '削除成功',
    description: 'クエリを削除しました',
    color: 'green',
    icon: 'i-heroicons-trash'
  })
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}
</script>

<template>
  <USlideover v-model:open="isOpen" title="保存済みクエリ" description="保存されたクエリの一覧です。">
    <template #body>
      <div class="flex flex-col h-full">
        <!-- 検索・フィルタ -->
        <div class="mb-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="クエリを検索..."
            clearable
          />
        </div>

        <!-- リスト -->
        <div class="flex-1 space-y-3">
          <div v-if="store.isLoading" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
          </div>
          
          <div v-else-if="store.filteredQueries.length === 0" class="text-center py-8 text-gray-500">
            保存されたクエリはありません
          </div>

          <UCard
            v-for="query in store.filteredQueries"
            :key="query.id"
            class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all [&>div]:p-4"
          >
            <div class="flex justify-between items-start">
              <div @click="handleLoad(query)" class="flex-1">
                <h4 class="font-medium text-gray-900 dark:text-white truncate">
                  {{ query.name }}
                </h4>
                <p v-if="query.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {{ query.description }}
                </p>
                
                <div class="flex flex-wrap gap-1 mt-2">
                  <UBadge v-for="tag in query.tags" :key="tag" color="gray" variant="soft" size="xs">
                    {{ tag }}
                  </UBadge>
                </div>
                
                <div class="mt-2 text-xs text-gray-400">
                  更新: {{ formatDate(query.updatedAt) }}
                </div>
              </div>
              
              <div class="flex flex-col gap-1 ml-2">
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click.stop="handleDelete(query)"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </USlideover>

  <Teleport to="body">
    <ConfirmDialog
      v-model:open="confirmDialogOpen"
      title="クエリの削除"
      :description="`クエリ「${queryToDelete?.name}」を本当に削除してもよろしいですか？`"
      confirm-label="削除"
      @confirm="executeDelete"
    />

    <QueryValidationDialog
      v-model:open="validationDialogOpen"
      :validation="validationResult"
      :query-name="queryToLoad?.name"
      @confirm="handleValidationConfirm"
      @cancel="handleValidationCancel"
    />
  </Teleport>
</template>
