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
const { t } = useI18n()

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
        title: t('queryBuilder.savedQueries.toasts.noConnection'),
        description: t('queryBuilder.savedQueries.toasts.noConnectionDesc'),
        color: 'error',
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
        title: t('queryBuilder.savedQueries.toasts.connMismatch'),
        description: validation.message,
        color: 'info',
        icon: 'i-heroicons-information-circle'
      })
    }

    // クエリをロード
    await executeLoad(query)
  } catch (error) {
    toast.add({
      title: t('queryBuilder.savedQueries.toasts.loadFailed'),
      description: t('queryBuilder.savedQueries.toasts.loadFailedDesc'),
      color: 'error',
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
    title: t('queryBuilder.savedQueries.toasts.loadSuccess'),
    description: t('queryBuilder.savedQueries.toasts.loadSuccessDesc', { name: fullQuery.name }),
    color: 'success',
    icon: 'i-heroicons-check-circle'
  })

  emit('load', query.id)
  isOpen.value = false

  // 必要に応じて画面遷移
  if (currentPath !== targetPath) {
    const typeLabel = getQueryTypeLabel(queryType)
    toast.add({
      title: t('queryBuilder.savedQueries.toasts.screenSwitch'),
      description: t('queryBuilder.savedQueries.toasts.screenSwitchDesc', { label: typeLabel }),
      color: 'info',
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
    title: t('queryBuilder.savedQueries.toasts.deleteSuccess'),
    description: t('queryBuilder.savedQueries.toasts.deleteSuccessDesc'),
    color: 'success',
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
  <USlideover v-model:open="isOpen" :title="t('queryBuilder.savedQueries.title')" :description="t('queryBuilder.savedQueries.description')">
    <template #body>
      <div class="flex flex-col h-full">
        <!-- 検索・フィルタ -->
        <div class="mb-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('queryBuilder.savedQueries.searchPlaceholder')"
            clearable
          />
        </div>

        <!-- リスト -->
        <div class="flex-1 space-y-3">
          <div v-if="store.isLoading" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
          </div>
          
          <div v-else-if="store.filteredQueries.length === 0" class="text-center py-8 text-gray-500">
            {{ t('queryBuilder.savedQueries.empty') }}
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
                  <UBadge v-for="tag in query.tags" :key="tag" color="neutral" variant="soft" size="xs">
                    {{ tag }}
                  </UBadge>
                </div>
                
                <div class="mt-2 text-xs text-gray-400">
                  {{ t('queryBuilder.savedQueries.updated', { date: formatDate(query.updatedAt) }) }}
                </div>
              </div>
              
              <div class="flex flex-col gap-1 ml-2">
                <UButton
                  icon="i-heroicons-trash"
                  color="error"
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
      :title="t('queryBuilder.savedQueries.deleteConfirm.title')"
      :description="t('queryBuilder.savedQueries.deleteConfirm.desc', { name: queryToDelete?.name })"
      :confirm-label="t('common.actions.delete')"
      @confirm="executeDelete"
    />

    <QueryValidationDialog
      v-if="validationResult"
      v-model:open="validationDialogOpen"
      :validation="validationResult"
      :query-name="queryToLoad?.name"
      @confirm="handleValidationConfirm"
      @cancel="handleValidationCancel"
    />
  </Teleport>
</template>
