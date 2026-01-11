<script setup lang="ts">
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const environmentFilter = defineModel<string | 'all'>('environmentFilter', { default: 'all' })
const { t } = useI18n()

const environmentOptions = computed(() => [
  { label: t('launcher.allEnvironments'), value: 'all' },
  { label: t('common.environment.development'), value: 'development' },
  { label: t('common.environment.test'), value: 'test' },
  { label: t('common.environment.staging'), value: 'staging' },
  { label: t('common.environment.production'), value: 'production' }
])

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
          :placeholder="t('launcher.searchPlaceholder')"
        >
          <template v-if="searchQuery" #trailing>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
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
        <span>{{ t('launcher.filterApplied') }}</span>
      </div>
      <UButton variant="ghost" color="neutral" size="sm" @click="resetFilters">
        {{ t('common.reset') }}
      </UButton>
    </div>
  </div>
</template>
