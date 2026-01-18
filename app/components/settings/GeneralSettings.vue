<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import type { AppSettings } from '~/types'

const settingsStore = useSettingsStore()
const { t, locale, setLocale } = useI18n()
const toast = useToast()

const { settings, loading, error } = storeToRefs(settingsStore)

const form = reactive<Pick<AppSettings, 'language'>>({
  language: settings.value.language
})

const saving = ref(false)

watch(
  settings,
  (current) => {
    // ストア更新時にフォームへ反映（ページ再訪や外部更新に対応）
    Object.assign(form, current)
  },
  { deep: true }
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
      <UFormField :label="t('settings.general.language.label')" :hint="t('settings.general.language.hint')">
        <USelect
          v-model="form.language"
          :items="[
            { label: t('settings.general.language.options.ja'), value: 'ja' },
            { label: t('settings.general.language.options.en'), value: 'en' }
          ]"
        />
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
