<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface FolderOption {
  label: string
  value: string
}

const props = defineProps<{
  open: boolean
  queryName: string | null
  currentFolderPath: string | null
  folders: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', targetPath: string | null): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    if (!value) {
      emit('cancel')
    }
    emit('update:open', value)
  },
})

const { t } = useI18n()

const options = computed<FolderOption[]>(() => [
  { label: t('sqlEditor.savedPanel.dialogs.moveQuery.rootOption'), value: '' },
  ...props.folders.map((path) => ({ label: path, value: path })),
])

const selectedPath = ref('')

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return
    selectedPath.value = props.currentFolderPath || ''
  }
)

const handleSubmit = () => {
  emit('confirm', selectedPath.value === '' ? null : selectedPath.value)
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('sqlEditor.savedPanel.dialogs.moveQuery.title')"
    :description="queryName
      ? $t('sqlEditor.savedPanel.dialogs.moveQuery.description', { name: queryName })
      : $t('sqlEditor.savedPanel.dialogs.moveQuery.descriptionNoName')"
  >
    <template #body>
      <UForm @submit="handleSubmit" class="space-y-4">
        <UFormField :label="$t('sqlEditor.savedPanel.dialogs.moveQuery.folderLabel')" name="folder">
          <USelectMenu
            v-model="selectedPath"
            :items="options"
            value-key="value"
            searchable
            :placeholder="$t('sqlEditor.savedPanel.dialogs.moveQuery.placeholder')"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('sqlEditor.savedPanel.dialogs.moveQuery.actions.cancel') }}
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          {{ $t('sqlEditor.savedPanel.dialogs.moveQuery.actions.move') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
