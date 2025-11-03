<template>
  <v-toolbar flat class="mb-4">
    <v-text-field
      :model-value="search"
      @update:model-value="$emit('update:search', $event)"
      prepend-inner-icon="mdi-magnify"
      label="接続名で検索"
      single-line
      hide-details
      clearable
      variant="outlined"
      density="compact"
      style="max-width: 400px"
    ></v-text-field>

    <v-spacer></v-spacer>

    <v-select
      :model-value="filter"
      @update:model-value="$emit('update:filter', $event)"
      :items="environmentFilterOptions"
      label="環境フィルター"
      variant="outlined"
      density="compact"
      hide-details
      style="max-width: 200px"
      class="mr-4"
    ></v-select>

    <v-select
      :model-value="sort"
      @update:model-value="$emit('update:sort', $event)"
      :items="sortOptions"
      label="並び順"
      variant="outlined"
      density="compact"
      hide-details
      style="max-width: 200px"
    ></v-select>
  </v-toolbar>
</template>

<script setup lang="ts">
defineProps<{
  search: string
  filter: string
  sort: string
}>()

defineEmits<{
  'update:search': [value: string]
  'update:filter': [value: string]
  'update:sort': [value: string]
}>()

const environmentFilterOptions = [
  { title: 'すべて', value: 'all' },
  { title: '開発環境', value: 'development' },
  { title: 'テスト環境', value: 'test' },
  { title: 'ステージング環境', value: 'staging' },
  { title: '本番環境', value: 'production' }
]

const sortOptions = [
  { title: '接続名順', value: 'name' },
  { title: '最終使用日時順', value: 'lastUsed' },
  { title: '環境順', value: 'environment' }
]
</script>
