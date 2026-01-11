<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import QueryBuilderLayout from '@/components/query-builder/QueryBuilderLayout.vue'
import { windowApi } from '@/api/window'
import { useTauri } from '@/composables/useTauri'

const { t, locale } = useI18n()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const { activeConnection } = storeToRefs(connectionStore)
const { currentConnectionId, currentWindowLabel } = storeToRefs(windowStore)
const { isAvailable } = useTauri()

const pageTitle = ref('')

useHead({
  title: pageTitle
})

const resolvedConnection = computed(() => {
  if (activeConnection.value) {
    return activeConnection.value
  }
  if (!currentConnectionId.value) {
    return null
  }
  return connectionStore.getConnectionById(currentConnectionId.value) || null
})

const syncWindowTitle = async () => {
  if (!isAvailable.value || !currentWindowLabel.value || !pageTitle.value) {
    return
  }

  try {
    await windowApi.setWindowTitle(currentWindowLabel.value, pageTitle.value)
  } catch (error) {
    console.warn('[QueryBuilder] Failed to set window title:', error)
  }
}

watch(
  [() => locale.value, () => resolvedConnection.value, () => currentWindowLabel.value],
  () => {
    if (resolvedConnection.value) {
      const envKey = `settings.safety.env.${resolvedConnection.value.environment}.label`
      const envLabel = t(envKey)
      pageTitle.value = `${resolvedConnection.value.name} [${envLabel}] - ${t('queryBuilder.pageTitle')}`
    } else {
      pageTitle.value = t('queryBuilder.pageTitle')
    }

    void syncWindowTitle()
  },
  { immediate: true }
)

// ページメタデータ
definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <QueryBuilderLayout />
  </div>
</template>
