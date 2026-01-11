<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Connection, Environment } from '~/types'
import { useConnectionStore } from '~/stores/connection'
import { windowApi } from '~/api/window'

const { currentEnvironment } = useEnvironment()
const { t } = useI18n()
const toast = useToast()

const connectionStore = useConnectionStore()
const { connections, loading } = storeToRefs(connectionStore)

const searchQuery = ref('')
const environmentFilter = ref<'all' | Environment>('all')
const viewMode = ref<'grid' | 'list'>('grid')

const router = useRouter()

const filteredConnections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return connections.value.filter((connection) => {
    const matchesEnv = environmentFilter.value === 'all' || connection.environment === environmentFilter.value
    const matchesQuery =
      query === '' ||
      connection.name.toLowerCase().includes(query) ||
      connection.host.toLowerCase().includes(query) ||
      connection.database.toLowerCase().includes(query)

    return matchesEnv && matchesQuery
  })
})

const statsText = computed(() => {
  const counts = connections.value.reduce<Record<Environment, number>>((acc, connection) => {
    acc[connection.environment] = (acc[connection.environment] || 0) + 1
    return acc
  }, {
    development: 0,
    test: 0,
    staging: 0,
    production: 0
  })

  return t('launcher.statsDetail', {
    total: connections.value.length,
    dev: counts.development,
    test: counts.test,
    staging: counts.staging,
    prod: counts.production
  })
})

const isEmptyState = computed(() => !loading.value && filteredConnections.value.length === 0)

const navigateToConnectionForm = (connectionId?: string) => {
  router.push({
    path: '/connection-form',
    query: connectionId ? { id: connectionId } : undefined
  })
}

const handleConnect = async (connection: Connection) => {
  try {
    // 既存のウィンドウを検索
    const existing = await windowApi.findWindowByConnection(connection.id, 'query_builder')

    if (existing) {
      // 既存のウィンドウにフォーカス
      await windowApi.focusWindow(existing.label)
      toast.add({
        title: t('launcher.toasts.focus'),
        description: t('launcher.toasts.focusDesc', { name: connection.name }),
        color: 'primary',
      })
    } else {
      // 新しいウィンドウを開く
      await windowApi.openQueryBuilder(connection.id, connection.name, connection.environment)
      toast.add({
        title: t('launcher.toasts.open'),
        description: t('launcher.toasts.openDesc', { name: connection.name }),
        color: 'primary',
      })
    }
  } catch (error) {
    console.error('Failed to open query builder:', error)
    toast.add({
      title: t('launcher.toasts.error'),
      description: error instanceof Error ? error.message : t('launcher.toasts.unknownError'),
      color: 'error',
    })
  }
}

const handleMutation = async (connection: Connection) => {
  try {
    const existing = await windowApi.findWindowByConnection(connection.id, 'mutation_builder')

    if (existing) {
      await windowApi.focusWindow(existing.label)
      toast.add({
        title: t('launcher.toasts.focus'),
        description: t('launcher.toasts.focusDesc', { name: connection.name }),
        color: 'primary',
      })
    } else {
      await windowApi.openMutationBuilder(connection.id, connection.name, connection.environment)
      toast.add({
        title: t('launcher.toasts.openMutation'),
        description: t('launcher.toasts.openDesc', { name: connection.name }),
        color: 'primary',
      })
    }
  } catch (error) {
    console.error('Failed to open mutation builder:', error)
    toast.add({
      title: t('launcher.toasts.error'),
      description: error instanceof Error ? error.message : t('launcher.toasts.unknownError'),
      color: 'error',
    })
  }
}

const handleEdit = (connection: Connection) => {
  navigateToConnectionForm(connection.id)
}

const handleDelete = async (connection: Connection) => {
  await connectionStore.deleteConnection(connection.id)
}

const handleNewConnection = () => navigateToConnectionForm()
const handleRefresh = () => connectionStore.loadConnections()
const handleToggleView = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}
const handleOpenSettings = () => {
  router.push('/settings')
}

onMounted(() => {
  connectionStore.loadConnections()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EnvironmentHeader
      :environment="currentEnvironment"
      :show-toggle="true"
    />

    <main class="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <LauncherToolbar
        @new-connection="handleNewConnection"
        @refresh="handleRefresh"
        @toggle-view="handleToggleView"
        @open-settings="handleOpenSettings"
      >
        <template #stats>
          {{ statsText }}
        </template>
      </LauncherToolbar>

      <SearchFilter
        v-model:search-query="searchQuery"
        v-model:environment-filter="environmentFilter"
      />

      <section>
        <div v-if="loading" class="py-12">
          <ConnectionList :connections="[]" :loading="true" />
        </div>

        <div v-else-if="isEmptyState">
          <EmptyState
            :action-label="t('launcher.addNewConnection')"
            @action="handleNewConnection"
          />
        </div>

        <div v-else>
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ConnectionCard
              v-for="connection in filteredConnections"
              :key="connection.id"
              :connection="connection"
              @connect="handleConnect"
              @mutation="handleMutation"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>

          <div v-else>
            <ConnectionList
              :connections="filteredConnections"
              :loading="loading"
              @connect="handleConnect"
              @mutation="handleMutation"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
