<script setup lang="ts">
import type { Environment } from '~/types'

const props = withDefaults(defineProps<{
  environment: Environment
  dismissible?: boolean
}>(), {
  dismissible: false
})

const { getEnvironmentLabel } = useEnvironment()

const isDismissed = ref(false)

const warningMessage = computed(() => {
  const messages: Record<Environment, string> = {
    development: '開発環境に接続しています',
    test: 'テスト環境に接続しています',
    staging: 'ステージング環境に接続しています。本番データではありません。',
    production: '⚠️ 本番環境に接続しています。操作には十分注意してください。'
  }
  return messages[props.environment]
})

const alertColor = computed(() => {
  const colors: Record<Environment, string> = {
    development: 'green',
    test: 'blue',
    staging: 'amber',
    production: 'red'
  }
  return colors[props.environment]
})

const title = computed(() => `${getEnvironmentLabel(props.environment)}環境`)

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
