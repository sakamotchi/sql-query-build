<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'
import type { SerializableBuilderState } from '@/types/saved-query'

const { t } = useI18n()

interface FormError {
  path: string
  message: string
}

const props = defineProps<{
  open: boolean
  defaultName?: string
  query?: SerializableBuilderState
  connectionId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const savedQueryStore = useSavedQueryStore()
const toast = useToast()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const state = ref({
  name: '',
  description: '',
  tags: '', 
})

// ダイアログが開かれたときに初期化
watch(() => props.open, (newVal) => {
  if (newVal) {
    state.value.name = props.defaultName || ''
    state.value.description = ''
    state.value.tags = ''
  }
})

const validate = (state: any): FormError[] => {
  const errors: FormError[] = []

  // クエリ名のバリデーション
  if (!state.name || state.name.trim().length === 0) {
    errors.push({ path: 'name', message: t('queryBuilder.saveQueryDialog.errors.nameRequired') })
  } else if (state.name.length > 200) {
    errors.push({ path: 'name', message: t('queryBuilder.saveQueryDialog.errors.nameLength') })
  }

  // 説明のバリデーション
  if (state.description && state.description.length > 1000) {
    errors.push({ path: 'description', message: t('queryBuilder.saveQueryDialog.errors.descLength') })
  }

  // タグのバリデーション
  if (state.tags) {
    const tagsList = state.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
    if (tagsList.length > 20) {
      errors.push({ path: 'tags', message: t('queryBuilder.saveQueryDialog.errors.tagsCount') })
    }
    const invalidTag = tagsList.find((tag: string) => tag.length > 50)
    if (invalidTag) {
      errors.push({ path: 'tags', message: t('queryBuilder.saveQueryDialog.errors.tagLength') })
    }
  }

  return errors
}

const handleSave = async () => {
  const tagsList = state.value.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  const success = await savedQueryStore.saveCurrentQuery(
    state.value.name,
    state.value.description,
    tagsList,
    undefined,
    props.query,
    props.connectionId
  )

  if (success) {
    toast.add({
      title: t('queryBuilder.saveQueryDialog.toast.successTitle'),
      description: t('queryBuilder.saveQueryDialog.toast.successDesc'),
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    emit('saved')
    isOpen.value = false
  } else {
    toast.add({
      title: t('queryBuilder.saveQueryDialog.toast.errorTitle'),
      description: savedQueryStore.error || t('queryBuilder.saveQueryDialog.toast.errorDesc'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('queryBuilder.saveQueryDialog.title')" :description="t('queryBuilder.saveQueryDialog.description')">
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSave" class="space-y-4">
        <UFormField :label="t('queryBuilder.saveQueryDialog.queryName')" name="name" required>
          <UInput v-model="state.name" :placeholder="t('queryBuilder.saveQueryDialog.queryNamePlaceholder')" autofocus />
        </UFormField>

        <UFormField :label="t('queryBuilder.saveQueryDialog.desc')" name="description">
          <UTextarea v-model="state.description" :placeholder="t('queryBuilder.saveQueryDialog.descPlaceholder')" />
        </UFormField>

        <UFormField :label="t('queryBuilder.saveQueryDialog.tags')" name="tags" :help="t('queryBuilder.saveQueryDialog.tagsHelp')">
          <UInput v-model="state.tags" :placeholder="t('queryBuilder.saveQueryDialog.tagsPlaceholder')" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ t('common.actions.cancel') }}
        </UButton>
        <UButton color="primary" @click="handleSave">
          {{ t('common.actions.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
