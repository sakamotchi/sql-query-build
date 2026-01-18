<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { SavedQueryMetadata } from '~/types/sql-editor'

const sqlEditorStore = useSqlEditorStore()
const { savedQueries, isSavedQueriesLoading, savedQueryError, isDirty, currentQuery } =
  storeToRefs(sqlEditorStore)
const toast = useToast()

const searchKeyword = ref('')
const activeTag = ref<string | null>(null)

const pendingQuery = ref<SavedQueryMetadata | null>(null)
const confirmLoadOpen = ref(false)

const deleteDialogOpen = ref(false)
const queryToDelete = ref<SavedQueryMetadata | null>(null)

const filteredQueries = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return savedQueries.value.filter((query) => {
    if (activeTag.value && !query.tags.includes(activeTag.value)) {
      return false
    }

    if (!keyword) return true

    const nameMatch = query.name.toLowerCase().includes(keyword)
    const descMatch = (query.description || '').toLowerCase().includes(keyword)
    const tagMatch = query.tags.some((tag) => tag.toLowerCase().includes(keyword))

    if (nameMatch || descMatch || tagMatch) return true

    const sqlText = sqlEditorStore.savedQuerySqlCache[query.id]
    if (!sqlText) return false

    return sqlText.toLowerCase().includes(keyword)
  })
})

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const handleLoad = (query: SavedQueryMetadata) => {
  if (isDirty.value) {
    pendingQuery.value = query
    confirmLoadOpen.value = true
    return
  }

  void executeLoad(query)
}

const executeLoad = async (query: SavedQueryMetadata) => {
  try {
    await sqlEditorStore.loadSavedQuery(query.id)
    toast.add({
      title: `「${query.name}」を読み込みました`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの読み込みに失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleConfirmLoad = async () => {
  if (!pendingQuery.value) return
  await executeLoad(pendingQuery.value)
  pendingQuery.value = null
}

const handleExecute = async (query: SavedQueryMetadata) => {
  try {
    await sqlEditorStore.executeSavedQuery(query.id)
  } catch (error) {
    toast.add({
      title: 'クエリの実行に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleEdit = (query: SavedQueryMetadata) => {
  sqlEditorStore.openSaveDialog(query.id)
}

const handleDelete = (query: SavedQueryMetadata) => {
  queryToDelete.value = query
  deleteDialogOpen.value = true
}

const executeDelete = async () => {
  if (!queryToDelete.value) return

  try {
    await sqlEditorStore.deleteSavedQuery(queryToDelete.value.id)
    toast.add({
      title: 'クエリを削除しました',
      color: 'success',
      icon: 'i-heroicons-trash',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの削除に失敗しました',
      description: savedQueryError.value || '時間をおいて再度お試しください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    queryToDelete.value = null
  }
}

const toggleTagFilter = (tag: string) => {
  activeTag.value = activeTag.value === tag ? null : tag
}

const clearFilters = () => {
  searchKeyword.value = ''
  activeTag.value = null
}
</script>

<template>
  <div class="h-full flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
      <UInput
        v-model="searchKeyword"
        icon="i-heroicons-magnifying-glass"
        placeholder="クエリを検索..."
        clearable
      />
      <div v-if="activeTag" class="flex items-center gap-2 text-xs text-gray-500">
        <span>タグフィルタ:</span>
        <UBadge color="primary" variant="soft" class="cursor-pointer" @click="toggleTagFilter(activeTag)">
          #{{ activeTag }}
        </UBadge>
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="clearFilters"
        />
      </div>
    </div>

    <div class="p-3 border-b border-gray-200 dark:border-gray-800" v-if="currentQuery">
      <p class="text-xs text-gray-500">読み込み中のクエリ</p>
      <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ currentQuery.name }}
      </p>
      <p v-if="currentQuery.description" class="text-xs text-gray-500 line-clamp-2 mt-1">
        {{ currentQuery.description }}
      </p>
      <div class="flex flex-wrap gap-1 mt-2">
        <UBadge
          v-for="tag in currentQuery.tags"
          :key="tag"
          size="xs"
          color="neutral"
          variant="soft"
        >
          {{ tag }}
        </UBadge>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-3">
      <div v-if="isSavedQueriesLoading" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      </div>

      <div v-else-if="filteredQueries.length === 0" class="text-center py-8 text-gray-500">
        保存されたクエリがありません
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="query in filteredQueries"
          :key="query.id"
          class="group rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:border-primary-300 hover:shadow-sm transition"
          :class="{ 'border-primary-400 bg-primary-50/40 dark:bg-primary-500/10': currentQuery?.id === query.id }"
        >
          <div class="flex items-start gap-3">
            <button
              class="flex-1 text-left"
              type="button"
              @click="handleLoad(query)"
            >
              <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {{ query.name }}
              </p>
              <p v-if="query.description" class="text-xs text-gray-500 line-clamp-2 mt-1">
                {{ query.description }}
              </p>
              <div class="flex flex-wrap gap-1 mt-2">
                <UBadge
                  v-for="tag in query.tags"
                  :key="tag"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  class="cursor-pointer"
                  @click.stop="toggleTagFilter(tag)"
                >
                  {{ tag }}
                </UBadge>
              </div>
              <p class="text-xs text-gray-400 mt-2">{{ formatDate(query.updatedAt) }}</p>
            </button>

            <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
              <UButton
                icon="i-heroicons-play"
                size="xs"
                variant="ghost"
                color="primary"
                @click.stop="handleExecute(query)"
              />
              <UButton
                icon="i-heroicons-pencil"
                size="xs"
                variant="ghost"
                color="neutral"
                @click.stop="handleEdit(query)"
              />
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                variant="ghost"
                color="error"
                @click.stop="handleDelete(query)"
              />
            </div>
          </div>
        </div>
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
        @cancel="pendingQuery = null"
      />

      <ConfirmDialog
        v-model:open="deleteDialogOpen"
        :title="'保存クエリを削除しますか？'"
        :description="queryToDelete ? `「${queryToDelete.name}」は元に戻せません。` : undefined"
        confirm-label="削除"
        @confirm="executeDelete"
        @cancel="queryToDelete = null"
      />
    </Teleport>
  </div>
</template>
