<script setup lang="ts">
const props = defineProps<{
  password: string
  strength: number
}>()

const normalizedStrength = computed(() => Math.max(0, Math.min(5, props.strength)))

const strengthMeta = computed(() => {
  const value = normalizedStrength.value
  if (value >= 4) {
    return { label: '強い', barClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' }
  }
  if (value >= 3) {
    return { label: '中程度', barClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' }
  }
  return { label: '弱い', barClass: 'bg-rose-500', textClass: 'text-rose-600 dark:text-rose-400' }
})

const bars = computed(() => Array.from({ length: 5 }, (_, index) => index < normalizedStrength.value))
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-1">
      <div
        v-for="(active, index) in bars"
        :key="index"
        class="flex-1 h-2 rounded-full transition-colors"
        :class="active ? strengthMeta.barClass : 'bg-gray-200 dark:bg-gray-700'"
      />
    </div>
    <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
      <span :class="strengthMeta.textClass">
        強度: {{ strengthMeta.label }}
      </span>
      <span>{{ password.length }} 文字</span>
    </div>
  </div>
</template>
