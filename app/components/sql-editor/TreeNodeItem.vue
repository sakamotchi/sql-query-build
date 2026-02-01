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

const isDragging = ref(false)
let ghostElement: HTMLElement | null = null
let draggedQueryId: string | null = null

const isActiveQuery = computed(
  () => props.node.type === 'query' && props.currentQueryId === props.node.path
)

const handleQueryMouseDown = (event: MouseEvent) => {
  if (props.node.type !== 'query') return
  if (event.button !== 0) return // 左クリックのみ

  isDragging.value = true
  draggedQueryId = props.node.path

  // ゴースト要素を作成
  const ghost = document.createElement('div')
  ghost.textContent = props.node.name
  ghost.style.position = 'fixed'
  ghost.style.top = `${event.clientY}px`
  ghost.style.left = `${event.clientX}px`
  ghost.style.padding = '8px 12px'
  ghost.style.background = 'white'
  ghost.style.border = '1px solid #ccc'
  ghost.style.borderRadius = '4px'
  ghost.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  ghost.style.zIndex = '9999'
  ghost.style.pointerEvents = 'none' // マウスイベントを透過
  ghost.style.opacity = '0.9'
  ghost.style.transform = 'translate(-50%, -50%)'
  ghost.style.fontSize = '14px'

  if (document.documentElement.classList.contains('dark')) {
    ghost.style.background = '#1f2937'
    ghost.style.borderColor = '#374151'
    ghost.style.color = '#fff'
  }

  document.body.appendChild(ghost)
  ghostElement = ghost

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  event.preventDefault()
}

const handleMouseMove = (event: MouseEvent) => {
  if (ghostElement) {
    ghostElement.style.top = `${event.clientY}px`
    ghostElement.style.left = `${event.clientX}px`
  }
}

const handleMouseUp = (event: MouseEvent) => {
  if (ghostElement) {
    document.body.removeChild(ghostElement)
    ghostElement = null
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  isDragging.value = false

  // ドロップ先のフォルダを探す
  const element = document.elementFromPoint(event.clientX, event.clientY)
  if (element && draggedQueryId) {
    const folderElement = element.closest('[data-folder-path]') as HTMLElement
    if (folderElement) {
      const targetPath = folderElement.dataset.folderPath ?? ''
      emit('move-query', { queryId: draggedQueryId as string, targetPath: targetPath === '' ? null : targetPath })
    }
  }

  draggedQueryId = null
}

const handleFolderMouseEnter = () => {
  if (props.node.type !== 'folder' || !isDragging.value) return
  isDropTarget.value = true
}

const handleFolderMouseLeave = () => {
  if (props.node.type !== 'folder') return
  isDropTarget.value = false
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
      :data-folder-path="props.node.path"
      @mouseenter="handleFolderMouseEnter"
      @mouseleave="handleFolderMouseLeave"
    >
      <div
        class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': isDropTarget }"
        @click="emit('toggle-folder', props.node.path)"
        @contextmenu.prevent="openFolderMenu"
      >
        <UIcon
          :name="props.node.expanded ? 'i-heroicons-folder-open' : 'i-heroicons-folder'"
          class="w-4 h-4 text-gray-500 pointer-events-none"
        />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 pointer-events-none">
          {{ props.node.name }}
        </span>
        <UBadge
          v-if="props.node.queryCount"
          size="xs"
          color="neutral"
          variant="soft"
          class="pointer-events-none"
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

    <div
      v-else
      class="query-node"
      :class="{ 'opacity-50': isDragging }"
      :style="{ paddingLeft: `${props.level * 12}px` }"
      @contextmenu.prevent="openQueryMenu"
    >
      <div
        class="group rounded-lg border border-gray-200 dark:border-gray-800 p-2 hover:border-primary-300 transition cursor-grab active:cursor-grabbing"
        :class="{
          'border-primary-400 bg-primary-50/40 dark:bg-primary-500/10': isActiveQuery,
        }"
        @mousedown="handleQueryMouseDown"
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
