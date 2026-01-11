<script setup lang="ts">
const { t } = useI18n()

const emit = defineEmits<{
  newConnection: []
  refresh: []
  toggleView: []
  openSettings: []
}>()

const viewMode = ref<'grid' | 'list'>('grid')

const handleNewConnection = () => emit('newConnection')
const handleRefresh = () => emit('refresh')
const handleToggleView = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
  emit('toggleView')
}
const handleOpenSettings = () => emit('openSettings')
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('launcher.title') }}
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        <slot name="stats" />
      </p>
    </div>

    <div class="flex gap-2">
      <UButton
        icon="i-heroicons-cog-6-tooth"
        variant="outline"
        color="neutral"
        @click="handleOpenSettings"
      >
        {{ t('common.settings') }}
      </UButton>

      <UButton
        :icon="viewMode === 'grid' ? 'i-heroicons-list-bullet' : 'i-heroicons-squares-2x2'"
        variant="outline"
        color="neutral"
        @click="handleToggleView"
      >
        {{ viewMode === 'grid' ? t('common.list') : t('common.grid') }}
      </UButton>

      <UButton
        icon="i-heroicons-arrow-path"
        variant="outline"
        color="neutral"
        @click="handleRefresh"
      >
        {{ t('common.refresh') }}
      </UButton>

      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="lg"
        @click="handleNewConnection"
      >
        {{ t('launcher.newConnection') }}
      </UButton>
    </div>
  </div>
</template>
