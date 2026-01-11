<script setup lang="ts">
import { ref, computed } from 'vue'
import { save } from '@tauri-apps/plugin-dialog'
import { exportQueryResult } from '@/api/export'
import type { QueryExecuteResult } from '@/types/query-result'
import type { ExportFormatType } from '@/types/export'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  queryResult: QueryExecuteResult | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const format = ref<ExportFormatType>('csv')
const isExporting = ref(false)

const formatOptions = [
  { label: 'CSV (.csv)', value: 'csv' },
  { label: 'Excel (.xlsx)', value: 'excel' },
  { label: 'JSON (.json)', value: 'json' }
]

const toast = useToast()

const handleExport = async () => {
  if (!props.queryResult) return
  
  isExporting.value = true
  try {
    const extension = format.value === 'excel' ? 'xlsx' : format.value
    // Default file name with timestamp
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const suggestedName = `query_result_${dateStr}.${extension}`

    const path = await save({
      defaultPath: suggestedName,
      filters: [{
        name: format.value.toUpperCase(),
        extensions: [extension]
      }]
    })

    if (!path) {
      return // Canceled
    }

    const result = await exportQueryResult(props.queryResult, {
      path,
      format: format.value
    })

    if (result.success) {
      toast.add({
        title: t('queryBuilder.exportDialog.toast.successTitle'),
        description: t('queryBuilder.exportDialog.toast.successDesc', { count: result.rowsAffected }),
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      isOpen.value = false
    } else {
      throw new Error(result.message || 'Unknown error')
    }
  } catch (e: any) {
    toast.add({
      title: t('queryBuilder.exportDialog.toast.errorTitle'),
      description: e.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('queryBuilder.exportDialog.title')" :description="t('queryBuilder.exportDialog.description')">
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('queryBuilder.exportDialog.format')">
          <USelect v-model="format" :items="formatOptions" />
        </UFormField>
        
        <div class="text-sm text-gray-500">
          {{ t('queryBuilder.exportDialog.rowCount', { count: queryResult?.rowCount ?? 0 }) }}
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false" :disabled="isExporting">
          {{ t('common.actions.cancel') }}
        </UButton>
        <UButton color="primary" @click="handleExport" :loading="isExporting">
          {{ t('common.actions.export') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
