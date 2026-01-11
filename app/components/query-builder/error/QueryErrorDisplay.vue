<script setup lang="ts">
import type { QueryExecuteError } from '@/types/query-result'
import { getErrorMessage, getErrorHint, getErrorIcon } from '@/utils/error-messages'
import ErrorHint from './ErrorHint.vue'

const props = defineProps<{
  error: QueryExecuteError
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const errorMessage = computed(() => getErrorMessage(props.error))
const errorHint = computed(() => getErrorHint(props.error))
const errorIcon = computed(() => getErrorIcon(props.error.code))

const showDetails = ref(false)
</script>

<template>
  <div
    class="flex flex-col p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
    role="alert"
    aria-live="assertive"
  >
    <!-- メインエラー表示 -->
    <div class="flex items-start gap-3">
      <UIcon
        :name="errorIcon"
        class="text-2xl text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
          {{ errorMessage.title }}
        </h3>
        <p class="mt-1 text-sm text-red-700 dark:text-red-300">
          {{ errorMessage.description }}
        </p>

        <!-- オブジェクト名表示 -->
        <p
          v-if="error.details?.objectName"
          class="mt-1 text-sm text-red-600 dark:text-red-400"
        >
          対象: <code class="px-1 py-0.5 bg-red-100 dark:bg-red-900/50 rounded">{{ error.details.objectName }}</code>
        </p>

        <!-- エラー位置表示 -->
        <p
          v-if="error.details?.line || error.details?.position"
          class="mt-1 text-xs text-red-500 dark:text-red-500"
        >
          <template v-if="error.details?.line">
            行: {{ error.details.line }}
            <template v-if="error.details?.column">, 列: {{ error.details.column }}</template>
          </template>
          <template v-else-if="error.details?.position">
            文字位置: {{ error.details.position }}
          </template>
        </p>
      </div>
    </div>

    <!-- ヒント表示 -->
    <ErrorHint v-if="errorHint" :hint="errorHint" class="mt-3" />

    <!-- 詳細展開 -->
    <div v-if="error.message || error.nativeCode" class="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
        @click="showDetails = !showDetails"
      >
        <UIcon :name="showDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" />
        技術的な詳細
      </button>

      <div v-if="showDetails" class="mt-2">
        <pre class="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">{{ error.message }}</pre>
        <p v-if="error.nativeCode" class="mt-1 text-xs text-red-500">
          エラーコード: {{ error.nativeCode }}
        </p>
      </div>
    </div>

    <!-- リトライボタン -->
    <div class="mt-4 flex gap-2">
      <UButton
        size="sm"
        color="error"
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="emit('retry')"
      >
        再実行
      </UButton>
    </div>
  </div>
</template>
