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

const { t } = useI18n()
const toast = useToast()

// デバッグ: 設定が変更されたらログ出力（immediate は外す）
watch(() => settings.value.provider, (newProvider, oldProvider) => {
  console.log('[SecuritySettings] Provider changed:', { from: oldProvider, to: newProvider })
})

const showMasterPasswordDialog = ref(false)
const masterPasswordMode = ref<'setup' | 'change'>('setup')
const showComparison = ref(false)
const showLevelDetails = ref(false)

const providerOptions = computed<{ label: string; value: SecurityProvider; description: string; recommended?: boolean }[]>(() => [
  {
    label: t('settings.security.provider.options.simple.label'),
    value: 'simple',
    description: t('settings.security.provider.options.simple.description'),
    recommended: true
  },
  {
    label: t('settings.security.provider.options.masterPassword.label'),
    value: 'master-password',
    description: t('settings.security.provider.options.masterPassword.description')
  }
])

const levelOptions = computed<{ label: string; value: SecurityLevel; hint: string }[]>(() => [
  { label: t('settings.security.level.options.low.label'), value: 'low', hint: t('settings.security.level.options.low.hint') },
  { label: t('settings.security.level.options.medium.label'), value: 'medium', hint: t('settings.security.level.options.medium.hint') },
  { label: t('settings.security.level.options.high.label'), value: 'high', hint: t('settings.security.level.options.high.hint') }
])

const saving = ref(false)
// message ref no longer needed for success

const updateProvider = (provider: SecurityProvider) => {
  console.log('[SecuritySettings] updateProvider called', {
    selectedProvider: provider,
    currentProvider: settings.value.provider,
    willSkip: provider === settings.value.provider
  })
  if (provider === settings.value.provider) {
    console.log('[SecuritySettings] Skipping - same provider selected')
    return
  }

  console.log('[SecuritySettings] Opening change dialog for:', provider)
  openChangeDialog(provider)
}

const updateLevel = async (level: SecurityLevel) => {
  saving.value = true
  try {
    await securityStore.setLevel(level)
    toast.add({
      title: t('settings.security.messages.updated'),
      icon: 'i-heroicons-check-circle',
      color: 'primary'
    })
  } catch (e) {
    toast.add({
      title: t('settings.security.messages.updateFailed'),
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const openMasterPasswordDialog = () => {
  masterPasswordMode.value = settings.value.masterPasswordSet ? 'change' : 'setup'
  showMasterPasswordDialog.value = true
}

const resetSecurity = async () => {
  if (!confirm(t('settings.security.messages.resetConfirm'))) {
    return
  }

  saving.value = true
  try {
    await securityStore.resetSecurityConfig()
    toast.add({
      title: t('settings.security.messages.resetSuccess'),
      icon: 'i-heroicons-check-circle',
      color: 'primary'
    })
  } catch (e) {
    toast.add({
      title: t('settings.security.messages.resetFailed'),
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
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
              color="error"
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
            :items="levelOptions"
            value-key="value"
            :disabled="saving || loading"
            @update:model-value="updateLevel"
          >
            <template #label="{ item }">
              <div class="flex items-center justify-between w-full">
                <span>{{ item.label }}</span>
                <span class="text-xs text-gray-500">{{ item.hint }}</span>
              </div>
            </template>
          </URadioGroup>
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="t('settings.security.messages.errorTitle')"
        >
          {{ error }}
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
            :color="settings.masterPasswordSet ? 'neutral' : 'primary'"
            :disabled="loading"
            @click="openMasterPasswordDialog"
          >
            {{ settings.masterPasswordSet ? 'パスワード変更' : '初期設定' }}
          </UButton>
        </div>

        <UAlert
          v-if="!settings.masterPasswordSet"
          color="warning"
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
