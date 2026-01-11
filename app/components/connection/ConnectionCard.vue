<script setup lang="ts">
import type { Connection } from '~/types'

const { t } = useI18n()

const props = defineProps<{
  connection: Connection
}>()

const emit = defineEmits<{
  edit: [connection: Connection]
  delete: [connection: Connection]
  connect: [connection: Connection]
  mutation: [connection: Connection]
}>()

const dbIcon = computed(() => {
  const icons: Record<Connection['type'], string> = {
    mysql: 'i-logos-mysql',
    postgresql: 'i-logos-postgresql',
    sqlite: 'i-logos-sqlite',
    sqlserver: 'i-logos-microsoft',
    oracle: 'i-logos-oracle'
  }
  return icons[props.connection.type] || 'i-heroicons-circle-stack'
})

const handleConnect = () => emit('connect', props.connection)
const handleMutation = () => emit('mutation', props.connection)
const handleEdit = () => emit('edit', props.connection)
const handleDelete = () => emit('delete', props.connection)
</script>

<template>
  <UCard class="relative hover:shadow-lg transition-shadow">
    <EnvironmentIndicator
      :environment="connection.environment"
      :custom-color="connection.customColor"
      position="top"
    />

    <div class="space-y-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <UIcon :name="dbIcon" class="w-8 h-8" />
          <div>
            <h3 class="text-lg font-semibold">{{ connection.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ connection.type.toUpperCase() }}
            </p>
          </div>
        </div>
        <EnvironmentBadge
          :environment="connection.environment"
          :custom-color="connection.customColor"
          size="sm"
        />
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-server" class="w-4 h-4 text-gray-400" />
          <span class="text-gray-700 dark:text-gray-300">
            {{ connection.host }}:{{ connection.port }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-gray-400" />
          <span class="text-gray-700 dark:text-gray-300">
            {{ connection.database }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
          <span class="text-gray-700 dark:text-gray-300">
            {{ connection.username }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton color="primary" size="sm" @click="handleConnect">
          {{ t('connection.actions.browseData') }}
        </UButton>
        <UButton color="primary" variant="outline" size="sm" @click="handleMutation">
          {{ t('connection.actions.mutation') }}
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-pencil" @click="handleEdit">
          {{ t('common.edit') }}
        </UButton>
        <UButton color="error" variant="outline" size="sm" icon="i-heroicons-trash" @click="handleDelete">
          {{ t('common.delete') }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>
