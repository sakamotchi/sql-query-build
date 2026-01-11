<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import type { MutationType } from '@/types/mutation-query'
import { useWindowStore } from '@/stores/window'
import { useSafetyStore } from '@/stores/safety'
import { useEnvironment } from '@/composables/useEnvironment'
import { windowApi } from '@/api/window'
import type { Environment } from '@/types'
import DangerousQueryDialog from '@/components/query-builder/dialog/DangerousQueryDialog.vue'
import SaveQueryDialog from '@/components/query-builder/dialog/SaveQueryDialog.vue'
import SavedQuerySlideover from '@/components/query-builder/SavedQuerySlideover.vue'
import QueryHistorySlideover from '@/components/query-builder/QueryHistorySlideover.vue'
import { useConnectionStore } from '@/stores/connection'

const store = useMutationBuilderStore()
const windowStore = useWindowStore()
const safetyStore = useSafetyStore()
const connectionStore = useConnectionStore()
const { getEnvironmentColors } = useEnvironment()
const toast = useToast()

// Tauriから取得した環境（初期化時に設定）
const fetchedEnvironment = ref<Environment | null>(null)

// 現在のアクティブな接続の環境を取得
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

const mutationType = computed(() => store.mutationType)
const canExecute = computed(() => store.canExecuteQuery)
const isExecuting = computed(() => store.isExecuting)

const showConfirmDialog = ref(false)
const showSaveDialog = ref(false)
const showSavedQueriesSlideover = ref(false)
const showHistorySlideover = ref(false)

const safetyConfig = computed(() => {
  return safetyStore.getConfigForEnvironment(activeEnvironment.value)
})

const connectionId = computed(() => {
  return connectionStore.activeConnection?.id || windowStore.currentConnectionId
})

const queryState = computed(() => store.getSerializableState())

onMounted(async () => {
  safetyStore.loadSettings()

  try {
    const env = await windowApi.getWindowEnvironment()
    if (env) {
      fetchedEnvironment.value = env as Environment
    }
  } catch (error) {
    console.warn('[MutationBuilderToolbar] Failed to get window environment:', error)
  }
})

const handleMutationTypeChange = (type: MutationType) => {
  store.setMutationType(type)
}

const executeMutation = () => {
  const analysis = store.analysisResult
  const config = safetyConfig.value

  if (analysis?.queryType === 'drop' && config.disableDrop) {
    toast.add({
      title: '実行エラー',
      description: '現在の環境ではDROPクエリの実行は禁止されています',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (analysis?.queryType === 'truncate' && config.disableTruncate) {
    toast.add({
      title: '実行エラー',
      description: '現在の環境ではTRUNCATEクエリの実行は禁止されています',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!analysis || analysis.riskLevel === 'safe') {
    store.executeMutation()
    return
  }

  let shouldConfirm = false
  if (config.confirmationEnabled) {
    if (config.confirmationThreshold === 'warning') {
      shouldConfirm = true
    } else if (config.confirmationThreshold === 'danger' && analysis.riskLevel === 'danger') {
      shouldConfirm = true
    }
  }

  if (shouldConfirm) {
    showConfirmDialog.value = true
  } else {
    store.executeMutation()
  }
}

const handleConfirm = () => {
  store.executeMutation()
}

const handleCancel = () => {
  // no-op
}

const handleSave = () => {
  showSaveDialog.value = true
}

const handleHistory = () => {
  showHistorySlideover.value = true
}

const handleOpenSaved = () => {
  showSavedQueriesSlideover.value = true
}
</script>

<template>
  <div>
    <div
      class="flex items-center justify-between px-4 py-2 border-b-2"
      :style="toolbarStyle"
    >
      <div class="flex items-center gap-3">
        <UFieldGroup>
          <UButton
            :color="mutationType === 'INSERT' ? 'primary' : 'neutral'"
            :variant="mutationType === 'INSERT' ? 'solid' : 'ghost'"
            @click="handleMutationTypeChange('INSERT')"
          >
            INSERT
          </UButton>
          <UButton
            :color="mutationType === 'UPDATE' ? 'primary' : 'neutral'"
            :variant="mutationType === 'UPDATE' ? 'solid' : 'ghost'"
            @click="handleMutationTypeChange('UPDATE')"
          >
            UPDATE
          </UButton>
          <UButton
            :color="mutationType === 'DELETE' ? 'primary' : 'neutral'"
            :variant="mutationType === 'DELETE' ? 'solid' : 'ghost'"
            @click="handleMutationTypeChange('DELETE')"
          >
            DELETE
          </UButton>
        </UFieldGroup>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-play"
          color="primary"
          :disabled="!canExecute || isExecuting"
          :loading="isExecuting"
          @click="executeMutation"
        >
          実行
        </UButton>
        <UButton
          icon="i-heroicons-bookmark"
          color="neutral"
          variant="ghost"
          @click="handleSave"
        >
          保存
        </UButton>
        <UButton
          icon="i-heroicons-folder-open"
          color="neutral"
          variant="ghost"
          @click="handleOpenSaved"
        >
          開く
        </UButton>
        <UButton
          icon="i-heroicons-clock"
          color="neutral"
          variant="ghost"
          @click="handleHistory"
        >
          履歴
        </UButton>
        <USeparator orientation="vertical" class="h-6" />
        <UButton
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="ghost"
          to="/query-builder"
        >
          データ参照へ
        </UButton>
      </div>
    </div>

    <DangerousQueryDialog
      v-if="store.analysisResult"
      v-model:open="showConfirmDialog"
      :analysis-result="store.analysisResult"
      :sql="store.generatedSql"
      :countdown-seconds="safetyConfig.countdownSeconds"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />

    <SaveQueryDialog
      v-model:open="showSaveDialog"
      :query="queryState"
      :connection-id="connectionId"
    />

    <SavedQuerySlideover
      v-model:open="showSavedQueriesSlideover"
    />

    <QueryHistorySlideover
      v-model:open="showHistorySlideover"
    />
  </div>
</template>
