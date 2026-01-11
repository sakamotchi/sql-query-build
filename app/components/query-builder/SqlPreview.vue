<script setup lang="ts">
import type { QueryErrorDetails } from '@/types/query-result'
import type { QueryAnalysisResult } from '@/types/query-analysis'

const props = defineProps<{
  sql: string
  errorDetails?: QueryErrorDetails | null
  analysisResult?: QueryAnalysisResult | null
}>()

const { t } = useI18n()

// SQLを行に分割
const sqlLines = computed(() => props.sql.split('\n'))

// エラー行を取得（位置から計算）
const errorLine = computed(() => {
  if (!props.errorDetails) return null

  // 行番号が直接指定されている場合
  if (props.errorDetails.line) {
    return props.errorDetails.line
  }

  // 文字位置から行番号を計算
  if (props.errorDetails.position) {
    let charCount = 0
    for (let i = 0; i < sqlLines.value.length; i++) {
      const line = sqlLines.value[i]
      if (line === undefined) continue
      // +1 for newline character
      charCount += line.length + 1
      if (charCount >= props.errorDetails.position) {
        return i + 1
      }
    }
  }

  return null
})

// エラー列を取得
const errorColumn = computed(() => {
  if (!props.errorDetails || !errorLine.value) return null

  if (props.errorDetails.column) {
    return props.errorDetails.column
  }

  if (props.errorDetails.position) {
    // 文字位置から列番号を計算
    let charCount = 0
    for (let i = 0; i < errorLine.value - 1; i++) {
      const line = sqlLines.value[i]
      if (line === undefined) continue
      charCount += line.length + 1
    }
    return props.errorDetails.position - charCount
  }

  return null
})
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 flex flex-col">
    <div v-if="sql" class="p-3 font-mono text-sm overflow-x-auto min-h-0">
      <div
        v-for="(line, index) in sqlLines"
        :key="index"
        class="flex"
        :class="{
          'bg-red-100 dark:bg-red-900/30 -mx-3 px-3': errorLine === index + 1,
        }"
      >
        <!-- 行番号 -->
        <span
          class="w-8 text-right pr-3 text-gray-400 dark:text-gray-600 select-none flex-shrink-0 border-r border-gray-200 dark:border-gray-800 mr-3"
          :class="{
            'text-red-500 dark:text-red-400 border-red-200 dark:border-red-800': errorLine === index + 1,
            'border-r-0': !sql
          }"
        >
          {{ index + 1 }}
        </span>
        <!-- SQL行 -->
        <span class="flex-1 whitespace-pre text-gray-800 dark:text-gray-200">
          <template v-if="errorLine === index + 1 && errorColumn">
            <!-- エラー位置前 -->
            <span>{{ line.substring(0, errorColumn - 1) }}</span>
            <!-- エラー位置（波線下線） -->
            <span
              class="underline decoration-wavy decoration-red-500 bg-red-200 dark:bg-red-800/50"
              :title="errorDetails?.sqlSnippet"
            >{{ line.substring(errorColumn - 1) || ' ' }}</span>
          </template>
          <template v-else>
            {{ line || ' ' }}
          </template>
        </span>
      </div>

      <!-- エラーインジケーター -->
      <div
        v-if="errorLine"
        class="flex items-center gap-1 mt-4 pt-2 border-t border-red-200 dark:border-red-900 text-xs text-red-500"
      >
        <UIcon name="i-heroicons-exclamation-triangle" />
        <span>{{ t('queryBuilder.sqlPreview.errorPosition', { line: errorLine }) }}<span v-if="errorColumn">{{ t('queryBuilder.sqlPreview.errorColumn', { col: errorColumn }) }}</span></span>
      </div>
    </div>

    <!-- リスク警告 -->
    <div
      v-if="analysisResult && analysisResult.riskLevel !== 'safe'"
      class="border-t border-gray-200 dark:border-gray-800"
    >
      <div
        class="p-2 text-xs"
        :class="{
          'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400': analysisResult.riskLevel === 'warning',
          'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400': analysisResult.riskLevel === 'danger'
        }"
      >
        <div class="flex items-center gap-2 font-bold mb-1">
          <UIcon
            :name="analysisResult.riskLevel === 'danger' ? 'i-heroicons-shield-exclamation' : 'i-heroicons-exclamation-triangle'"
            class="text-lg"
          />
          <span>{{ analysisResult.riskLevel === 'danger' ? t('queryBuilder.sqlPreview.risk.danger') : t('queryBuilder.sqlPreview.risk.warning') }}</span>
        </div>
        <ul class="list-disc list-inside px-1 space-y-0.5 ml-5">
          <li v-for="factor in analysisResult.riskFactors" :key="factor.code">
            {{ factor.message }}
          </li>
        </ul>
      </div>
    </div>
    
    <div v-else-if="!sql" class="flex flex-col items-center justify-center h-full p-4">
      <UIcon name="i-heroicons-code-bracket" class="text-3xl text-gray-400" />
      <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">{{ t('queryBuilder.sqlPreview.placeholderTitle') }}</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('queryBuilder.sqlPreview.placeholderDesc') }}</p>
    </div>
  </div>
</template>

