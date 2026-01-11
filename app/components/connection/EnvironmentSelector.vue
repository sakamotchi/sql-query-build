<script setup lang="ts">
import type { Environment } from '~/types'

const selectedEnvironment = defineModel<Environment>({ required: true })

const { getEnvironmentColors } = useEnvironment()
const { t } = useI18n()

const environmentOptions = computed<Array<{
  value: Environment
  label: string
  icon: string
  description: string
}>>(() => [
  {
    value: 'development',
    label: t('common.environment.development'),
    icon: 'i-heroicons-code-bracket',
    description: t('common.environment.description.development')
  },
  {
    value: 'test',
    label: t('common.environment.test'),
    icon: 'i-heroicons-beaker',
    description: t('common.environment.description.test')
  },
  {
    value: 'staging',
    label: t('common.environment.staging'),
    icon: 'i-heroicons-cloud',
    description: t('common.environment.description.staging')
  },
  {
    value: 'production',
    label: t('common.environment.production'),
    icon: 'i-heroicons-server',
    description: t('common.environment.description.production')
  }
])

const selectEnvironment = (env: Environment) => {
  selectedEnvironment.value = env
}

const optionStyle = (env: Environment, selected: boolean) => {
  const colors = getEnvironmentColors(env)
  return selected
    ? {
        borderColor: colors.primary,
        backgroundColor: colors.bg
      }
    : undefined
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <button
      v-for="option in environmentOptions"
      :key="option.value"
      type="button"
      class="relative p-4 rounded-lg border-2 transition-all text-left"
      :class="selectedEnvironment === option.value
        ? 'shadow-md'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
      :style="optionStyle(option.value, selectedEnvironment === option.value)"
      @click="selectEnvironment(option.value)"
    >
      <div
        v-if="selectedEnvironment === option.value"
        class="absolute top-2 right-2"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="text-xl"
          :style="{ color: getEnvironmentColors(option.value).primary }"
        />
      </div>

      <div class="flex items-center gap-3 mb-2">
        <UIcon
          :name="option.icon"
          class="text-2xl"
          :style="{ color: getEnvironmentColors(option.value).primary }"
        />
        <h4 class="font-semibold text-gray-900 dark:text-white">
          {{ option.label }}
        </h4>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ option.description }}
      </p>
    </button>
  </div>
</template>
