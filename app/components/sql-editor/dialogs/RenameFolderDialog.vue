<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseFolderPath, validateFolderName } from '~/utils/folder-validation'

interface FormError {
  path: string
  message: string
}

const props = defineProps<{
  open: boolean
  folderPath: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', newName: string): void
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

const segments = computed(() => parseFolderPath(props.folderPath))
const currentName = computed(() => segments.value[segments.value.length - 1] || '')
const parentPath = computed(() => {
  if (segments.value.length <= 1) return null
  return `/${segments.value.slice(0, -1).join('/')}`
})

const state = ref({
  name: '',
})

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return
    state.value.name = currentName.value
  }
)

const validate = (formState: typeof state.value): FormError[] => {
  const errors: FormError[] = []
  const result = validateFolderName(formState.name.trim())
  if (!result.valid) {
    errors.push({ path: 'name', message: result.error || t('sqlEditor.savedPanel.validation.invalidFolderName') })
  }
  return errors
}

const handleSubmit = () => {
  const name = state.value.name.trim()
  emit('confirm', name)
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('sqlEditor.savedPanel.dialogs.renameFolder.title')"
    :description="$t('sqlEditor.savedPanel.dialogs.renameFolder.description')"
  >
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSubmit" class="space-y-4">
        <div class="text-xs text-gray-500">
          {{ $t('sqlEditor.savedPanel.dialogs.renameFolder.targetLabel') }}
          {{ props.folderPath || $t('sqlEditor.savedPanel.dialogs.renameFolder.targetRoot') }}
        </div>
        <div v-if="parentPath" class="text-xs text-gray-500">
          {{ $t('sqlEditor.savedPanel.dialogs.renameFolder.parentLabel') }} {{ parentPath }}
        </div>
        <UFormField :label="$t('sqlEditor.savedPanel.dialogs.renameFolder.nameLabel')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('sqlEditor.savedPanel.dialogs.renameFolder.namePlaceholder')"
            maxlength="100"
            autofocus
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('sqlEditor.savedPanel.dialogs.renameFolder.actions.cancel') }}
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          {{ $t('sqlEditor.savedPanel.dialogs.renameFolder.actions.rename') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
