<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useWindowStore } from '@/stores/window'
import DangerousQueryDialog from './dialog/DangerousQueryDialog.vue'
import { useSafetyStore } from '@/stores/safety'
import { useEnvironment } from '@/composables/useEnvironment'
import { windowApi } from '@/api/window'
import type { Environment } from '@/types'

const emit = defineEmits<{
  (e: 'toggle-left-panel'): void
  (e: 'toggle-right-panel'): void
  (e: 'toggle-result-panel'): void
}>()

const queryBuilderStore = useQueryBuilderStore()
const windowStore = useWindowStore()
const { toggleColorMode, isDark } = useTheme()
const safetyStore = useSafetyStore()
const { getEnvironmentColors } = useEnvironment()
const toast = useToast()

// Tauriから取得した環境（初期化時に設定）
const fetchedEnvironment = ref<Environment | null>(null)

// 現在のアクティブな接続の環境を取得
// 優先順位: fetchedEnvironment > windowStore.currentEnvironment > 'development'
const activeEnvironment = computed<Environment>(() => {
  return fetchedEnvironment.value || windowStore.currentEnvironment || 'development'
})

// 環境に応じたツールバーのスタイル
const toolbarStyle = computed(() => {
  const colors = getEnvironmentColors(activeEnvironment.value)
  return {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  }
})

// 実行可能かどうか
const canExecute = computed(() => queryBuilderStore.canExecuteQuery)

// 実行中かどうか
const isExecuting = computed(() => queryBuilderStore.isExecuting)

// 確認ダイアログの表示状態
const showConfirmDialog = ref(false)

// 現在の環境の安全設定
const safetyConfig = computed(() => {
  return safetyStore.getConfigForEnvironment(activeEnvironment.value)
})

onMounted(async () => {
  safetyStore.loadSettings()

  // Tauriから現在のウィンドウの環境を取得
  try {
    const env = await windowApi.getWindowEnvironment()
    if (env) {
      fetchedEnvironment.value = env as Environment
    }
  } catch (error) {
    // ブラウザモードではエラーになるが、無視
    console.warn('[QueryBuilderToolbar] Failed to get window environment:', error)
  }
})

/**
 * クエリ実行
 */
const executeQuery = () => {
    const analysis = queryBuilderStore.analysisResult
    const config = safetyConfig.value

    // 禁止操作チェック
    if (config.disableDrop && analysis?.queryType === 'drop') {
        toast.add({
            title: '実行エラー',
            description: '現在の環境ではDROPクエリの実行は禁止されています',
            color: 'red',
            icon: 'i-heroicons-exclamation-circle'
        })
        return
    }
    if (config.disableTruncate && analysis?.queryType === 'truncate') {
        toast.add({
            title: '実行エラー',
            description: '現在の環境ではTRUNCATEクエリの実行は禁止されています',
            color: 'red',
            icon: 'i-heroicons-exclamation-circle'
        })
        return
    }

  // 解析結果がない、またはSafeの場合は直接実行
  if (!analysis || analysis.riskLevel === 'safe') {
    queryBuilderStore.executeQuery()
    return
  }
  
  // 確認ダイアログの表示判定
  let shouldConfirm = false
  if (config.confirmationEnabled) {
      if (config.confirmationThreshold === 'warning') {
          // Warning以上で表示
          shouldConfirm = true
      } else if (config.confirmationThreshold === 'danger' && analysis.riskLevel === 'danger') {
          // Dangerのみ表示
          shouldConfirm = true
      }
  }

  if (shouldConfirm) {
      showConfirmDialog.value = true
  } else {
      queryBuilderStore.executeQuery()
  }
}

// ダイアログで確認された場合
const handleConfirm = () => {
  queryBuilderStore.executeQuery()
}

// ダイアログでキャンセルされた場合
const handleCancel = () => {
  // 何もしない（ダイアログは自動で閉じる）
}

/**
 * クエリ保存
 */
const saveQuery = () => {
  // TODO: クエリ保存ダイアログを開く
  console.log('Save query')
}

/**
 * 新規クエリ作成
 */
const createNewQuery = () => {
  queryBuilderStore.resetQuery()
}

/**
 * クエリ履歴を開く
 */
const openHistory = () => {
  // TODO: クエリ履歴パネルを開く
  console.log('Open history')
}
</script>

<template>
  <nav
    class="flex items-center gap-2 px-4 py-2 border-b-2"
    :style="toolbarStyle"
  >
    <!-- 左パネル切り替え -->
    <UButton
      icon="i-heroicons-circle-stack"
      size="sm"
      color="gray"
      variant="ghost"
      title="DB構造パネル"
      @click="emit('toggle-left-panel')"
    />

    <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

    <!-- メインアクション -->
    <UButton
      color="primary"
      size="sm"
      :disabled="!canExecute || isExecuting"
      :loading="isExecuting"
      @click="executeQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-play" />
      </template>
      実行
    </UButton>

    <UButton
      variant="ghost"
      color="gray"
      size="sm"
      @click="saveQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-document-arrow-down" />
      </template>
      保存
    </UButton>

    <UButton
      variant="ghost"
      color="gray"
      size="sm"
      @click="createNewQuery"
    >
      <template #leading>
        <UIcon name="i-heroicons-document-plus" />
      </template>
      新規
    </UButton>

    <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

    <!-- 履歴 -->
    <UButton
      icon="i-heroicons-clock"
      size="sm"
      color="gray"
      variant="ghost"
      title="クエリ履歴"
      @click="openHistory"
    />

    <div class="flex-1" />

    <!-- 表示切り替え -->
    <UButton
      icon="i-heroicons-table-cells"
      size="sm"
      color="gray"
      variant="ghost"
      title="結果パネル"
      @click="emit('toggle-result-panel')"
    />

    <UButton
      icon="i-heroicons-code-bracket"
      size="sm"
      color="gray"
      variant="ghost"
      title="SQLプレビューパネル"
      @click="emit('toggle-right-panel')"
    />

    <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

    <!-- ダークモード切り替え -->
    <UButton
      :icon="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
      size="sm"
      color="gray"
      variant="ghost"
      :title="isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'"
      @click="toggleColorMode"
    />

    <!-- 確認ダイアログ -->
    <DangerousQueryDialog
      v-if="queryBuilderStore.analysisResult"
      v-model:open="showConfirmDialog"
      :analysis-result="queryBuilderStore.analysisResult"
      :sql="queryBuilderStore.generatedSql"
      :countdown-seconds="safetyConfig.countdownSeconds"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </nav>
</template>
