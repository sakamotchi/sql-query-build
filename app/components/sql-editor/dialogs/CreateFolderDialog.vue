<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { validateFolderName } from '~/utils/folder-validation'

interface FormError {
  path: string
  message: string
}

const props = defineProps<{
  open: boolean
  parentPath: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', name: string, parentPath: string | null): void
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

const state = ref({
  name: '',
})

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return
    state.value.name = ''
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
  emit('confirm', name, props.parentPath ?? null)
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('sqlEditor.savedPanel.dialogs.createFolder.title')"
    :description="$t('sqlEditor.savedPanel.dialogs.createFolder.description')"
  >
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSubmit" class="space-y-4">
        <div class="text-xs text-gray-500">
          {{ $t('sqlEditor.savedPanel.dialogs.createFolder.targetLabel') }}
          {{ props.parentPath || $t('sqlEditor.savedPanel.dialogs.createFolder.targetRoot') }}
        </div>
        <UFormField :label="$t('sqlEditor.savedPanel.dialogs.createFolder.nameLabel')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('sqlEditor.savedPanel.dialogs.createFolder.namePlaceholder')"
            maxlength="100"
            autofocus
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('sqlEditor.savedPanel.dialogs.createFolder.actions.cancel') }}
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          {{ $t('sqlEditor.savedPanel.dialogs.createFolder.actions.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
