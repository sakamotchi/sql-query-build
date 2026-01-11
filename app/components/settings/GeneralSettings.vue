<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import { useTheme } from '~/composables/useTheme'
import type { AppSettings } from '~/types'

const settingsStore = useSettingsStore()
const { setColorMode } = useTheme()
const { t, locale, setLocale } = useI18n()
const toast = useToast()

const { settings, loading, error } = storeToRefs(settingsStore)

const form = reactive<AppSettings>({
  theme: settings.value.theme,
  language: settings.value.language,
  autoSave: settings.value.autoSave,
  windowRestore: settings.value.windowRestore
})

const saving = ref(false)
// message ref is no longer needed for success, only keeping it if it was used for errors locally, 
// but errors seem to come from store or local catch. 
// The original code used `message` for both success and error (if caught locally).
// Let's check how error is handled. 
// local `error` ref from storeToRefs(settingsStore) handles store errors.
// local `message` was used for "Saved" or "Save Failed".
// I will use toast for both success and failure in saveSettings to be consistent, or keep UAlert for error.
// Best practice: Toast for transient actions (save), Alert for persistent inconsistencies.
// Save failure is transient => Toast is fine, or Alert. 
// I'll stick to Toast for success. For error, I'll assume store error handling or keep it simple.

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
  try {
    await settingsStore.updateSettings({ ...form })
    // 言語設定も明示的に反映
    if (locale.value !== form.language) {
      await setLocale(form.language)
    }
    
    toast.add({
      title: t('settings.general.messages.saved'),
      icon: 'i-heroicons-check-circle',
      color: 'primary'
    })
  } catch (e) {
    // If store sets `error`, it might be displayed by UAlert below if we keep it.
    // If we want toast for error too:
    toast.add({
      title: t('settings.general.messages.saveFailed'),
      description: e instanceof Error ? e.message : undefined,
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xl font-semibold">{{ t('settings.general.title') }}</h3>
        <UBadge v-if="saving" color="primary" variant="soft">{{ t('settings.general.saving') }}</UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <UFormField :label="t('settings.general.theme.label')" :hint="t('settings.general.theme.hint')">
        <USelect
          v-model="form.theme"
          :items="[
            { label: t('settings.general.theme.options.light'), value: 'light' },
            { label: t('settings.general.theme.options.dark'), value: 'dark' },
            { label: t('settings.general.theme.options.auto'), value: 'auto' }
          ]"
        />
      </UFormField>

      <UFormField :label="t('settings.general.language.label')" :hint="t('settings.general.language.hint')">
        <USelect
          v-model="form.language"
          :items="[
            { label: t('settings.general.language.options.ja'), value: 'ja' },
            { label: t('settings.general.language.options.en'), value: 'en' }
          ]"
        />
      </UFormField>

      <UFormField :label="t('settings.general.autoSave.label')">
        <div class="space-y-1">
          <USwitch v-model="form.autoSave" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('settings.general.autoSave.hint') }}
          </p>
        </div>
      </UFormField>

      <UFormField :label="t('settings.general.windowRestore.label')">
        <div class="space-y-1">
          <USwitch v-model="form.windowRestore" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('settings.general.windowRestore.hint') }}
          </p>
        </div>
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="t('settings.general.messages.errorTitle')"
      >
        {{ error }}
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
          {{ t('settings.general.saveButton') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
