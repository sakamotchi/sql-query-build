<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Connection, Environment } from '~/types'
import { useConnectionStore } from '~/stores/connection'

const { currentEnvironment } = useEnvironment()

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

  return `全${connections.value.length}件 • 開発: ${counts.development}件 • テスト: ${counts.test}件 • ステージング: ${counts.staging}件 • 本番: ${counts.production}件`
})

const isEmptyState = computed(() => !loading.value && filteredConnections.value.length === 0)

const navigateToConnectionForm = (connectionId?: string) => {
  router.push({
    path: '/connection-form',
    query: connectionId ? { id: connectionId } : undefined
  })
}

const handleConnect = (connection: Connection) => {
  // TODO: 実際の接続処理を実装
  console.info('connect to', connection)
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
            title="接続がありません"
            description="新しい接続を追加するか、検索条件を変更してください。"
            action-label="新規接続を追加"
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
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>

          <div v-else>
            <ConnectionList
              :connections="filteredConnections"
              :loading="loading"
              @connect="handleConnect"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
