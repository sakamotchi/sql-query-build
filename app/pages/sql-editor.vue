<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import type { Connection } from '~/types'

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const { currentConnectionId } = storeToRefs(windowStore)

const connection = computed<Connection | null>(() => {
  if (!currentConnectionId.value) {
    return null
  }
  return connectionStore.getConnectionById(currentConnectionId.value) || null
})

watch(connection, (value) => {
  if (value) {
    windowStore.setConnectionContext(value.id, value.environment)
  }
}, { immediate: true })

onMounted(async () => {
  if (connectionStore.connections.length === 0) {
    try {
      await connectionStore.loadConnections()
    } catch (error) {
      console.warn('[SqlEditor] Failed to load connections:', error)
    }
  }
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <EnvironmentHeader
      v-if="connection"
      :environment="connection.environment"
    />

    <div class="flex-1 flex items-center justify-center">
      <div class="text-center px-6">
        <UIcon name="i-heroicons-code-bracket" class="text-6xl text-gray-400 mb-4" />
        <h2 class="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">
          SQLエディタ（準備中）
        </h2>
        <p class="text-gray-500 dark:text-gray-400">
          Phase 2でエディタUIを実装予定
        </p>
      </div>
    </div>
  </div>
</template>
