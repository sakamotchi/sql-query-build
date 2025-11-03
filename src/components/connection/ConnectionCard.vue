<template>
  <v-card
    :class="['connection-card', `environment-${connection.environment}`]"
    :style="{ borderTopColor: environmentColor }"
    :aria-label="`${connection.name}への接続。${environmentLabel}。${databaseTypeLabel}。${connection.host}`"
    role="button"
    tabindex="0"
    elevation="2"
    hover
    @click="handleCardClick"
    @keydown.enter="handleCardClick"
    @keydown.space.prevent="handleCardClick"
  >
    <!-- 環境色バー -->
    <div class="environment-bar" :style="{ backgroundColor: environmentColor }"></div>

    <v-card-title class="d-flex align-center">
      <!-- 環境アイコン -->
      <v-icon :color="environmentColor" size="small" class="mr-2">
        {{ environmentIcon }}
      </v-icon>

      <!-- 接続名 -->
      <span class="text-h6">{{ connection.name }}</span>

      <v-spacer></v-spacer>

      <!-- メニューボタン -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-dots-vertical"
            size="small"
            variant="text"
            v-bind="props"
            @click.stop
          ></v-btn>
        </template>

        <v-list>
          <v-list-item @click="$emit('edit', connection)">
            <template v-slot:prepend>
              <v-icon>mdi-pencil</v-icon>
            </template>
            <v-list-item-title>編集</v-list-item-title>
          </v-list-item>

          <v-list-item @click="$emit('duplicate', connection)">
            <template v-slot:prepend>
              <v-icon>mdi-content-copy</v-icon>
            </template>
            <v-list-item-title>複製</v-list-item-title>
          </v-list-item>

          <v-divider></v-divider>

          <v-list-item @click="$emit('delete', connection)" class="text-error">
            <template v-slot:prepend>
              <v-icon color="error">mdi-delete</v-icon>
            </template>
            <v-list-item-title>削除</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>

    <v-card-subtitle>
      <v-chip
        :color="environmentColor"
        size="small"
        variant="tonal"
      >
        {{ environmentLabel }}
      </v-chip>
    </v-card-subtitle>

    <v-card-text>
      <!-- データベース情報 -->
      <div class="connection-info">
        <div class="info-row">
          <v-icon size="small" class="mr-2">{{ databaseIcon }}</v-icon>
          <span class="text-body-2">{{ databaseTypeLabel }}</span>
          <v-chip v-if="connection.ssl" size="x-small" color="success" class="ml-2">
            SSL
          </v-chip>
        </div>

        <div class="info-row">
          <v-icon size="small" class="mr-2">mdi-server</v-icon>
          <span class="text-body-2">{{ connection.host }}:{{ connection.port }}</span>
        </div>

        <div class="info-row">
          <v-icon size="small" class="mr-2">mdi-database</v-icon>
          <span class="text-body-2">{{ connection.database }}</span>
        </div>

        <div class="info-row">
          <v-icon size="small" class="mr-2">mdi-account</v-icon>
          <span class="text-body-2">{{ connection.username }}</span>
        </div>
      </div>

      <v-divider class="my-3"></v-divider>

      <!-- 最終使用日時 -->
      <div class="text-caption text-grey">
        <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
        {{ lastUsedText }}
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-database-arrow-right"
        @click.stop="$emit('select', connection)"
        block
      >
        接続
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Connection, Environment, DatabaseType } from '@/types/connection';

const props = defineProps<{
  connection: Connection;
}>();

const emit = defineEmits<{
  select: [connection: Connection];
  edit: [connection: Connection];
  delete: [connection: Connection];
  duplicate: [connection: Connection];
}>();

// 環境別の色定義
const environmentColors: Record<Environment, string> = {
  development: '#4CAF50',  // 緑
  test: '#2196F3',         // 青
  staging: '#FF9800',      // オレンジ
  production: '#F44336',   // 赤
};

// 環境別のラベル
const environmentLabels: Record<Environment, string> = {
  development: '開発環境',
  test: 'テスト環境',
  staging: 'ステージング環境',
  production: '本番環境',
};

// 環境別のアイコン
const environmentIcons: Record<Environment, string> = {
  development: 'mdi-laptop',
  test: 'mdi-flask',
  staging: 'mdi-server',
  production: 'mdi-alert-circle',
};

// データベース種別のアイコン
const databaseIcons: Record<DatabaseType, string> = {
  postgresql: 'mdi-elephant',
  mysql: 'mdi-dolphin',
  sqlite: 'mdi-database',
};

// データベース種別のラベル
const databaseTypeLabels: Record<DatabaseType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
};

// 計算プロパティ
const environmentColor = computed(() =>
  environmentColors[props.connection.environment]
);

const environmentLabel = computed(() =>
  environmentLabels[props.connection.environment]
);

const environmentIcon = computed(() =>
  environmentIcons[props.connection.environment]
);

const databaseIcon = computed(() =>
  databaseIcons[props.connection.dbType]
);

const databaseTypeLabel = computed(() =>
  databaseTypeLabels[props.connection.dbType]
);

const lastUsedText = computed(() => {
  if (!props.connection.lastUsedAt) {
    return '未使用';
  }

  const lastUsed = new Date(props.connection.lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastUsed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return lastUsed.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});

// カードクリック時の処理 (カード全体をクリック可能に)
const handleCardClick = () => {
  emit('select', props.connection);
};
</script>

<style scoped lang="scss">
.connection-card {
  position: relative;
  border-top: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 280px;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
  }

  &:focus {
    outline: 2px solid #1976D2;
    outline-offset: 2px;
  }

  &.environment-production {
    .v-card-title {
      font-weight: 600;
    }
  }
}

.environment-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 4px 4px 0 0;
}

.connection-info {
  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .v-icon {
      opacity: 0.7;
    }
  }
}

// 環境別のカードスタイル
.environment-development {
  .v-card-title {
    color: #2E7D32;
  }
}

.environment-test {
  .v-card-title {
    color: #1565C0;
  }
}

.environment-staging {
  .v-card-title {
    color: #E65100;
  }
}

.environment-production {
  .v-card-title {
    color: #C62828;
  }

  border: 2px solid rgba(244, 67, 54, 0.3);

  &:hover {
    border-color: rgba(244, 67, 54, 0.6);
  }
}

// レスポンシブデザイン
@media (max-width: 599px) {
  .connection-card {
    .v-card-title {
      font-size: 1rem;
    }
  }
}
</style>
