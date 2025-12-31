<script setup lang="ts">
import { computed } from 'vue'
import type { JoinClause } from '@/types/query-model'

interface Props {
  join: JoinClause
  x1: number
  y1: number
  x2: number
  y2: number
  isActive?: boolean
  isDimmed?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const strokeDasharray = computed(() => {
  switch (props.join.type) {
    case 'INNER':
      return undefined
    case 'LEFT':
    case 'RIGHT':
    case 'FULL':
      return '6,6'
    case 'CROSS':
      return '2,4'
    default:
      return undefined
  }
})

const strokeWidth = computed(() => (props.isActive ? 3 : 2))
const lineColor = computed(() =>
  props.join.type === 'CROSS' ? 'text-gray-400' : 'text-primary-500'
)

const midX = computed(() => (props.x1 + props.x2) / 2)
const midY = computed(() => (props.y1 + props.y2) / 2)

const labelText = computed(() => (props.join.type === 'FULL' ? 'FULL' : props.join.type))
</script>

<template>
  <g
    role="button"
    tabindex="0"
    class="pointer-events-auto transition-colors"
    :class="[
      lineColor,
      props.isDimmed ? 'opacity-40' : 'opacity-100',
      props.isActive ? 'drop-shadow-sm' : '',
    ]"
    @click.stop="emit('click')"
    @keydown.enter.prevent="emit('click')"
    @keydown.space.prevent="emit('click')"
  >
    <line
      :x1="props.x1"
      :y1="props.y1"
      :x2="props.x2"
      :y2="props.y2"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="strokeDasharray"
      class="cursor-pointer hover:text-primary-600"
    />

    <text
      :x="midX"
      :y="midY - 6"
      text-anchor="middle"
      class="text-[10px] font-medium fill-gray-700 dark:fill-gray-300 pointer-events-none select-none"
    >
      {{ labelText }}
    </text>
  </g>
</template>
