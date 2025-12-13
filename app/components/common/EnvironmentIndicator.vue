<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  position?: 'top' | 'left' | 'bottom' | 'right'
}>(), {
  position: 'top'
})

const { getEnvironmentColors } = useEnvironment()

const positionClasses = computed(() => {
  const positions = {
    top: 'top-0 left-0 right-0 h-1',
    left: 'top-0 left-0 bottom-0 w-1',
    bottom: 'bottom-0 left-0 right-0 h-1',
    right: 'top-0 right-0 bottom-0 w-1'
  }
  return positions[props.position]
})

const barColor = computed(() => getEnvironmentColors(props.environment).primary)
</script>

<template>
  <div
    class="absolute"
    :class="[`env-indicator-${environment}`, positionClasses]"
    :style="{ backgroundColor: barColor }"
  />
</template>

<style scoped>
.env-indicator-development {
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
}

.env-indicator-test {
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.5);
}

.env-indicator-staging {
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
}

.env-indicator-production {
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
}
</style>
