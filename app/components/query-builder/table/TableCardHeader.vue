<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  tableName: string
  alias: string
  isExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'update-alias', alias: string): void
  (e: 'toggle-expand'): void
}>()

const isEditingAlias = ref(false)
const editingAlias = ref(props.alias)

watch(
  () => props.alias,
  (newAlias) => {
    editingAlias.value = newAlias
  }
)

/**
 * エイリアス編集開始
 */
const startEditAlias = () => {
  isEditingAlias.value = true
  editingAlias.value = props.alias
}

/**
 * エイリアス編集確定
 */
const confirmAlias = () => {
  isEditingAlias.value = false
  if (editingAlias.value.trim() && editingAlias.value !== props.alias) {
    emit('update-alias', editingAlias.value.trim())
  }
}

/**
 * エイリアス編集キャンセル
 */
const cancelAlias = () => {
  isEditingAlias.value = false
  editingAlias.value = props.alias
}

/**
 * キー入力ハンドラ
 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    confirmAlias()
  } else if (e.key === 'Escape') {
    cancelAlias()
  }
}
</script>

<template>
  <div class="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-gray-700">
    <!-- 展開/折りたたみボタン -->
    <UButton
      size="xs"
      variant="ghost"
      color="gray"
      class="no-drag"
      :icon="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
      @click="emit('toggle-expand')"
    />

    <!-- テーブルアイコンと名前 -->
    <UIcon name="i-heroicons-table-cells" class="w-4 h-4 text-primary-500 shrink-0" />
    <span class="text-sm font-medium truncate">{{ tableName }}</span>

    <div class="flex-1" />

    <!-- エイリアス -->
    <div class="alias-section no-drag">
      <template v-if="isEditingAlias">
        <input
          v-model="editingAlias"
          class="w-14 text-xs px-1.5 py-0.5 border border-primary-500 rounded outline-none bg-white dark:bg-gray-800"
          type="text"
          maxlength="20"
          @blur="confirmAlias"
          @keydown="handleKeyDown"
          autofocus
        />
      </template>
      <template v-else>
        <span
          class="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/50"
          title="クリックしてエイリアスを編集"
          @click="startEditAlias"
        >
          {{ alias }}
        </span>
      </template>
    </div>

    <!-- 削除ボタン -->
    <UButton
      size="xs"
      variant="ghost"
      color="red"
      icon="i-heroicons-x-mark"
      class="no-drag"
      @click="emit('remove')"
    />
  </div>
</template>
