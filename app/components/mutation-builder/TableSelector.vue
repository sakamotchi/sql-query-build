<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

interface TableOption {
  id: string
  label: string
  schema: string
  table: string
  value: string
}

const databaseStructureStore = useDatabaseStructureStore()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()
const mutationStore = useMutationBuilderStore()

const connectionId = computed(() =>
  connectionStore.activeConnection?.id || windowStore.currentConnectionId
)

const databaseStructure = computed(() => {
  if (!connectionId.value) return null
  return databaseStructureStore.getStructure(connectionId.value)
})

const isLoading = computed(() => {
  if (!connectionId.value) return false
  return databaseStructureStore.isLoading(connectionId.value)
})

const error = computed(() => {
  if (!connectionId.value) return null
  return databaseStructureStore.getError(connectionId.value)
})

const tableOptions = computed<TableOption[]>(() => {
  if (!databaseStructure.value) return []

  const options: TableOption[] = []
  databaseStructure.value.schemas
    .filter((schema) => !schema.isSystem)
    .forEach((schema) => {
      schema.tables.forEach((table) => {
        const label = `${schema.name}.${table.name}`
        options.push({
          id: label,
          label,
          schema: schema.name,
          table: table.name,
          value: label,
        })
      })
    })

  return options.sort((a, b) => a.label.localeCompare(b.label))
})

const selectedOption = computed({
  get: () => tableOptions.value.find((opt) => opt.value === mutationStore.selectedTable),
  set: (option?: TableOption) => {
    mutationStore.setSelectedTable(option ? option.value : null)
  },
})

const loadStructure = async () => {
  if (!connectionId.value) return
  if (databaseStructure.value) return

  try {
    await databaseStructureStore.fetchDatabaseStructure(connectionId.value)
  } catch (loadError) {
    console.error('[TableSelector] Failed to load database structure:', loadError)
  }
}

const refreshStructure = async () => {
  if (!connectionId.value) return

  try {
    await databaseStructureStore.refreshDatabaseStructure(connectionId.value)
  } catch (loadError) {
    console.error('[TableSelector] Failed to refresh database structure:', loadError)
  }
}

watch(connectionId, () => {
  loadStructure()
})

onMounted(() => {
  loadStructure()
})
</script>

<template>
  <div class="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-200">テーブル</span>
      <USelectMenu
        v-model="selectedOption"
        :items="tableOptions"
        by="id"
        option-attribute="label"
        :search-attributes="['label', 'schema', 'table']"
        placeholder="テーブルを選択"
        searchable
        clearable
        :loading="isLoading"
        :disabled="!connectionId"
        class="min-w-[260px] flex-1"
      />
      <UButton
        icon="i-heroicons-arrow-path"
        size="xs"
        color="gray"
        variant="ghost"
        title="更新"
        :disabled="!connectionId"
        @click="refreshStructure"
      />
    </div>

    <p v-if="!connectionId" class="text-xs text-gray-500 mt-2">
      接続が選択されていません
    </p>
    <p v-else-if="error" class="text-xs text-red-600 mt-2">
      {{ error }}
    </p>
  </div>
</template>
