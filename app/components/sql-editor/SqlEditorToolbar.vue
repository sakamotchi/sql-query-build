<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import type { Environment } from '~/types'

const sqlEditorStore = useSqlEditorStore()
const windowStore = useWindowStore()
const connectionStore = useConnectionStore()
const { canExecute, isExecuting, sql } = storeToRefs(sqlEditorStore)
const { getEnvironmentColors } = useEnvironment()

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
  sqlEditorStore.openSaveDialog()
}

function handleFormat() {
  sqlEditorStore.requestFormat()
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

      <div class="flex-1" />

      <UButton
        icon="i-heroicons-bookmark"
        label="保存"
        color="neutral"
        variant="soft"
        @click="handleSave"
      />
    </div>
  </div>
</template>
