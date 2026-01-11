<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSafetyStore } from '@/stores/safety'
import type { Environment } from '@/types'

const safetyStore = useSafetyStore()
const { settings, loading, error } = storeToRefs(safetyStore)
const { t } = useI18n()

const environments = computed<{ key: Environment; label: string; description: string }[]>(() => [
  { key: 'development', label: t('settings.safety.env.development.label'), description: t('settings.safety.env.development.description') },
  { key: 'test', label: t('settings.safety.env.test.label'), description: t('settings.safety.env.test.description') },
  { key: 'staging', label: t('settings.safety.env.staging.label'), description: t('settings.safety.env.staging.description') },
  { key: 'production', label: t('settings.safety.env.production.label'), description: t('settings.safety.env.production.description') },
])

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
          <h3 class="text-xl font-semibold">{{ t('settings.safety.title') }}</h3>
          <p class="text-sm text-neutral-500 mt-1">
            {{ t('settings.safety.description') }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="resetConfirmOpen = true"
        >
          {{ t('settings.safety.resetButton') }}
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert v-if="error" color="error" variant="soft" icon="i-heroicons-exclamation-circle">
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
    <UModal v-model:open="resetConfirmOpen" :title="t('settings.safety.modal.title')">
      <template #body>
        <div class="p-4">
            <p>{{ t('settings.safety.modal.body') }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end p-4">
          <UButton color="neutral" variant="outline" @click="resetConfirmOpen = false">
            {{ t('settings.safety.modal.cancel') }}
          </UButton>
          <UButton color="error" @click="handleReset">
            {{ t('settings.safety.modal.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
