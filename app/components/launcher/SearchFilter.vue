<script setup lang="ts">
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const environmentFilter = defineModel<string | 'all'>('environmentFilter', { default: 'all' })

const environmentOptions = [
  { label: 'すべての環境', value: 'all' },
  { label: '開発環境', value: 'development' },
  { label: 'テスト環境', value: 'test' },
  { label: 'ステージング環境', value: 'staging' },
  { label: '本番環境', value: 'production' }
]

const clearSearch = () => {
  searchQuery.value = ''
}

const resetFilters = () => {
  searchQuery.value = ''
  environmentFilter.value = 'all'
}

const hasActiveFilters = computed(() => searchQuery.value !== '' || environmentFilter.value !== 'all')
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="relative">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          size="lg"
          placeholder="接続名、ホスト、データベース名で検索..."
        >
          <template v-if="searchQuery" #trailing>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              size="xs"
              @click="clearSearch"
            />
          </template>
        </UInput>
      </div>

      <USelect
        v-model="environmentFilter"
        :items="environmentOptions"
        size="lg"
        icon="i-heroicons-funnel"
      />
    </div>

    <div v-if="hasActiveFilters" class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <UIcon name="i-heroicons-funnel" />
        <span>フィルター適用中</span>
      </div>
      <UButton variant="ghost" color="gray" size="sm" @click="resetFilters">
        リセット
      </UButton>
    </div>
  </div>
</template>
