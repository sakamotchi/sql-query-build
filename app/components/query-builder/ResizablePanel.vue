<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    /** リサイズ方向 (left, right, top, bottom) */
    direction: 'left' | 'right' | 'top' | 'bottom'
    /** 初期サイズ */
    initialSize: number
    /** 最小サイズ */
    minSize?: number
    /** 最大サイズ */
    maxSize?: number
  }>(),
  {
    minSize: 100,
    maxSize: undefined,
  }
)

const emit = defineEmits<{
  (e: 'resize', size: number): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const size = ref(props.initialSize)
const isResizing = ref(false)
const isHovering = ref(false)

const isHorizontal = computed(() =>
  props.direction === 'left' || props.direction === 'right'
)

const panelStyle = computed(() => ({
  [isHorizontal.value ? 'width' : 'height']: `${size.value}px`,
}))

/**
 * リサイズ開始
 */
const startResize = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = isHorizontal.value ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

/**
 * リサイズ処理
 */
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value || !panelRef.value) return

  const rect = panelRef.value.getBoundingClientRect()
  let newSize: number

  switch (props.direction) {
    case 'right':
      newSize = e.clientX - rect.left
      break
    case 'left':
      newSize = rect.right - e.clientX
      break
    case 'bottom':
      newSize = e.clientY - rect.top
      break
    case 'top':
      newSize = rect.bottom - e.clientY
      break
  }

  // サイズ制約を適用
  newSize = Math.max(props.minSize, newSize)
  if (props.maxSize) {
    newSize = Math.min(props.maxSize, newSize)
  }

  size.value = newSize
  emit('resize', newSize)
}

/**
 * リサイズ終了
 */
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  if (isResizing.value) {
    stopResize()
  }
})
</script>

<template>
  <div
    ref="panelRef"
    class="relative flex"
    :style="panelStyle"
  >
    <div class="flex-1 overflow-auto">
      <slot />
    </div>
    <div
      class="absolute bg-transparent z-10 transition-colors duration-200"
      :class="[
        isResizing || isHovering ? 'bg-primary-500' : '',
        direction === 'right' ? 'top-0 right-0 w-1 h-full cursor-col-resize' : '',
        direction === 'left' ? 'top-0 left-0 w-1 h-full cursor-col-resize' : '',
        direction === 'top' ? 'top-0 left-0 w-full h-1 cursor-row-resize' : '',
        direction === 'bottom' ? 'bottom-0 left-0 w-full h-1 cursor-row-resize' : ''
      ]"
      @mousedown="startResize"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    />
  </div>
</template>
