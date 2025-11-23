<template>
  <div class="environment-header-content">
    <!-- 環境情報 -->
    <div class="environment-summary">
      <v-avatar
        size="48"
        class="environment-avatar mr-4"
        :style="{ backgroundColor: effectiveThemeInfo.secondary }"
      >
        <v-icon
          color="white"
          :icon="environmentIcon"
          size="28"
        ></v-icon>
      </v-avatar>

      <div class="environment-info">
        <div class="environment-title">
          <EnvironmentBadge
            :environment="environment"
            size="large"
            show-icon
            variant="tonal"
          />
          <span class="connection-name">{{ connectionName }}</span>
        </div>
        <div class="connection-details">
          <v-icon
            :icon="dbIcon"
            size="18"
            class="mr-1"
          ></v-icon>
          <span class="mr-2">{{ databaseTypeLabel }}</span>
          <span class="separator" aria-hidden="true">•</span>
          <span class="connection-endpoint">{{ connectionEndpoint }}</span>
          <span class="separator" aria-hidden="true">/</span>
          <span class="connection-database">{{ databaseLabel }}</span>
        </div>
      </div>
    </div>

    <!-- アクション -->
    <div class="environment-actions">
      <v-chip
        :color="connectionStatusColor"
        variant="elevated"
        class="connection-status"
        density="comfortable"
      >
        <v-icon
          :icon="connectionStatusIcon"
          start
          size="18"
        ></v-icon>
        {{ connectionStatus }}
      </v-chip>

      <v-btn
        v-if="connected"
        color="warning"
        variant="text"
        prepend-icon="mdi-link-off"
        class="mr-2"
        data-testid="header-disconnect-btn"
        @click="emit('disconnect')"
      >
        切断
      </v-btn>

      <v-btn
        icon="mdi-cog"
        variant="text"
        class="settings-button"
        data-testid="header-settings-btn"
        @click="emit('settings')"
        :aria-label="`${connectionName}の設定を開く`"
      ></v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import type { Environment, DatabaseType } from '@/stores/types';
import { THEME_COLORS } from '@/types/theme';
import EnvironmentBadge from './EnvironmentBadge.vue';

interface EnvironmentHeaderProps {
  environment: Environment;
  connectionId: string;
  connectionName: string;
  dbType: DatabaseType;
  host: string;
  database: string;
  port?: number | string;
  connected?: boolean;
}

const props = withDefaults(defineProps<EnvironmentHeaderProps>(), {
  connected: true,
});

const emit = defineEmits<{
  (event: 'settings'): void;
  (event: 'disconnect'): void;
}>();

const { currentThemeInfo } = useTheme();

const effectiveThemeInfo = computed(() => {
  if (currentThemeInfo.value.name === props.environment) {
    return currentThemeInfo.value;
  }
  return THEME_COLORS[props.environment];
});

const environmentIcon = computed(() => {
  const icons: Record<Environment, string> = {
    development: 'mdi-code-tags',
    test: 'mdi-test-tube',
    staging: 'mdi-server-network',
    production: 'mdi-database-alert',
  };
  return icons[props.environment];
});

const dbIcon = computed(() => {
  const icons: Record<DatabaseType, string> = {
    postgresql: 'mdi-elephant',
    mysql: 'mdi-dolphin',
    sqlite: 'mdi-database',
  };
  return icons[props.dbType];
});

const databaseTypeLabel = computed(() => {
  const labels: Record<DatabaseType, string> = {
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
  };
  return labels[props.dbType];
});

const connectionEndpoint = computed(() => {
  if (!props.host) {
    return 'ホスト未設定';
  }
  if (props.port) {
    return `${props.host}:${props.port}`;
  }
  return props.host;
});

const databaseLabel = computed(() => {
  return props.database || 'データベース未設定';
});

const connectionStatus = computed(() => (props.connected ? '接続中' : '切断'));

const connectionStatusIcon = computed(() =>
  props.connected ? 'mdi-check-circle' : 'mdi-close-circle-outline'
);

const connectionStatusColor = computed(() =>
  props.connected ? 'success' : 'error'
);
</script>

<style scoped>
.environment-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
  min-height: 48px;
}

.environment-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  min-width: 0;
}

.environment-avatar {
  border: 2px solid rgba(255, 255, 255, 0.35);
}

.environment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.environment-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.connection-name {
  font-size: 1.05rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-details {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.9rem;
  opacity: 0.9;
}

.separator {
  opacity: 0.5;
  margin: 0 4px;
}

.environment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-status {
  font-weight: 600;
  letter-spacing: 0.03em;
}

@media (max-width: 960px) {
  .environment-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .environment-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .environment-summary {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .environment-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .connection-name {
    font-size: 0.95rem;
  }

  .connection-details {
    font-size: 0.8rem;
  }

  .environment-avatar {
    width: 40px;
    height: 40px;
  }
}
</style>
