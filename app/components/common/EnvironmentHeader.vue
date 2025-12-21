<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  showToggle?: boolean
}>(), {
  showToggle: false
})

const { getEnvironmentLabel, getEnvironmentColors } = useEnvironment()
const { toggleColorMode, isDark } = useTheme()

const badgeColors: Record<Environment, string> = {
  development: 'green',
  test: 'blue',
  staging: 'amber',
  production: 'red'
}

const borderColor = computed(() => getEnvironmentColors(props.environment).border)
const environmentLabel = computed(() => getEnvironmentLabel(props.environment))
const badgeColor = computed(() => badgeColors[props.environment])
</script>

<template>
  <header
    class="border-b-4 shadow-md bg-white dark:bg-gray-900"
    :style="{ borderColor }"
  >
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          SQL Query Build
        </h1>
        <UBadge
          :color="badgeColor"
          size="lg"
          variant="solid"
        >
          {{ environmentLabel }} 環境
        </UBadge>
      </div>

      <div v-if="showToggle" class="flex items-center gap-2">
        <UButton
          :icon="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
          variant="ghost"
          @click="toggleColorMode"
        >
          {{ isDark ? 'ダーク' : 'ライト' }}モード
        </UButton>
      </div>
    </div>
  </header>
</template>
