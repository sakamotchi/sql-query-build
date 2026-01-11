<script setup lang="ts">
import type { ConnectionTestResult } from '~/types'

defineProps<{
  result: ConnectionTestResult | null
}>()

// defineModelでv-model:openをバインド
const isOpen = defineModel<boolean>('open', { required: true })

const showDetails = ref(false)

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

// モーダルが閉じられたときに詳細表示をリセット
watch(isOpen, (newValue) => {
  if (!newValue) {
    showDetails.value = false
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="result?.success ? '接続テスト成功' : '接続テスト失敗'"
  >
    <template #body>
      <div class="space-y-4">
        <!-- メインメッセージ -->
        <div class="flex items-start gap-3">
          <UIcon
            :name="result?.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
            :class="result?.success ? 'text-green-500' : 'text-red-500'"
            class="w-6 h-6 flex-shrink-0 mt-0.5"
          />
          <p class="text-gray-700 dark:text-gray-300">
            {{ result?.message }}
          </p>
        </div>

        <!-- サーバー情報（成功時） -->
        <div v-if="result?.success && result?.serverInfo" class="space-y-2 pl-9">
          <div class="text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">データベース:</span>
            <span class="ml-2 text-gray-900 dark:text-gray-100">{{ result.serverInfo.databaseName }}</span>
          </div>
          <div class="text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">ユーザー:</span>
            <span class="ml-2 text-gray-900 dark:text-gray-100">{{ result.serverInfo.currentUser }}</span>
          </div>
          <div class="text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">バージョン:</span>
            <span class="ml-2 text-gray-900 dark:text-gray-100">{{ result.serverInfo.version }}</span>
          </div>
          <div v-if="result.serverInfo.encoding" class="text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">エンコーディング:</span>
            <span class="ml-2 text-gray-900 dark:text-gray-100">{{ result.serverInfo.encoding }}</span>
          </div>
          <div v-if="result.duration" class="text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">応答時間:</span>
            <span class="ml-2 text-gray-900 dark:text-gray-100">{{ result.duration }} ms</span>
          </div>
        </div>

        <!-- エラー詳細（失敗時） -->
        <div v-if="!result?.success && result?.errorDetails" class="space-y-2 pl-9">
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            @click="toggleDetails"
          >
            <UIcon
              :name="showDetails ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-4 h-4"
            />
            詳細なエラー情報
          </button>

          <div
            v-if="showDetails"
            class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto"
          >
            <pre class="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{{ result.errorDetails }}</pre>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" @click="isOpen = false">
          閉じる
        </UButton>
      </div>
    </template>
  </UModal>
</template>
