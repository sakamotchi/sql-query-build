<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import type { Environment } from '~/types'

const sqlEditorStore = useSqlEditorStore()
const windowStore = useWindowStore()
const connectionStore = useConnectionStore()
const { canExecute, isExecuting, sql, isLeftPanelVisible } = storeToRefs(sqlEditorStore)
const { getEnvironmentColors } = useEnvironment()
const { toggleColorMode, isDark } = useTheme()
const { t } = useI18n()
const toast = useToast()

const showUpdateConfirmDialog = ref(false)

// 現在のアクティブな接続の環境を取得
const activeConnection = computed(() => {
  const connectionId = windowStore.currentConnectionId
  if (!connectionId) return null
  return connectionStore.getConnectionById(connectionId) || null
})

// 環境に応じたツールバーのスタイル
const toolbarStyle = computed(() => {
  const env = windowStore.currentEnvironment || 'development'
  const colors = getEnvironmentColors(env as Environment, activeConnection.value?.customColor)
  return {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  }
})

async function handleExecute() {
  await sqlEditorStore.executeQuery()
}

async function handleStop() {
  await sqlEditorStore.cancelQuery()
}

function handleSave() {
  // currentQueryが存在し、SQLが変更されている場合は更新確認ダイアログを表示
  if (sqlEditorStore.currentQuery && sqlEditorStore.isDirty) {
    showUpdateConfirmDialog.value = true
  } else {
    // 新規保存ダイアログを表示
    sqlEditorStore.openSaveDialog()
  }
}

async function handleUpdateConfirm() {
  showUpdateConfirmDialog.value = false
  try {
    await sqlEditorStore.saveActiveTabWithoutDialog()
    toast.add({
      title: 'クエリを更新しました',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: 'クエリの更新に失敗しました',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

function handleSaveAsNew() {
  showUpdateConfirmDialog.value = false
  sqlEditorStore.openSaveDialog()
}

function handleFormat() {
  sqlEditorStore.requestFormat()
}

function handleToggleLeftPanel() {
  sqlEditorStore.toggleLeftPanelVisibility()
}
</script>

<template>
  <div
    class="px-4 py-2 border-b-2"
    :style="toolbarStyle"
  >
    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-play"
        label="実行"
        :disabled="!canExecute"
        color="primary"
        @click="handleExecute"
      />

      <UButton
        icon="i-heroicons-stop"
        label="停止"
        :disabled="!isExecuting"
        color="neutral"
        variant="soft"
        @click="handleStop"
      />

      <UButton
        icon="i-heroicons-sparkles"
        label="整形"
        :disabled="sql.trim().length === 0"
        color="neutral"
        variant="outline"
        @click="handleFormat"
      />

      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <UButton
        :icon="isLeftPanelVisible ? 'i-heroicons-bars-3-bottom-left' : 'i-heroicons-bars-3-bottom-left-20-solid'"
        size="sm"
        color="neutral"
        variant="ghost"
        :title="isLeftPanelVisible ? 'パネルを非表示' : 'パネルを表示'"
        @click="handleToggleLeftPanel"
      />

      <div class="flex-1" />

      <UButton
        icon="i-heroicons-bookmark"
        label="保存"
        color="neutral"
        variant="soft"
        @click="handleSave"
      />

      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <!-- ダークモード切り替え -->
      <UButton
        :icon="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
        size="sm"
        color="neutral"
        variant="ghost"
        :title="isDark ? t('common.theme.light') : t('common.theme.dark')"
        @click="toggleColorMode"
      />
    </div>

    <!-- 更新確認ダイアログ -->
    <UModal
      v-model:open="showUpdateConfirmDialog"
      title="クエリを更新しますか？"
      description="保存済みのクエリを更新するか、新しいクエリとして保存するか選択してください"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <p class="font-medium mb-1">現在のクエリ: {{ sqlEditorStore.currentQuery?.name }}</p>
              <p class="text-gray-600 dark:text-gray-400">このクエリの内容を上書き更新します</p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showUpdateConfirmDialog = false">
            キャンセル
          </UButton>
          <UButton color="neutral" variant="outline" @click="handleSaveAsNew">
            新規保存
          </UButton>
          <UButton color="primary" @click="handleUpdateConfirm">
            更新
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
