<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import { useDatabaseStructureStore } from '~/stores/database-structure'
import type { Environment } from '~/types'

const sqlEditorStore = useSqlEditorStore()
const windowStore = useWindowStore()
const connectionStore = useConnectionStore()
const databaseStructureStore = useDatabaseStructureStore()
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

// 接続タイプを取得
const connectionType = computed(() => {
  return activeConnection.value?.type || null
})

// MySQLのデフォルトデータベース名を取得
const defaultDatabase = computed(() => {
  if (connectionType.value === 'mysql') {
    return activeConnection.value?.database || null
  }
  return null
})

// 利用可能なデータベース/スキーマ一覧を取得
const availableDatabases = computed(() => {
  const connectionId = sqlEditorStore.connectionId
  if (!connectionId) return []

  const structure = databaseStructureStore.structures[connectionId]
  if (!structure) return []

  return structure.schemas
    .filter(schema => !schema.isSystem)
    .map(schema => ({
      label: schema.name,
      value: schema.name,
    }))
})

// 選択中のデータベース（v-model用）
const currentDatabase = computed({
  get: () => sqlEditorStore.selectedDatabase ?? undefined,
  set: (value) => {
    sqlEditorStore.setSelectedDatabase(value ?? null)
  },
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
      title: t('sqlEditor.toolbar.updateDialog.toasts.updateSuccess'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } catch (error) {
    toast.add({
      title: t('sqlEditor.toolbar.updateDialog.toasts.updateFailed'),
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
        :label="$t('sqlEditor.toolbar.execute')"
        :disabled="!canExecute"
        color="primary"
        @click="handleExecute"
      />

      <UButton
        icon="i-heroicons-stop"
        :label="$t('sqlEditor.toolbar.stop')"
        :disabled="!isExecuting"
        color="neutral"
        variant="soft"
        @click="handleStop"
      />

      <UButton
        icon="i-heroicons-sparkles"
        :label="$t('sqlEditor.toolbar.format')"
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
        :title="isLeftPanelVisible ? $t('sqlEditor.toolbar.togglePanel.hide') : $t('sqlEditor.toolbar.togglePanel.show')"
        @click="handleToggleLeftPanel"
      />

      <!-- MySQL: 読み取り専用表示 -->
      <div
        v-if="connectionType === 'mysql' && defaultDatabase"
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
        :title="$t('sqlEditor.toolbar.database.mysqlReadonlyTooltip')"
      >
        <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-gray-500" />
        <span class="text-gray-700 dark:text-gray-300">{{ defaultDatabase }}</span>
        <UIcon name="i-heroicons-lock-closed" class="w-3 h-3 text-gray-400" />
      </div>

      <!-- PostgreSQL: スキーマ選択可能 -->
      <USelectMenu
        v-else-if="connectionType === 'postgresql' && availableDatabases.length > 0"
        v-model="currentDatabase"
        :items="availableDatabases"
        value-key="value"
        :placeholder="$t('sqlEditor.toolbar.database.placeholder')"
        class="w-40"
        size="sm"
        searchable
        clearable
      />

      <!-- SQLite: 非表示（何も表示しない） -->

      <div class="flex-1" />

      <UButton
        icon="i-heroicons-bookmark"
        :label="$t('sqlEditor.toolbar.save')"
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
      :title="$t('sqlEditor.toolbar.updateDialog.title')"
      :description="$t('sqlEditor.toolbar.updateDialog.description')"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <p class="font-medium mb-1">
                {{ $t('sqlEditor.toolbar.updateDialog.currentQuery', { name: sqlEditorStore.currentQuery?.name || '' }) }}
              </p>
              <p class="text-gray-600 dark:text-gray-400">{{ $t('sqlEditor.toolbar.updateDialog.currentQueryDesc') }}</p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showUpdateConfirmDialog = false">
            {{ $t('sqlEditor.toolbar.updateDialog.actions.cancel') }}
          </UButton>
          <UButton color="neutral" variant="outline" @click="handleSaveAsNew">
            {{ $t('sqlEditor.toolbar.updateDialog.actions.saveAsNew') }}
          </UButton>
          <UButton color="primary" @click="handleUpdateConfirm">
            {{ $t('sqlEditor.toolbar.updateDialog.actions.update') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
