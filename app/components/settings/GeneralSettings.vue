<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import { useTheme } from '~/composables/useTheme'
import type { AppSettings } from '~/types'

const settingsStore = useSettingsStore()
const { setColorMode } = useTheme()

const { settings, loading, error } = storeToRefs(settingsStore)

const form = reactive<AppSettings>({
  theme: settings.value.theme,
  language: settings.value.language,
  autoSave: settings.value.autoSave,
  windowRestore: settings.value.windowRestore
})

const saving = ref(false)
const message = ref<string | null>(null)

watch(
  settings,
  (current) => {
    // ストア更新時にフォームへ反映（ページ再訪や外部更新に対応）
    Object.assign(form, current)
  },
  { deep: true }
)

watch(
  () => form.theme,
  (mode) => {
    setColorMode(mode)
  }
)

const saveSettings = async () => {
  saving.value = true
  message.value = null
  try {
    await settingsStore.updateSettings({ ...form })
    message.value = '設定を保存しました'
  } catch (e) {
    message.value = '設定の保存に失敗しました'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xl font-semibold">一般設定</h3>
        <UBadge v-if="saving" color="primary" variant="soft">保存中</UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <UFormField label="テーマ" hint="アプリ全体のカラーモード">
        <USelect
          v-model="form.theme"
          :items="[
            { label: 'ライト', value: 'light' },
            { label: 'ダーク', value: 'dark' },
            { label: '自動', value: 'auto' }
          ]"
        />
      </UFormField>

      <UFormField label="言語" hint="将来的にi18nで切り替え予定">
        <USelect
          v-model="form.language"
          :items="[
            { label: '日本語', value: 'ja' },
            { label: 'English', value: 'en' }
          ]"
        />
      </UFormField>

      <UFormField label="自動保存">
        <div class="space-y-1">
          <USwitch v-model="form.autoSave" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            クエリを一定間隔で自動保存します
          </p>
        </div>
      </UFormField>

      <UFormField label="ウィンドウ復元">
        <div class="space-y-1">
          <USwitch v-model="form.windowRestore" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            再起動時に前回のウィンドウ位置とサイズを復元します
          </p>
        </div>
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

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="primary"
          :loading="saving || loading"
          :disabled="loading"
          @click="saveSettings"
        >
          設定を保存
        </UButton>
      </div>
    </template>
  </UCard>
</template>
