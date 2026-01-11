<script setup lang="ts">
import { computed } from 'vue'
import type { QueryValidationResult } from '@/types/query-validation'

const { t } = useI18n()

interface Props {
  open: boolean
  validation: QueryValidationResult | null
  queryName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const dialogTitle = computed(() => {
  if (!props.validation) return ''

  switch (props.validation.status) {
    case 'error':
      return t('queryBuilder.queryValidationDialog.title.error')
    case 'warning':
      return t('queryBuilder.queryValidationDialog.title.warning')
    default:
      return t('queryBuilder.queryValidationDialog.title.confirm')
  }
})

const iconClass = computed(() => {
  if (!props.validation) return ''

  switch (props.validation.status) {
    case 'error':
      return 'i-heroicons-x-circle text-red-500'
    case 'warning':
      return 'i-heroicons-exclamation-triangle text-yellow-500'
    default:
      return 'i-heroicons-information-circle text-blue-500'
  }
})

const canProceed = computed(() => {
  return props.validation?.status !== 'error'
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
  <UModal v-model:open="isOpen">
    <UCard>
      <template v-if="validation" #header>
        <div class="flex items-center gap-3">
          <UIcon v-if="iconClass" :name="iconClass" class="w-6 h-6" />
          <h3 class="text-lg font-semibold">
            {{ dialogTitle }}
          </h3>
        </div>
      </template>

      <div v-if="validation" class="space-y-4">
        <!-- エラーメッセージ -->
        <div v-if="validation.message" class="text-sm text-gray-700 dark:text-gray-300">
          {{ validation.message }}
        </div>

        <!-- 接続情報 -->
        <div v-if="!validation.connectionMatches" class="space-y-2">
          <div class="text-sm">
            <span class="font-medium">{{ t('queryBuilder.queryValidationDialog.connectionQuery') }}</span>
            <span class="ml-2 text-gray-600 dark:text-gray-400">{{ validation.originalConnectionId }}</span>
          </div>
          <div class="text-sm">
            <span class="font-medium">{{ t('queryBuilder.queryValidationDialog.connectionCurrent') }}</span>
            <span class="ml-2 text-gray-600 dark:text-gray-400">{{ validation.currentConnectionId }}</span>
          </div>
        </div>

        <!-- 見つからないテーブル一覧 -->
        <div v-if="validation.missingTables.length > 0" class="space-y-2">
          <div class="text-sm font-medium">
            {{ t('queryBuilder.queryValidationDialog.missingTables') }}
          </div>
          <ul class="space-y-1 ml-4">
            <li
              v-for="table in validation.missingTables"
              :key="`${table.schema}.${table.table}`"
              class="text-sm text-red-600 dark:text-red-400"
            >
              {{ table.schema }}.{{ table.table }}
            </li>
          </ul>
        </div>

        <!-- 警告: それでも開く場合の注意 -->
        <div v-if="validation.status === 'warning'" class="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded">
          {{ t('queryBuilder.queryValidationDialog.warningMessage') }}
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          >
            {{ validation?.status === 'error' ? t('queryBuilder.queryValidationDialog.actions.close') : t('common.actions.cancel') }}
          </UButton>
          <UButton
            v-if="canProceed"
            color="primary"
            @click="handleConfirm"
          >
            {{ t('queryBuilder.queryValidationDialog.actions.open') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
