<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { SaveQueryRequest } from '~/types/sql-editor'

interface FormError {
  path: string
  message: string
}

const sqlEditorStore = useSqlEditorStore()
const {
  isSaveDialogOpen,
  editingQueryId,
  editingQuery,
  connectionId,
  sql,
  savedQueryError,
  pendingCloseTabId,
  folders,
} = storeToRefs(sqlEditorStore)
const toast = useToast()

const isOpen = computed({
  get: () => isSaveDialogOpen.value,
  set: (val) => {
    if (!val) {
      sqlEditorStore.closeSaveDialog()
      sqlEditorStore.clearPendingCloseTab()
    }
  },
})

const isEditMode = computed(() => !!editingQueryId.value)

const state = ref({
  name: '',
  description: '',
  tags: '',
  folderPath: null as string | null,
})

const isSaving = ref(false)

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return

    if (isEditMode.value && editingQuery.value) {
      state.value.name = editingQuery.value.name
      state.value.description = editingQuery.value.description || ''
      state.value.tags = editingQuery.value.tags.join(', ')
      state.value.folderPath = editingQuery.value.folderPath ?? null
    } else {
      state.value.name = ''
      state.value.description = ''
      state.value.tags = ''
      state.value.folderPath = null
    }
  }
)

const validate = (formState: typeof state.value): FormError[] => {
  const errors: FormError[] = []

  if (!formState.name || formState.name.trim().length === 0) {
    errors.push({ path: 'name', message: 'クエリ名は必須です' })
  } else if (formState.name.length > 100) {
    errors.push({ path: 'name', message: 'クエリ名は100文字以内で入力してください' })
  }

  if (formState.description && formState.description.length > 500) {
    errors.push({ path: 'description', message: '説明は500文字以内で入力してください' })
  }

  return errors
}

const parseTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

const folderOptions = computed(() => [
  { label: 'ルート（フォルダなし）', value: null },
  ...folders.value.map((path) => ({ label: path, value: path })),
])

const handleSave = async () => {
  if (!connectionId.value) {
    toast.add({
      title: '接続情報が見つかりません',
      description: '接続を選択してから保存してください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!isEditMode.value && sql.value.trim().length === 0) {
    toast.add({
      title: 'SQLが空です',
      description: '保存するSQLを入力してください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  isSaving.value = true

  try {
    const tags = parseTags(state.value.tags)
    const description = state.value.description.trim()
    const normalizedDescription = description.length > 0 ? description : undefined

    let request: SaveQueryRequest

    if (isEditMode.value) {
      if (!editingQuery.value) {
        throw new Error('編集対象のクエリが見つかりません')
      }

      const fullQuery = await sqlEditorStore.fetchSavedQuery(editingQuery.value.id)
      request = {
        id: editingQuery.value.id,
        connectionId: fullQuery.connectionId,
        name: state.value.name.trim(),
        description: normalizedDescription,
        sql: fullQuery.sql,
        tags,
        folderPath: state.value.folderPath,
      }

      await sqlEditorStore.updateSavedQuery(request)
      toast.add({
        title: 'クエリ情報を更新しました',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    } else {
      request = {
        connectionId: connectionId.value,
        name: state.value.name.trim(),
        description: normalizedDescription,
        sql: sql.value,
        tags,
        folderPath: state.value.folderPath,
      }

      await sqlEditorStore.saveCurrentQuery(request)
      toast.add({
        title: 'クエリを保存しました',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

    const pendingTabId = pendingCloseTabId.value
    sqlEditorStore.closeSaveDialog()
    if (pendingTabId) {
      sqlEditorStore.closeTab(pendingTabId)
      sqlEditorStore.clearPendingCloseTab()
    }
  } catch (error) {
    toast.add({
      title: 'クエリの保存に失敗しました',
      description: savedQueryError.value || '入力内容を確認してください',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditMode ? '保存クエリを編集' : 'クエリを保存'"
    :description="isEditMode ? 'SQL本文は変更できません' : '名前・説明・タグを入力してください'"
  >
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSave" class="space-y-4">
        <UFormField label="クエリ名" name="name" required>
          <UInput
            v-model="state.name"
            placeholder="例: 全ユーザー一覧"
            :maxlength="100"
            autofocus
          />
        </UFormField>

        <UFormField label="説明" name="description" hint="任意">
          <UTextarea
            v-model="state.description"
            placeholder="このクエリの用途を説明..."
            :maxlength="500"
            :rows="3"
          />
        </UFormField>

        <UFormField label="タグ" name="tags" hint="カンマ区切りで入力">
          <UInput v-model="state.tags" placeholder="例: admin, report" />
        </UFormField>

        <UFormField label="保存先フォルダ" name="folder" hint="任意">
          <USelectMenu
            v-model="state.folderPath"
            :items="folderOptions"
            value-key="value"
            searchable
            searchable-placeholder="フォルダを検索..."
            placeholder="ルート（フォルダなし）"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton color="primary" :loading="isSaving" @click="handleSave">
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
