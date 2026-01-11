<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
  actionLabel?: string
  actionIcon?: string
}>()

const emit = defineEmits<{
  action: []
}>()

const handleAction = () => emit('action')
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <UIcon
      :name="icon || 'i-heroicons-inbox'"
      class="text-6xl text-gray-400 mb-4"
    />

    <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {{ title || '接続が見つかりませんでした' }}
    </h3>

    <p class="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
      {{ description || '新しい接続を追加するか、検索条件を変更してください。' }}
    </p>

    <UButton
      v-if="actionLabel"
      :icon="actionIcon || 'i-heroicons-plus'"
      color="primary"
      size="lg"
      @click="handleAction"
    >
      {{ actionLabel }}
    </UButton>

    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
  </div>
</template>
