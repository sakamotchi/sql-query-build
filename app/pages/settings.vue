<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import { useSettingsStore } from '~/stores/settings'

type SettingsTab = 'general' | 'safety' | 'security' | 'about'

const settingsStore = useSettingsStore()
const securityStore = useSecurityStore()
const { currentEnvironment } = useEnvironment()
const { t } = useI18n()

const { loading: settingsLoading, error: settingsError } = storeToRefs(settingsStore)
const { loading: securityLoading, error: securityError } = storeToRefs(securityStore)

const tabs = computed<{ key: SettingsTab; value: SettingsTab; label: string; icon: string }[]>(() => [
  { key: 'general', value: 'general', label: t('settings.tabs.general'), icon: 'i-heroicons-cog-6-tooth' },
  { key: 'safety', value: 'safety', label: t('settings.tabs.safety'), icon: 'i-heroicons-shield-check' },
  { key: 'security', value: 'security', label: t('settings.tabs.security'), icon: 'i-heroicons-lock-closed' },
  { key: 'about', value: 'about', label: t('settings.tabs.about'), icon: 'i-heroicons-information-circle' }
])

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
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('settings.header.description') }}</p>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('settings.header.title') }}</h1>
        </div>

        <UButton to="/" variant="outline" color="neutral" size="sm">
          {{ t('settings.header.backHome') }}
        </UButton>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        :title="t('settings.header.loadError')"
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
            <SafetySettingsPanel v-else-if="item.value === 'safety'" />
            <SecuritySettings v-else-if="item.value === 'security'" />
            <AboutSection v-else-if="item.value === 'about'" />
          </div>
        </template>
      </UTabs>
    </main>
  </div>
</template>
