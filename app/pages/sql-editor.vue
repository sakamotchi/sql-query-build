<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import { useSqlEditorStore } from '~/stores/sql-editor'
import type { Connection } from '~/types'

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const sqlEditorStore = useSqlEditorStore()
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
    sqlEditorStore.setConnection(value.id)
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

    <div class="flex-1 min-h-0">
      <SqlEditorLayout />
    </div>
  </div>
</template>
