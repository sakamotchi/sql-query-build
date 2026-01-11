<script setup lang="ts">
import { ref, computed } from 'vue'
import { save } from '@tauri-apps/plugin-dialog'
import { exportQueryResult } from '@/api/export'
import type { QueryExecuteResult } from '@/types/query-result'
import type { ExportFormatType } from '@/types/export'

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
        title: 'エクスポート成功',
        description: `${result.rowsAffected}件のデータをエクスポートしました`,
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      isOpen.value = false
    } else {
      throw new Error(result.message || 'Unknown error')
    }
  } catch (e: any) {
    toast.add({
      title: 'エクスポート失敗',
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
  <UModal v-model:open="isOpen" title="データエクスポート" description="クエリ実行結果をファイルに出力します。">
    <template #body>
      <div class="space-y-4">
        <UFormField label="ファイル形式">
          <USelect v-model="format" :items="formatOptions" />
        </UFormField>
        
        <div class="text-sm text-gray-500">
          対象件数: {{ queryResult?.rowCount ?? 0 }} 件
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false" :disabled="isExporting">
          キャンセル
        </UButton>
        <UButton color="primary" @click="handleExport" :loading="isExporting">
          エクスポート
        </UButton>
      </div>
    </template>
  </UModal>
</template>
