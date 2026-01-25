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
    errors.push({ path: 'name', message: result.error || 'フォルダ名が無効です' })
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
  <UModal v-model:open="isOpen" title="フォルダ名を変更" description="新しいフォルダ名を入力してください">
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSubmit" class="space-y-4">
        <div class="text-xs text-gray-500">
          変更対象: {{ props.folderPath || 'ルート' }}
        </div>
        <div v-if="parentPath" class="text-xs text-gray-500">
          親フォルダ: {{ parentPath }}
        </div>
        <UFormField label="新しいフォルダ名" name="name" required>
          <UInput v-model="state.name" placeholder="例: 本番環境" maxlength="100" autofocus />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          変更
        </UButton>
      </div>
    </template>
  </UModal>
</template>
