<template>
  <v-card
    :aria-label="`${connection.name}への接続`"
    role="button"
    tabindex="0"
    hover
    @click="$emit('select', connection)"
    @keydown.enter="$emit('select', connection)"
    @keydown.delete="$emit('delete', connection)"
    class="connection-card"
  >
    <v-card-title class="d-flex align-center">
      <v-icon
        :color="getEnvironmentColor(connection.environment)"
        size="small"
        class="mr-2"
      >
        {{ getDatabaseIcon(connection.dbType) }}
      </v-icon>
      <span class="text-truncate">{{ connection.name }}</span>
      <v-spacer></v-spacer>
      <v-chip
        :color="getEnvironmentColor(connection.environment)"
        size="x-small"
        variant="flat"
      >
        {{ getEnvironmentLabel(connection.environment) }}
      </v-chip>
    </v-card-title>

    <v-card-subtitle>
      {{ connection.host }}:{{ connection.port }}/{{ connection.database }}
    </v-card-subtitle>

    <v-card-text>
      <div class="text-caption text-grey">
        <div>
          <v-icon size="x-small">mdi-account</v-icon>
          {{ connection.username }}
        </div>
        <div v-if="connection.lastUsedAt" class="mt-1">
          <v-icon size="x-small">mdi-clock-outline</v-icon>
          最終使用: {{ formatDate(connection.lastUsedAt) }}
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-pencil"
        size="small"
        variant="text"
        @click.stop="$emit('edit', connection)"
        aria-label="接続を編集"
      ></v-btn>
      <v-btn
        icon="mdi-delete"
        size="small"
        variant="text"
        color="error"
        @click.stop="$emit('delete', connection)"
        aria-label="接続を削除"
      ></v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Connection, Environment, DatabaseType } from '@/types/connection'

defineProps<{
  connection: Connection
}>()

defineEmits<{
  select: [connection: Connection]
  edit: [connection: Connection]
  delete: [connection: Connection]
}>()

const getEnvironmentColor = (env: Environment): string => {
  const colors: Record<Environment, string> = {
    development: 'blue',
    test: 'orange',
    staging: 'purple',
    production: 'red'
  }
  return colors[env]
}

const getEnvironmentLabel = (env: Environment): string => {
  const labels: Record<Environment, string> = {
    development: '開発',
    test: 'テスト',
    staging: 'STG',
    production: '本番'
  }
  return labels[env]
}

const getDatabaseIcon = (dbType: DatabaseType): string => {
  const icons: Record<DatabaseType, string> = {
    postgresql: 'mdi-elephant',
    mysql: 'mdi-dolphin',
    sqlite: 'mdi-database'
  }
  return icons[dbType]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今日'
  } else if (days === 1) {
    return '昨日'
  } else if (days < 7) {
    return `${days}日前`
  } else {
    return date.toLocaleDateString('ja-JP')
  }
}
</script>

<style scoped>
.connection-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.connection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.connection-card:focus {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}
</style>
