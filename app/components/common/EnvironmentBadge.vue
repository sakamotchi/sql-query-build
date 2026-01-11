<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  customColor?: {
    primary: string
    background: string
  }
}>(), {
  size: 'md',
  showIcon: false
})

const { getEnvironmentLabel } = useEnvironment()

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const environmentColors: Record<Environment, BadgeColor> = {
  development: 'success',
  test: 'info',
  staging: 'warning',
  production: 'error'
}

const environmentIcons: Record<Environment, string> = {
  development: 'i-heroicons-code-bracket',
  test: 'i-heroicons-beaker',
  staging: 'i-heroicons-cloud',
  production: 'i-heroicons-server'
}

const badgeColor = computed(() => props.customColor ? 'neutral' : environmentColors[props.environment]) // カスタムの時はベースをneutralにする（styleで上書き）
const badgeIcon = computed(() => environmentIcons[props.environment])
const label = computed(() => getEnvironmentLabel(props.environment))

const customStyle = computed(() => {
  if (!props.customColor) return {}
  return {
    backgroundColor: props.customColor.primary,
    color: '#ffffff', // テキストは白固定（プライマリが濃い色想定）
    borderColor: props.customColor.primary
  }
})
</script>

<template>
  <UBadge
    :color="badgeColor"
    :size="size"
    variant="solid"
    :style="customStyle"
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
