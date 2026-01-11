<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  dismissible?: boolean
}>(), {
  dismissible: false
})

const { getEnvironmentLabel } = useEnvironment()
const { t } = useI18n()

const isDismissed = ref(false)

const warningMessage = computed(() => {
  return t(`common.environment.message.${props.environment}`)
})

type AlertColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const alertColor = computed(() => {
  const colors: Record<Environment, AlertColor> = {
    development: 'success',
    test: 'info',
    staging: 'warning',
    production: 'error'
  }
  return colors[props.environment]
})

const title = computed(() => `${getEnvironmentLabel(props.environment)} ${t('common.envSuffix')}`)

const dismiss = () => {
  isDismissed.value = true
}
</script>

<template>
  <UAlert
    v-if="!isDismissed"
    :color="alertColor"
    :title="title"
    :description="warningMessage"
    :close-button="dismissible ? { color: 'white' } : undefined"
    variant="solid"
    @close="dismiss"
  >
    <template #icon>
      <UIcon
        :name="environment === 'production' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'"
        class="w-5 h-5"
      />
    </template>
  </UAlert>
</template>
