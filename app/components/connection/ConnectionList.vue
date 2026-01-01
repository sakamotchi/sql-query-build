<script setup lang="ts">
import type { Connection } from '~/types'

const props = withDefaults(defineProps<{
  connections: Connection[]
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  edit: [connection: Connection]
  delete: [connection: Connection]
  connect: [connection: Connection]
  mutation: [connection: Connection]
}>()

const handleEdit = (connection: Connection) => emit('edit', connection)
const handleDelete = (connection: Connection) => emit('delete', connection)
const handleConnect = (connection: Connection) => emit('connect', connection)
const handleMutation = (connection: Connection) => emit('mutation', connection)
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">読み込み中...</p>
    </div>

    <div v-else-if="connections.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        接続が見つかりませんでした
      </p>
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="connection in connections"
        :key="connection.id"
        class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 flex-1">
            <EnvironmentBadge :environment="connection.environment" size="sm" />
            <div class="flex-1">
              <h4 class="font-semibold">{{ connection.name }}</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ connection.type.toUpperCase() }} • {{ connection.host }}:{{ connection.port }} • {{ connection.database }}
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <UButton color="primary" size="sm" @click="handleConnect(connection)">
              クエリビルダー
            </UButton>
            <UButton color="primary" variant="outline" size="sm" @click="handleMutation(connection)">
              データ変更
            </UButton>
            <UButton color="gray" variant="outline" size="sm" icon="i-heroicons-pencil" @click="handleEdit(connection)">
              編集
            </UButton>
            <UButton color="red" variant="outline" size="sm" icon="i-heroicons-trash" @click="handleDelete(connection)">
              削除
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
