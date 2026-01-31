<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import ResultTable from '~/components/query-builder/result/ResultTable.vue'
import ExportDialog from '~/components/query-builder/dialog/ExportDialog.vue'
import { getErrorHint, getErrorIcon, getErrorMessage } from '~/utils/error-messages'

const sqlEditorStore = useSqlEditorStore()
const { result, error, isExecuting, activeTabId, executingTabId } = storeToRefs(sqlEditorStore)
const { t } = useI18n()

const hasResult = computed(() => result.value !== null)
const isSelectResult = computed(() => (result.value?.columns.length ?? 0) > 0)
const isActiveExecuting = computed(() => isExecuting.value && activeTabId.value === executingTabId.value)
const isExportDialogOpen = ref(false)

const executionInfo = computed(() => {
  if (!result.value) return null
  return {
    seconds: (result.value.executionTimeMs / 1000).toFixed(3),
    rowCount: result.value.rowCount,
  }
})

const errorMessage = computed(() => (error.value ? getErrorMessage(error.value) : null))
const errorHint = computed(() => (error.value ? getErrorHint(error.value) : null))
const errorIcon = computed(() => (error.value ? getErrorIcon(error.value.code) : undefined))
const errorTitle = computed(() => {
  if (!error.value) return ''
  if (error.value.code === 'unknown' && error.value.message) {
    return error.value.message
  }
  return errorMessage.value?.title ?? t('common.error')
})

const errorDescription = computed(() => {
  if (!error.value) return ''
  return errorMessage.value?.description ?? ''
})

const errorLineInfo = computed(() => {
  if (!error.value?.details?.line && !error.value?.details?.column) return null
  return {
    line: error.value.details?.line,
    column: error.value.details?.column,
  }
})

const errorPositionText = computed(() => {
  if (!errorLineInfo.value) return ''
  if (errorLineInfo.value.line && errorLineInfo.value.column) {
    return t('sqlEditor.resultPanel.errorPosition', {
      line: errorLineInfo.value.line,
      column: errorLineInfo.value.column,
    })
  }
  if (errorLineInfo.value.line) {
    return t('sqlEditor.resultPanel.errorPositionLine', { line: errorLineInfo.value.line })
  }
  return t('sqlEditor.resultPanel.errorPosition', {
    line: '-',
    column: errorLineInfo.value.column,
  })
})

const openExportDialog = () => {
  if (!hasResult.value) return
  isExportDialogOpen.value = true
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon
          :name="isActiveExecuting ? 'i-heroicons-arrow-path' : 'i-heroicons-table-cells'"
          class="text-lg"
          :class="{ 'animate-spin text-gray-400': isActiveExecuting }"
        />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ $t('sqlEditor.resultPanel.title') }}</span>
        <template v-if="executionInfo && !error">
          <span class="text-xs text-gray-500">
            {{ $t('sqlEditor.resultPanel.executionTime', { seconds: executionInfo.seconds }) }}
          </span>
          <span class="text-xs text-gray-400">
            <template v-if="isSelectResult">
              {{ $t('sqlEditor.resultPanel.rowCount.select', { count: executionInfo.rowCount }) }}
            </template>
            <template v-else>
              {{ $t('sqlEditor.resultPanel.rowCount.mutation', { count: executionInfo.rowCount }) }}
            </template>
          </span>
        </template>
      </div>

      <UButton
        icon="i-heroicons-arrow-down-tray"
        :label="$t('sqlEditor.resultPanel.export')"
        size="sm"
        variant="outline"
        :disabled="!hasResult"
        data-testid="export-button"
        @click="openExportDialog"
      />
    </div>

    <div class="flex-1 overflow-hidden flex flex-col">
      <div v-if="isActiveExecuting" class="flex-1 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        <span class="ml-2 text-gray-500">{{ $t('sqlEditor.resultPanel.executing') }}</span>
      </div>

      <div v-else-if="error" class="flex-1 overflow-auto p-4">
        <UAlert
          color="error"
          variant="soft"
          :icon="errorIcon"
          :title="errorTitle"
        >
          <div class="space-y-1 text-sm text-red-700 dark:text-red-300">
            <p v-if="errorDescription">{{ errorDescription }}</p>
            <p v-if="errorLineInfo">{{ errorPositionText }}</p>
            <div v-if="errorHint" class="pt-2">
              <p class="font-medium">{{ errorHint.title }}</p>
              <p>{{ errorHint.suggestion }}</p>
              <ul v-if="errorHint.examples?.length" class="list-disc list-inside">
                <li v-for="example in errorHint.examples" :key="example">{{ example }}</li>
              </ul>
            </div>
          </div>
        </UAlert>
      </div>

      <div v-else-if="!hasResult" class="flex-1 flex flex-col items-center justify-center">
        <UIcon name="i-heroicons-table-cells" class="text-4xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">{{ $t('sqlEditor.resultPanel.executePrompt') }}</p>
      </div>

      <template v-else>
        <div
          v-if="isSelectResult"
          class="flex-1 overflow-auto"
          data-test="result-table"
        >
          <ResultTable
            :columns="result!.columns"
            :rows="result!.rows"
          />
        </div>
        <div
          v-else
          class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400"
        >
          {{ $t('sqlEditor.resultPanel.rowCount.mutation', { count: executionInfo?.rowCount ?? 0 }) }}
        </div>
      </template>
    </div>

    <ExportDialog
      v-model:open="isExportDialogOpen"
      :query-result="result"
    />
  </div>
</template>
