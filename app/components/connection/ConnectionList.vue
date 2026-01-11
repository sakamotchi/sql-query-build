<script setup lang="ts">
import type { Connection } from '~/types'

const { t } = useI18n()

withDefaults(defineProps<{
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
      <p class="mt-4 text-gray-600 dark:text-gray-300">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="connections.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        {{ t('launcher.noConnections') }}
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
              {{ t('connection.actions.browseData') }}
            </UButton>
            <UButton color="primary" variant="outline" size="sm" @click="handleMutation(connection)">
              {{ t('connection.actions.mutation') }}
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-pencil" @click="handleEdit(connection)">
              {{ t('common.edit') }}
            </UButton>
            <UButton color="error" variant="outline" size="sm" icon="i-heroicons-trash" @click="handleDelete(connection)">
              {{ t('common.delete') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
