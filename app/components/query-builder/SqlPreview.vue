<script setup lang="ts">
import type { QueryErrorDetails } from '@/types/query-result'

const props = defineProps<{
  sql: string
  errorDetails?: QueryErrorDetails | null
}>()

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
        <span>エラー位置: {{ errorLine }}行目<span v-if="errorColumn">, {{ errorColumn }}列目</span></span>
      </div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center h-full p-4">
      <UIcon name="i-heroicons-code-bracket" class="text-3xl text-gray-400" />
      <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">SQLプレビュー</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">クエリを構築すると表示されます</p>
    </div>
  </div>
</template>

