<template>
  <div class="mb-4">
    <v-row align="center" class="pa-4">
      <!-- 検索バー -->
      <v-col cols="12" sm="6" md="4" class="py-2">
        <v-text-field
          :model-value="search"
          @update:model-value="handleSearchChange"
          prepend-inner-icon="mdi-magnify"
          label="接続名、ホスト名、データベース名で検索"
          single-line
          hide-details
          clearable
          variant="outlined"
          density="comfortable"
          @click:clear="handleSearchClear"
        >
          <template v-slot:append-inner>
            <v-chip
              v-if="resultCount !== null"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ resultCount }} 件
            </v-chip>
          </template>
        </v-text-field>
      </v-col>

      <v-spacer></v-spacer>

      <!-- 環境フィルター -->
      <v-col cols="6" sm="auto" class="py-2">
        <v-select
          :model-value="filter"
          @update:model-value="$emit('update:filter', $event)"
          :items="environmentFilterOptions"
          label="環境"
          variant="outlined"
          density="comfortable"
          hide-details
          style="min-width: 180px"
        >
          <template v-slot:selection="{ item }">
            <div class="d-flex align-center">
              <v-icon
                v-if="item.value !== 'all'"
                :color="item.raw.color"
                size="small"
                class="mr-2"
              >
                {{ item.raw.icon }}
              </v-icon>
              <span>{{ item.title }}</span>
            </div>
          </template>

          <template v-slot:item="{ item, props }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <v-icon
                  v-if="item.value !== 'all'"
                  :color="item.raw.color"
                >
                  {{ item.raw.icon }}
                </v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>

      <!-- データベース種別フィルター -->
      <v-col cols="6" sm="auto" class="ml-sm-2 py-2">
        <v-select
          :model-value="dbTypeFilter"
          @update:model-value="$emit('update:dbTypeFilter', $event)"
          :items="dbTypeFilterOptions"
          label="データベース"
          variant="outlined"
          density="comfortable"
          hide-details
          style="min-width: 160px"
        >
          <template v-slot:selection="{ item }">
            <div class="d-flex align-center">
              <v-icon
                v-if="item.value !== 'all'"
                size="small"
                class="mr-2"
              >
                {{ item.raw.icon }}
              </v-icon>
              <span>{{ item.title }}</span>
            </div>
          </template>

          <template v-slot:item="{ item, props }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <v-icon v-if="item.value !== 'all'">
                  {{ item.raw.icon }}
                </v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>

      <!-- ソート -->
      <v-col cols="12" sm="auto" class="ml-sm-2 py-2">
        <v-select
          :model-value="sort"
          @update:model-value="$emit('update:sort', $event)"
          :items="sortOptions"
          label="並び順"
          variant="outlined"
          density="comfortable"
          hide-details
          style="min-width: 180px"
        >
          <template v-slot:selection="{ item }">
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-2">{{ item.raw.icon }}</v-icon>
              <span>{{ item.title }}</span>
            </div>
          </template>

          <template v-slot:item="{ item, props }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <v-icon>{{ item.raw.icon }}</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>

      <!-- フィルタークリアボタン -->
      <v-col v-if="hasActiveFilters" cols="auto" class="ml-2 py-2">
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="handleClearFilters"
        >
          <v-icon class="mr-1">mdi-filter-off</v-icon>
          クリア
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Environment, DatabaseType } from '@/stores/types';

const props = defineProps<{
  search: string;
  filter: Environment | 'all';
  dbTypeFilter: DatabaseType | 'all';
  sort: string;
  resultCount?: number;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:filter': [value: Environment | 'all'];
  'update:dbTypeFilter': [value: DatabaseType | 'all'];
  'update:sort': [value: string];
  'clear-filters': [];
}>();

// 環境フィルターオプション
const environmentFilterOptions = [
  { title: 'すべての環境', value: 'all' },
  {
    title: '開発環境',
    value: 'development',
    icon: 'mdi-laptop',
    color: '#4CAF50',
  },
  {
    title: 'テスト環境',
    value: 'test',
    icon: 'mdi-flask',
    color: '#2196F3',
  },
  {
    title: 'ステージング環境',
    value: 'staging',
    icon: 'mdi-server',
    color: '#FF9800',
  },
  {
    title: '本番環境',
    value: 'production',
    icon: 'mdi-alert-circle',
    color: '#F44336',
  },
];

// データベース種別フィルターオプション
const dbTypeFilterOptions = [
  { title: 'すべてのDB', value: 'all' },
  { title: 'PostgreSQL', value: 'postgresql', icon: 'mdi-elephant' },
  { title: 'MySQL', value: 'mysql', icon: 'mdi-dolphin' },
  { title: 'SQLite', value: 'sqlite', icon: 'mdi-database' },
];

// ソートオプション
const sortOptions = [
  { title: '最終使用日時順', value: 'lastUsed', icon: 'mdi-clock-outline' },
  { title: '接続名順', value: 'name', icon: 'mdi-sort-alphabetical-ascending' },
  { title: '環境順', value: 'environment', icon: 'mdi-server' },
  { title: '作成日時順', value: 'createdAt', icon: 'mdi-calendar' },
];

// アクティブなフィルターがあるかチェック
const hasActiveFilters = computed(() => {
  return (
    props.search ||
    props.filter !== 'all' ||
    props.dbTypeFilter !== 'all'
  );
});

// 検索変更ハンドラー (デバウンス)
let searchTimeout: number | null = null;
const handleSearchChange = (value: string | null) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = window.setTimeout(() => {
    emit('update:search', value || '');
  }, 300); // 300ms デバウンス
};

// 検索クリア
const handleSearchClear = () => {
  emit('update:search', '');
};

// フィルタークリア
const handleClearFilters = () => {
  emit('update:search', '');
  emit('update:filter', 'all');
  emit('update:dbTypeFilter', 'all');
  emit('clear-filters');
};
</script>

<style scoped>
/* ツールバーエリアに背景とボーダーを追加 */
div {
  background-color: rgb(var(--v-theme-surface));
  border-radius: 4px;
}
</style>
