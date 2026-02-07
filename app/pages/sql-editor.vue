<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { useWindowStore } from '~/stores/window'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useDatabaseStructureStore } from '~/stores/database-structure'
import type { Connection } from '~/types'

const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const sqlEditorStore = useSqlEditorStore()
const databaseStructureStore = useDatabaseStructureStore()
const { currentConnectionId } = storeToRefs(windowStore)

const connection = computed<Connection | null>(() => {
  if (!currentConnectionId.value) {
    return null
  }
  return connectionStore.getConnectionById(currentConnectionId.value) || null
})

watch(connection, async (value, oldValue) => {
  if (oldValue?.id && oldValue.id !== value?.id) {
    databaseStructureStore.cancelBackgroundFetch(oldValue.id)
  }

  if (value) {
    windowStore.setConnectionContext(value.id, value.environment)
    sqlEditorStore.setConnection(value.id)

    // Phase 1: 軽量サマリーを取得
    try {
      await databaseStructureStore.fetchDatabaseStructureSummary(value.id)
      console.log('[SqlEditor] Database structure summary loaded for connection:', value.id)
      void databaseStructureStore.startBackgroundFetch(value.id)
    } catch (error) {
      console.warn('[SqlEditor] Failed to load database structure summary:', error)

      // 互換性のため、サマリー取得失敗時は従来の全取得へフォールバック
      try {
        await databaseStructureStore.fetchDatabaseStructure(value.id)
        console.log('[SqlEditor] Fallback full structure loaded for connection:', value.id)
      } catch (fallbackError) {
        console.warn('[SqlEditor] Failed to load fallback full structure:', fallbackError)
      }
    }
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

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!sqlEditorStore.hasUnsavedChanges) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (sqlEditorStore.connectionId) {
    databaseStructureStore.cancelBackgroundFetch(sqlEditorStore.connectionId)
  } else {
    databaseStructureStore.cancelBackgroundFetch()
  }
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <SqlEditorLayout />
  </div>
</template>
