<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import type { SecurityLevel, SecurityProvider } from '~/types'

const securityStore = useSecurityStore()
const { settings, loading, error } = storeToRefs(securityStore)

const showMasterPasswordDialog = ref(false)
const providerOptions: { label: string; value: SecurityProvider; description: string }[] = [
  { label: 'OSキーチェーン', value: 'system', description: 'OSの安全なストレージに保存' },
  { label: 'マスターパスワード', value: 'master-password', description: 'アプリ内で暗号化を管理' }
]

const levelOptions: { label: string; value: SecurityLevel; hint: string }[] = [
  { label: '低', value: 'low', hint: '基本的な暗号化' },
  { label: '中', value: 'medium', hint: '推奨設定' },
  { label: '高', value: 'high', hint: '最も厳格な設定' }
]

const saving = ref(false)
const message = ref<string | null>(null)

const updateProvider = async (provider: SecurityProvider) => {
  saving.value = true
  message.value = null
  try {
    await securityStore.setProvider(provider)
    message.value = 'プロバイダーを更新しました'
  } catch (e) {
    message.value = 'プロバイダーの更新に失敗しました'
  } finally {
    saving.value = false
  }
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
  showMasterPasswordDialog.value = true
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xl font-semibold">セキュリティプロバイダー</h3>
          <UBadge v-if="saving || loading" color="primary" variant="soft">処理中</UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField label="プロバイダー" hint="保存先と復号方式を選択します">
          <USelect
            :model-value="settings.provider"
            :options="providerOptions"
            option-attribute="label"
            value-attribute="value"
            :disabled="saving || loading"
            @update:model-value="updateProvider"
          >
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="font-medium">{{ option.label }}</span>
                <span class="text-xs text-gray-500">{{ option.description }}</span>
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
            <p class="text-sm text-gray-600 dark:text-gray-400">接続情報を暗号化します</p>
            <p class="text-xs text-gray-500">
              設定済み: {{ settings.masterPasswordSet ? 'はい' : 'いいえ' }}
            </p>
          </div>
          <UButton
            :variant="settings.masterPasswordSet ? 'outline' : 'solid'"
            :disabled="loading"
            @click="openMasterPasswordDialog"
          >
            {{ settings.masterPasswordSet ? '変更する' : '設定する' }}
          </UButton>
        </div>
      </div>
    </UCard>

    <MasterPasswordSetupDialog v-model="showMasterPasswordDialog" />
  </div>
</template>
