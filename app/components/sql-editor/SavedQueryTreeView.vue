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
  (e: 'move-query', event: { queryId: string; targetPath: string | null }): void
  (e: 'toggle-folder', path: string): void
  (e: 'open-context-menu', payload: { type: 'folder' | 'query'; node: TreeNode; x: number; y: number }): void
  (e: 'toggle-tag', tag: string): void
}>()

// カスタムマウスイベントベースのドラッグ&ドロップに変更したため削除
</script>

<template>
  <div class="tree-view">
    <div v-if="props.isLoading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <div v-else-if="props.tree.length === 0" class="text-center py-8 text-gray-500">
      {{ $t('sqlEditor.savedPanel.empty') }}
    </div>

    <div
      v-else
      class="p-2"
      data-folder-path=""
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
        @move-query="emit('move-query', $event)"
        @toggle-folder="emit('toggle-folder', $event)"
        @open-context-menu="emit('open-context-menu', $event)"
        @toggle-tag="emit('toggle-tag', $event)"
      />
    </div>
  </div>
</template>
