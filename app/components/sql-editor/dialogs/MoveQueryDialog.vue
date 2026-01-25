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

const options = computed<FolderOption[]>(() => [
  { label: 'ルート', value: '' },
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
    title="クエリの移動"
    :description="queryName ? `「${queryName}」の移動先を選択してください` : '移動先を選択してください'"
  >
    <template #body>
      <UForm @submit="handleSubmit" class="space-y-4">
        <UFormField label="移動先フォルダ" name="folder">
          <USelectMenu
            v-model="selectedPath"
            :items="options"
            value-key="value"
            searchable
            placeholder="移動先を選択"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          移動
        </UButton>
      </div>
    </template>
  </UModal>
</template>
