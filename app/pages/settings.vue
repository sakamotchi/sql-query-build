<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import { useSettingsStore } from '~/stores/settings'

type SettingsTab = 'general' | 'security' | 'about'

const settingsStore = useSettingsStore()
const securityStore = useSecurityStore()
const { currentEnvironment } = useEnvironment()

const { loading: settingsLoading, error: settingsError } = storeToRefs(settingsStore)
const { loading: securityLoading, error: securityError } = storeToRefs(securityStore)

const tabs: { key: SettingsTab; value: SettingsTab; label: string; icon: string }[] = [
  { key: 'general', value: 'general', label: '一般設定', icon: 'i-heroicons-cog-6-tooth' },
  { key: 'security', value: 'security', label: 'セキュリティ', icon: 'i-heroicons-lock-closed' },
  { key: 'about', value: 'about', label: 'について', icon: 'i-heroicons-information-circle' }
]

const selectedTab = ref<SettingsTab>('general')
const isLoading = computed(() => settingsLoading.value || securityLoading.value)
const errorMessage = computed(() => settingsError.value || securityError.value)

onMounted(async () => {
  await Promise.allSettled([
    settingsStore.loadSettings(),
    securityStore.loadSettings()
  ])
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EnvironmentHeader :environment="currentEnvironment" :show-toggle="true" />

    <main class="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">アプリ全体の動作を管理します</p>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">設定</h1>
        </div>

        <UButton to="/" variant="ghost" color="gray" size="sm">
          ホームに戻る
        </UButton>
      </div>

      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="設定の読み込みに失敗しました"
      >
        {{ errorMessage }}
      </UAlert>

      <UTabs
        v-model="selectedTab"
        :items="tabs"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <template #content="{ item }">
          <div class="py-6 px-2">
            <div v-if="isLoading" class="flex justify-center py-6">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-500" />
            </div>

            <GeneralSettings v-else-if="item.value === 'general'" />
            <SecuritySettings v-else-if="item.value === 'security'" />
            <AboutSection v-else-if="item.value === 'about'" />
          </div>
        </template>
      </UTabs>
    </main>
  </div>
</template>
