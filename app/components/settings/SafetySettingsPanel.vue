<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSafetyStore } from '@/stores/safety'
import type { Environment } from '@/types'

const safetyStore = useSafetyStore()
const { settings, loading, error } = storeToRefs(safetyStore)

const environments: { key: Environment; label: string; description: string }[] = [
  { key: 'development', label: '開発環境', description: 'ローカル開発用' },
  { key: 'test', label: 'テスト環境', description: '自動テスト・検証用' },
  { key: 'staging', label: 'ステージング環境', description: '本番前の最終確認用' },
  { key: 'production', label: '本番環境', description: '実運用環境' },
]

const resetConfirmOpen = ref(false)

onMounted(() => {
  safetyStore.loadSettings()
})

const handleReset = async () => {
  await safetyStore.resetToDefault()
  resetConfirmOpen.value = false
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">環境別安全設定</h3>
          <p class="text-sm text-neutral-500 mt-1">
            接続先の環境ごとに、クエリ実行時の安全確認を設定します
          </p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="resetConfirmOpen = true"
        >
          デフォルトに戻す
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert v-if="error" color="red" variant="soft" icon="i-heroicons-exclamation-circle">
        {{ error }}
      </UAlert>

      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EnvironmentSafetyCard
          v-for="env in environments"
          :key="env.key"
          :environment="env.key"
          :label="env.label"
          :description="env.description"
          :config="settings.environments[env.key]"
        />
      </div>
    </div>

    <!-- リセット確認モーダル -->
    <UModal v-model:open="resetConfirmOpen" title="設定をリセット">
      <template #body>
        <div class="p-4">
            <p>すべての環境の安全設定をデフォルトに戻しますか？</p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end p-4">
          <UButton color="neutral" variant="outline" @click="resetConfirmOpen = false">
            キャンセル
          </UButton>
          <UButton color="red" @click="handleReset">
            リセット
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
