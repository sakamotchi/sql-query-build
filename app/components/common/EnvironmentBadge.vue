<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}>(), {
  size: 'md',
  showIcon: false
})

const { getEnvironmentLabel } = useEnvironment()

const environmentColors: Record<Environment, string> = {
  development: 'green',
  test: 'blue',
  staging: 'amber',
  production: 'red'
}

const environmentIcons: Record<Environment, string> = {
  development: 'i-heroicons-code-bracket',
  test: 'i-heroicons-beaker',
  staging: 'i-heroicons-cloud',
  production: 'i-heroicons-server'
}

const badgeColor = computed(() => environmentColors[props.environment])
const badgeIcon = computed(() => environmentIcons[props.environment])
const label = computed(() => getEnvironmentLabel(props.environment))
</script>

<template>
  <UBadge
    :color="badgeColor"
    :size="size"
    variant="solid"
  >
    <div class="flex items-center gap-1">
      <UIcon
        v-if="showIcon"
        :name="badgeIcon"
      />
      <span>{{ label }}</span>
    </div>
  </UBadge>
</template>
