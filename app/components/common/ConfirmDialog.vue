<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()

type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const props = defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  confirmColor?: ButtonColor
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
        <UButton color="neutral" variant="ghost" @click="handleCancel">
          {{ cancelLabel || t('common.cancel') }}
        </UButton>
        <UButton :color="confirmColor || 'error'" @click="handleConfirm">
          {{ confirmLabel || t('common.delete') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
