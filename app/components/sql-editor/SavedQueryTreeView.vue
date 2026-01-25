<script setup lang="ts">
import type { TreeNode } from '~/types/sql-editor'
import TreeNodeItem from './TreeNodeItem.vue'

const props = defineProps<{
  tree: TreeNode[]
  currentQueryId?: string | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'load-query', id: string): void
  (e: 'execute-query', id: string): void
  (e: 'edit-query', id: string): void
  (e: 'delete-query', id: string): void
  (e: 'move-query', queryId: string, targetPath: string | null): void
  (e: 'toggle-folder', path: string): void
  (e: 'open-context-menu', payload: { type: 'folder' | 'query'; node: TreeNode; x: number; y: number }): void
  (e: 'toggle-tag', tag: string): void
}>()

const handleRootDrop = (event: DragEvent) => {
  event.preventDefault()

  const data = event.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const payload = JSON.parse(data) as { queryId?: string }
    if (payload.queryId) {
      emit('move-query', payload.queryId, null)
    }
  } catch (error) {
    console.error('Failed to parse drop data:', error)
  }
}
</script>

<template>
  <div class="tree-view">
    <div v-if="props.isLoading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <div v-else-if="props.tree.length === 0" class="text-center py-8 text-gray-500">
      保存されたクエリがありません
    </div>

    <div
      v-else
      class="p-2"
      @dragover.prevent
      @drop="handleRootDrop"
    >
      <TreeNodeItem
        v-for="node in props.tree"
        :key="node.path"
        :node="node"
        :level="0"
        :current-query-id="props.currentQueryId"
        @load-query="emit('load-query', $event)"
        @execute-query="emit('execute-query', $event)"
        @edit-query="emit('edit-query', $event)"
        @delete-query="emit('delete-query', $event)"
        @move-query="emit('move-query', $event.queryId, $event.targetPath)"
        @toggle-folder="emit('toggle-folder', $event)"
        @open-context-menu="emit('open-context-menu', $event)"
        @toggle-tag="emit('toggle-tag', $event)"
      />
    </div>
  </div>
</template>
