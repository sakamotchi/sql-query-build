<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TreeNode } from '~/types/sql-editor'

defineOptions({
  name: 'TreeNodeItem',
})

const props = defineProps<{
  node: TreeNode
  level: number
  currentQueryId?: string | null
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

const isDropTarget = ref(false)

const isActiveQuery = computed(
  () => props.node.type === 'query' && props.currentQueryId === props.node.path
)

const handleDragStart = (event: DragEvent) => {
  if (props.node.type !== 'query') return
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({ queryId: props.node.path })
  )
}

const handleDragOver = (event: DragEvent) => {
  if (props.node.type !== 'folder') return
  event.preventDefault()
  event.stopPropagation()
  isDropTarget.value = true
}

const handleDragLeave = () => {
  isDropTarget.value = false
}

const handleDrop = (event: DragEvent) => {
  if (props.node.type !== 'folder') return
  event.preventDefault()
  event.stopPropagation()
  isDropTarget.value = false

  try {
    const data = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    if (data.queryId) {
      emit('move-query', { queryId: data.queryId, targetPath: props.node.path })
    }
  } catch (error) {
    console.error('Failed to parse drop data:', error)
  }
}

const openFolderMenu = (event: MouseEvent) => {
  emit('open-context-menu', {
    type: 'folder',
    node: props.node,
    x: event.clientX,
    y: event.clientY,
  })
}

const openQueryMenu = (event: MouseEvent) => {
  emit('open-context-menu', {
    type: 'query',
    node: props.node,
    x: event.clientX,
    y: event.clientY,
  })
}

const handleTagClick = (tag: string) => {
  emit('toggle-tag', tag)
}
</script>

<template>
  <div class="tree-node-item">
    <div
      v-if="props.node.type === 'folder'"
      class="flex flex-col"
      :style="{ paddingLeft: `${props.level * 12}px` }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div
        class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': isDropTarget }"
        @click="emit('toggle-folder', props.node.path)"
        @contextmenu.prevent="openFolderMenu"
      >
        <UIcon
          :name="props.node.expanded ? 'i-heroicons-folder-open' : 'i-heroicons-folder'"
          class="w-4 h-4 text-gray-500"
        />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ props.node.name }}
        </span>
        <UBadge
          v-if="props.node.queryCount"
          size="xs"
          color="neutral"
          variant="soft"
        >
          {{ props.node.queryCount }}
        </UBadge>
      </div>

      <div v-if="props.node.expanded && props.node.children" class="space-y-1">
        <TreeNodeItem
          v-for="child in props.node.children"
          :key="child.path"
          :node="child"
          :level="props.level + 1"
          :current-query-id="props.currentQueryId"
          v-bind="$attrs"
        />
      </div>
    </div>

    <div
      v-else
      class="query-node"
      :style="{ paddingLeft: `${props.level * 12}px` }"
      draggable="true"
      @dragstart="handleDragStart"
      @contextmenu.prevent="openQueryMenu"
    >
      <div
        class="group rounded-lg border border-gray-200 dark:border-gray-800 p-2 hover:border-primary-300 transition"
        :class="{
          'border-primary-400 bg-primary-50/40 dark:bg-primary-500/10': isActiveQuery,
        }"
        @dblclick="emit('execute-query', props.node.path)"
      >
        <button
          type="button"
          class="flex items-start gap-2 w-full text-left"
          @click="emit('load-query', props.node.path)"
        >
          <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-gray-400 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {{ props.node.name }}
            </p>
            <p
              v-if="props.node.query?.description"
              class="text-xs text-gray-500 line-clamp-1 mt-0.5"
            >
              {{ props.node.query.description }}
            </p>
            <div v-if="props.node.query?.tags.length" class="flex flex-wrap gap-1 mt-1">
              <UBadge
                v-for="tag in props.node.query.tags"
                :key="tag"
                size="xs"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click.stop="handleTagClick(tag)"
              >
                {{ tag }}
              </UBadge>
            </div>
          </div>
        </button>

        <div class="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
          <UButton
            icon="i-heroicons-play"
            size="xs"
            variant="ghost"
            color="primary"
            @click.stop="emit('execute-query', props.node.path)"
          />
          <UButton
            icon="i-heroicons-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click.stop="emit('edit-query', props.node.path)"
          />
          <UButton
            icon="i-heroicons-trash"
            size="xs"
            variant="ghost"
            color="error"
            @click.stop="emit('delete-query', props.node.path)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
