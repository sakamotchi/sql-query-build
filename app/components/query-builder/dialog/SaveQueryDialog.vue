<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'
import type { SerializableBuilderState } from '@/types/saved-query'

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
    errors.push({ path: 'name', message: 'クエリ名は必須です' })
  } else if (state.name.length > 200) {
    errors.push({ path: 'name', message: 'クエリ名は200文字以内で入力してください' })
  }

  // 説明のバリデーション
  if (state.description && state.description.length > 1000) {
    errors.push({ path: 'description', message: '説明は1000文字以内で入力してください' })
  }

  // タグのバリデーション
  if (state.tags) {
    const tagsList = state.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
    if (tagsList.length > 20) {
      errors.push({ path: 'tags', message: 'タグは20個までです' })
    }
    const invalidTag = tagsList.find((tag: string) => tag.length > 50)
    if (invalidTag) {
      errors.push({ path: 'tags', message: '各タグは50文字以内で入力してください' })
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
      title: '保存成功',
      description: 'クエリを保存しました',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    emit('saved')
    isOpen.value = false
  } else {
    toast.add({
      title: '保存失敗',
      description: savedQueryStore.error || 'クエリの保存に失敗しました',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="クエリを保存" description="クエリの情報を入力して保存してください。">
    <template #body>
      <UForm :state="state" :validate="validate" @submit="handleSave" class="space-y-4">
        <UFormField label="クエリ名" name="name" required>
          <UInput v-model="state.name" placeholder="例: ユーザー一覧取得" autofocus />
        </UFormField>

        <UFormField label="説明" name="description">
          <UTextarea v-model="state.description" placeholder="クエリの説明を入力..." />
        </UFormField>

        <UFormField label="タグ" name="tags" help="カンマ区切りで複数のタグを指定できます">
          <UInput v-model="state.tags" placeholder="users, report, daily" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton color="primary" @click="handleSave">
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
