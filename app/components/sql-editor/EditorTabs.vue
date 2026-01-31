<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

const sqlEditorStore = useSqlEditorStore()
const { tabs, activeTabId } = storeToRefs(sqlEditorStore)
const { t } = useI18n()
const toast = useToast()

const closingTabId = ref<string | null>(null)
const isConfirmOpen = computed({
  get: () => closingTabId.value !== null,
  set: (value) => {
    if (!value) {
      closingTabId.value = null
    }
  },
})

const handleSwitchTab = (tabId: string) => {
  sqlEditorStore.switchTab(tabId)
}

const handleAddTab = () => {
  sqlEditorStore.addTab()
}

const requestCloseTab = (tabId: string) => {
  const tab = tabs.value.find((target) => target.id === tabId)
  if (!tab) return

  if (tab.isDirty) {
    closingTabId.value = tabId
    return
  }

  sqlEditorStore.closeTab(tabId)
}

const handleDiscardClose = () => {
  if (!closingTabId.value) return
  sqlEditorStore.closeTab(closingTabId.value)
  closingTabId.value = null
}

const handleCancelClose = () => {
  closingTabId.value = null
}

const handleSaveClose = async () => {
  if (!closingTabId.value) return
  const targetTabId = closingTabId.value

  closingTabId.value = null

  if (sqlEditorStore.activeTabId !== targetTabId) {
    sqlEditorStore.switchTab(targetTabId)
  }

  if (sqlEditorStore.currentQuery) {
    try {
      await sqlEditorStore.saveActiveTabWithoutDialog()
      sqlEditorStore.closeTab(targetTabId)
    } catch (error) {
      toast.add({
        title: t('sqlEditor.tabs.toasts.saveFailed'),
        description: t('sqlEditor.tabs.toasts.saveFailedDesc'),
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
    return
  }

  sqlEditorStore.setPendingCloseTab(targetTabId)
  sqlEditorStore.openSaveDialog()
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="flex items-center gap-2 rounded-md border px-2 py-1 text-sm min-w-[6rem] max-w-[14rem] cursor-pointer transition"
        :class="tab.id === activeTabId
          ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-600 dark:bg-primary-500/20 dark:text-primary-100'
          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60'"
        @click="handleSwitchTab(tab.id)"
      >
        <span class="flex-1 truncate">
          <span v-if="tab.isDirty" class="mr-1">*</span>
          {{ tab.name }}
        </span>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          :aria-label="$t('sqlEditor.tabs.closeTabAria')"
          @click.stop="requestCloseTab(tab.id)"
        >
          <UIcon name="i-heroicons-x-mark" class="text-xs" />
        </button>
      </div>

      <UButton
        icon="i-heroicons-plus"
        :label="$t('sqlEditor.tabs.newTab')"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="handleAddTab"
      />
    </div>

    <UModal
      v-model:open="isConfirmOpen"
      :title="$t('sqlEditor.tabs.confirm.title')"
      :description="$t('sqlEditor.tabs.confirm.description')"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="handleCancelClose">
            {{ $t('sqlEditor.tabs.confirm.actions.cancel') }}
          </UButton>
          <UButton variant="soft" color="warning" @click="handleDiscardClose">
            {{ $t('sqlEditor.tabs.confirm.actions.discard') }}
          </UButton>
          <UButton color="primary" @click="handleSaveClose">
            {{ $t('sqlEditor.tabs.confirm.actions.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
