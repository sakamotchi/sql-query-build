<template>
  <div v-if="hasActiveFilters" class="active-filters mb-4">
    <v-chip-group>
      <span class="text-caption text-grey-darken-1 mr-2">フィルター:</span>

      <!-- 検索クエリ -->
      <v-chip
        v-if="filter.searchQuery"
        closable
        size="small"
        color="primary"
        variant="tonal"
        @click:close="clearSearch"
      >
        <v-icon start>mdi-magnify</v-icon>
        "{{ filter.searchQuery }}"
      </v-chip>

      <!-- 環境フィルター -->
      <v-chip
        v-if="filter.environment && filter.environment !== 'all'"
        closable
        size="small"
        :color="getEnvironmentColor(filter.environment as Environment)"
        variant="tonal"
        @click:close="clearEnvironment"
      >
        <v-icon start>{{ getEnvironmentIcon(filter.environment as Environment) }}</v-icon>
        {{ getEnvironmentLabel(filter.environment as Environment) }}
      </v-chip>

      <!-- DB種別フィルター -->
      <v-chip
        v-if="filter.dbType && filter.dbType !== 'all'"
        closable
        size="small"
        color="blue-grey"
        variant="tonal"
        @click:close="clearDbType"
      >
        <v-icon start>{{ getDbTypeIcon(filter.dbType as DatabaseType) }}</v-icon>
        {{ getDbTypeLabel(filter.dbType as DatabaseType) }}
      </v-chip>
    </v-chip-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useConnectionStore } from '@/stores/connection';
import { storeToRefs } from 'pinia';
import type { Environment, DatabaseType } from '@/stores/types';

const connectionStore = useConnectionStore();
const { filter } = storeToRefs(connectionStore);

const hasActiveFilters = computed(() => {
  return (
    filter.value.searchQuery ||
    filter.value.environment !== 'all' ||
    filter.value.dbType !== 'all'
  );
});

const clearSearch = () => {
  connectionStore.setFilter({ searchQuery: '' });
};

const clearEnvironment = () => {
  connectionStore.setFilter({ environment: 'all' });
};

const clearDbType = () => {
  connectionStore.setFilter({ dbType: 'all' });
};

// ヘルパー関数: 環境のアイコンを取得
const getEnvironmentIcon = (env: Environment) => {
  const icons: Record<Environment, string> = {
    development: 'mdi-laptop',
    test: 'mdi-flask',
    staging: 'mdi-server',
    production: 'mdi-alert-circle',
  };
  return icons[env];
};

// ヘルパー関数: 環境のラベルを取得
const getEnvironmentLabel = (env: Environment) => {
  const labels: Record<Environment, string> = {
    development: '開発環境',
    test: 'テスト環境',
    staging: 'ステージング環境',
    production: '本番環境',
  };
  return labels[env];
};

// ヘルパー関数: 環境の色を取得
const getEnvironmentColor = (env: Environment) => {
  const colors: Record<Environment, string> = {
    development: 'green',
    test: 'blue',
    staging: 'orange',
    production: 'red',
  };
  return colors[env];
};

// ヘルパー関数: DB種別のアイコンを取得
const getDbTypeIcon = (dbType: DatabaseType) => {
  const icons: Record<DatabaseType, string> = {
    postgresql: 'mdi-elephant',
    mysql: 'mdi-dolphin',
    sqlite: 'mdi-database',
  };
  return icons[dbType];
};

// ヘルパー関数: DB種別のラベルを取得
const getDbTypeLabel = (dbType: DatabaseType) => {
  const labels: Record<DatabaseType, string> = {
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
  };
  return labels[dbType];
};
</script>

<style scoped>
.active-filters {
  display: flex;
  align-items: center;
}
</style>
