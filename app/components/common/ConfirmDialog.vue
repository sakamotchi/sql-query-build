<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  confirmColor?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const handleConfirm = () => {
  emit('confirm')
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="title" :description="description">
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="gray" variant="ghost" @click="handleCancel">
          {{ cancelLabel || 'キャンセル' }}
        </UButton>
        <UButton :color="confirmColor || 'red'" @click="handleConfirm">
          {{ confirmLabel || '削除' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
