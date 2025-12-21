<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import { useProviderChangeDialog } from '~/composables/useProviderChangeDialog'
import FromSimpleDialog from '~/components/security/provider-change/FromSimpleDialog.vue'
import FromMasterPasswordDialog from '~/components/security/provider-change/FromMasterPasswordDialog.vue'
import type { SecurityLevel, SecurityProvider } from '~/types'

const securityStore = useSecurityStore()
const { settings, loading, error } = storeToRefs(securityStore)
const {
  isFromSimpleDialogOpen,
  isFromMasterPasswordDialogOpen,
  openChangeDialog
} = useProviderChangeDialog()

// デバッグ: 設定が変更されたらログ出力（immediate は外す）
watch(() => settings.value.provider, (newProvider, oldProvider) => {
  console.log('[SecuritySettings] Provider changed:', { from: oldProvider, to: newProvider })
})

const showMasterPasswordDialog = ref(false)
const masterPasswordMode = ref<'setup' | 'change'>('setup')
const showComparison = ref(false)
const showLevelDetails = ref(false)
const providerOptions: { label: string; value: SecurityProvider; description: string; recommended?: boolean }[] = [
  {
    label: 'Simple (推奨)',
    value: 'simple',
    description: '固定キーで暗号化。パスワード入力不要。',
    recommended: true
  },
  {
    label: 'マスターパスワード',
    value: 'master-password',
    description: 'ユーザー設定のパスワードで暗号化'
  }
]

const levelOptions: { label: string; value: SecurityLevel; hint: string }[] = [
  { label: '低', value: 'low', hint: '基本的な暗号化' },
  { label: '中', value: 'medium', hint: '推奨設定' },
  { label: '高', value: 'high', hint: '最も厳格な設定' }
]

const saving = ref(false)
const message = ref<string | null>(null)

const updateProvider = (provider: SecurityProvider) => {
  console.log('[SecuritySettings] updateProvider called', {
    selectedProvider: provider,
    currentProvider: settings.value.provider,
    willSkip: provider === settings.value.provider
  })
  message.value = null
  if (provider === settings.value.provider) {
    console.log('[SecuritySettings] Skipping - same provider selected')
    return
  }

  console.log('[SecuritySettings] Opening change dialog for:', provider)
  openChangeDialog(provider)
}

const updateLevel = async (level: SecurityLevel) => {
  saving.value = true
  message.value = null
  try {
    await securityStore.setLevel(level)
    message.value = 'セキュリティレベルを更新しました'
  } catch (e) {
    message.value = 'セキュリティレベルの更新に失敗しました'
  } finally {
    saving.value = false
  }
}

const openMasterPasswordDialog = () => {
  masterPasswordMode.value = settings.value.masterPasswordSet ? 'change' : 'setup'
  showMasterPasswordDialog.value = true
}

const resetSecurity = async () => {
  if (!confirm('セキュリティ設定をリセットしますか？\n\n警告: この操作により、すべての接続情報が失われます。')) {
    return
  }

  saving.value = true
  message.value = null
  try {
    await securityStore.resetSecurityConfig()
    message.value = 'セキュリティ設定をリセットしました'
  } catch (e) {
    message.value = 'リセットに失敗しました'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xl font-semibold">セキュリティプロバイダー</h3>
          <div class="flex items-center gap-2">
            <UBadge v-if="saving || loading" color="primary" variant="soft">処理中</UBadge>
            <UButton
              variant="ghost"
              color="red"
              size="sm"
              @click="resetSecurity"
              :disabled="saving || loading"
            >
              リセット
            </UButton>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField label="プロバイダー" hint="保存先と復号方式を選択します">
          <USelect
            :model-value="settings.provider"
            :items="providerOptions"
            :disabled="saving || loading"
            @update:model-value="updateProvider"
          >
            <template #item="{ item }">
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ item.label }}</span>
                  <UBadge v-if="item.recommended" color="primary" variant="soft" size="xs">推奨</UBadge>
                </div>
                <span class="text-xs text-gray-500">{{ item.description }}</span>
              </div>
            </template>
          </USelect>
        </UFormField>

        <UFormField label="セキュリティレベル" hint="暗号化強度を選択します">
          <URadioGroup
            :model-value="settings.level"
            :options="levelOptions"
            value-attribute="value"
            :disabled="saving || loading"
            @update:model-value="updateLevel"
          >
            <template #label="{ option }">
              <div class="flex items-center justify-between w-full">
                <span>{{ option.label }}</span>
                <span class="text-xs text-gray-500">{{ option.hint }}</span>
              </div>
            </template>
          </URadioGroup>
        </UFormField>

        <UAlert
          v-if="error || message"
          :color="error ? 'red' : 'green'"
          variant="soft"
          :title="error ? '設定の読み込み/保存でエラーが発生しました' : '完了'"
        >
          {{ error || message }}
        </UAlert>
      </div>
    </UCard>

    <UCard v-if="settings.provider === 'master-password'">
      <template #header>
        <h3 class="text-xl font-semibold">マスターパスワード</h3>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              接続情報を暗号化するパスワードを管理します
            </p>
            <p class="text-xs text-gray-500">
              状態: {{ settings.masterPasswordSet ? '設定済み' : '未設定' }}
            </p>
          </div>
          <UButton
            :variant="settings.masterPasswordSet ? 'outline' : 'solid'"
            :color="settings.masterPasswordSet ? 'gray' : 'primary'"
            :disabled="loading"
            @click="openMasterPasswordDialog"
          >
            {{ settings.masterPasswordSet ? 'パスワード変更' : '初期設定' }}
          </UButton>
        </div>

        <UAlert
          v-if="!settings.masterPasswordSet"
          color="amber"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
        >
          マスターパスワードが未設定です。プロバイダー切り替え時に設定されます。
        </UAlert>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <button
          type="button"
          class="w-full flex items-center justify-between"
          @click="showComparison = !showComparison"
        >
          <h3 class="text-xl font-semibold">プロバイダー比較</h3>
          <UIcon
            :name="showComparison ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-5 h-5"
          />
        </button>
      </template>

      <div v-if="showComparison">
        <SecurityProviderComparison />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <button
          type="button"
          class="w-full flex items-center justify-between"
          @click="showLevelDetails = !showLevelDetails"
        >
          <h3 class="text-xl font-semibold">セキュリティレベル詳細</h3>
          <UIcon
            :name="showLevelDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-5 h-5"
          />
        </button>
      </template>

      <div v-if="showLevelDetails">
        <SecurityLevelDetails />
      </div>
    </UCard>

    <MasterPasswordSetupDialog
      v-model:open="showMasterPasswordDialog"
      :mode="masterPasswordMode"
    />

    <!-- Simple -> Master Password 変更ダイアログ -->
    <FromSimpleDialog
      v-if="isFromSimpleDialogOpen"
      v-model:open="isFromSimpleDialogOpen"
      target-provider="master-password"
    />

    <!-- Master Password -> Simple 変更ダイアログ -->
    <FromMasterPasswordDialog
      v-if="isFromMasterPasswordDialogOpen"
      v-model:open="isFromMasterPasswordDialogOpen"
      target-provider="simple"
    />
  </div>
</template>
