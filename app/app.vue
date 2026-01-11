<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import { useWindowStore } from '~/stores/window'
import { useSettingsStore } from '~/stores/settings'

useHead({
  title: 'SQL Query Build',
  meta: [
    { name: 'description', content: 'Visual SQL Query Builder for Multiple Environments' }
  ]
})

const securityStore = useSecurityStore()
const windowStore = useWindowStore()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(securityStore)
const { setLocale } = useI18n()

const showVerifyDialog = ref(false)
const isReady = ref(false)

const isMasterPasswordProvider = computed(
  () => settings.value.provider === 'master-password'
)

onMounted(async () => {
  // ウィンドウストアを初期化
  await windowStore.initialize()

  // セキュリティ設定をロード
  await securityStore.loadSettings()
  
  // アプリケーション設定をロードして言語を適用
  await settingsStore.loadSettings()
  if (settingsStore.currentLanguage) {
    await setLocale(settingsStore.currentLanguage)
  }

  if (isMasterPasswordProvider.value && settings.value.masterPasswordSet) {
    showVerifyDialog.value = true
  } else {
    isReady.value = true
  }
})

watch(showVerifyDialog, (open) => {
  if (!open && isMasterPasswordProvider.value) {
    isReady.value = true
  }
})
</script>

<template>
  <UApp>
    <div>
      <div v-if="!isReady" class="flex items-center justify-center h-screen">
        <div class="text-center space-y-4">
          <UIcon name="i-heroicons-lock-closed" class="w-16 h-16 text-primary-500 mx-auto" />
          <p class="text-lg text-gray-600 dark:text-gray-300">起動中...</p>
        </div>
      </div>

      <div v-else>
        <NuxtPage />
      </div>

      <MasterPasswordVerifyDialog v-model:open="showVerifyDialog" />
    </div>
  </UApp>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
