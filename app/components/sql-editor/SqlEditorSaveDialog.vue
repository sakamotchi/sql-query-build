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
const { t } = useI18n()
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
    errors.push({ path: 'name', message: t('sqlEditor.saveDialog.validation.nameRequired') })
  } else if (formState.name.length > 100) {
    errors.push({ path: 'name', message: t('sqlEditor.saveDialog.validation.nameLength') })
  }

  if (formState.description && formState.description.length > 500) {
    errors.push({ path: 'description', message: t('sqlEditor.saveDialog.validation.descriptionLength') })
  }

  return errors
}

const parseTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

const folderOptions = computed(() => [
  { label: t('sqlEditor.saveDialog.fields.folder.rootOption'), value: null },
  ...folders.value.map((path) => ({ label: path, value: path })),
])

const handleSave = async () => {
  if (!connectionId.value) {
    toast.add({
      title: t('sqlEditor.saveDialog.toasts.noConnection'),
      description: t('sqlEditor.saveDialog.toasts.noConnectionDesc'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!isEditMode.value && sql.value.trim().length === 0) {
    toast.add({
      title: t('sqlEditor.saveDialog.toasts.sqlEmpty'),
      description: t('sqlEditor.saveDialog.toasts.sqlEmptyDesc'),
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
        throw new Error(t('sqlEditor.saveDialog.errors.editTargetNotFound'))
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
        title: t('sqlEditor.saveDialog.toasts.updateSuccess'),
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
        title: t('sqlEditor.saveDialog.toasts.saveSuccess'),
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
    const errorTitle = isEditMode.value
      ? t('sqlEditor.saveDialog.toasts.updateFailed')
      : t('sqlEditor.saveDialog.toasts.saveFailed')
    toast.add({
      title: errorTitle,
      description: savedQueryError.value || t('sqlEditor.saveDialog.toasts.saveFailedDesc'),
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
    :title="isEditMode ? $t('sqlEditor.saveDialog.title.edit') : $t('sqlEditor.saveDialog.title.create')"
    :description="isEditMode ? $t('sqlEditor.saveDialog.description.edit') : $t('sqlEditor.saveDialog.description.create')"
  >
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSave" class="space-y-4">
        <UFormField :label="$t('sqlEditor.saveDialog.fields.queryName.label')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('sqlEditor.saveDialog.fields.queryName.placeholder')"
            :maxlength="100"
            autofocus
          />
        </UFormField>

        <UFormField
          :label="$t('sqlEditor.saveDialog.fields.description.label')"
          name="description"
          :hint="$t('sqlEditor.saveDialog.fields.description.hint')"
        >
          <UTextarea
            v-model="state.description"
            :placeholder="$t('sqlEditor.saveDialog.fields.description.placeholder')"
            :maxlength="500"
            :rows="3"
          />
        </UFormField>

        <UFormField
          :label="$t('sqlEditor.saveDialog.fields.tags.label')"
          name="tags"
          :hint="$t('sqlEditor.saveDialog.fields.tags.hint')"
        >
          <UInput v-model="state.tags" :placeholder="$t('sqlEditor.saveDialog.fields.tags.placeholder')" />
        </UFormField>

        <UFormField
          :label="$t('sqlEditor.saveDialog.fields.folder.label')"
          name="folder"
          :hint="$t('sqlEditor.saveDialog.fields.folder.hint')"
        >
          <USelectMenu
            v-model="state.folderPath"
            :items="folderOptions"
            value-key="value"
            searchable
            :searchable-placeholder="$t('sqlEditor.saveDialog.fields.folder.searchPlaceholder')"
            :placeholder="$t('sqlEditor.saveDialog.fields.folder.rootOption')"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('sqlEditor.saveDialog.actions.cancel') }}
        </UButton>
        <UButton color="primary" :loading="isSaving" @click="handleSave">
          {{ $t('sqlEditor.saveDialog.actions.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
