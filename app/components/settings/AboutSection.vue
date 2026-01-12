<script setup lang="ts">
const { t } = useI18n()

const config = useRuntimeConfig()

const appInfo = computed(() => ({
  name: 'SQL Query Build',
  version: config.public.appVersion,
  description: t('settings.about.appInfo.description')
}))

const stack = computed(() => [
  { label: t('settings.about.stack.frontend'), value: 'Vue 3 + Nuxt 4 + TypeScript' },
  { label: 'UI', value: 'Nuxt UI / Tailwind CSS' }, // UI lib names usually don't need translation, but label does
  { label: t('settings.about.stack.desktop'), value: 'Tauri 2.x (Rust)' },
  { label: t('settings.about.stack.state'), value: 'Pinia' }
])
// Note: "UI" label works for both. 
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('settings.about.appInfo.label') }}</p>
          <h3 class="text-xl font-semibold">{{ appInfo.name }}</h3>
        </div>
        <UBadge color="neutral" variant="solid">v{{ appInfo.version }}</UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <p class="text-gray-700 dark:text-gray-300">
        {{ appInfo.description }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in stack"
          :key="item.label"
          class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700"
        >
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {{ item.label }}
            </p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ item.value }}
            </p>
          </div>
        </div>
      </div>

      <UAlert color="neutral" variant="soft" icon="i-heroicons-light-bulb">
        {{ t('settings.about.documentation') }}
      </UAlert>
    </div>
  </UCard>
</template>
