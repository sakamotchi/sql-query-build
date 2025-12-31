<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import JoinConfigDialog from './dialog/JoinConfigDialog.vue'
import type { JoinClause, JoinCondition } from '@/types/query-model'

const store = useQueryBuilderStore()

// ダイアログ状態
const isDialogOpen = ref(false)
const editingJoin = ref<JoinClause | undefined>(undefined)

// テーブルが2つ以上選択されているかチェック
const hasEnoughTables = computed(() => store.selectedTables.length >= 2)

// JOIN追加ダイアログを開く
const handleAddJoin = () => {
  if (!hasEnoughTables.value) return
  editingJoin.value = undefined
  isDialogOpen.value = true
}

// JOIN編集ダイアログを開く
const handleEditJoin = (join: JoinClause) => {
  editingJoin.value = join
  isDialogOpen.value = true
}

// JOIN削除
const handleRemoveJoin = (id: string) => {
  store.removeJoin(id)
}

// JOINを保存（追加または更新）
const handleSaveJoin = (join: JoinClause | Omit<JoinClause, 'id'>) => {
  if ('id' in join) {
    // 更新
    const { id, ...updates } = join
    store.updateJoin(id, updates)
  } else {
    // 追加
    store.addJoin(join)
  }
}

// JOIN条件をフォーマットして表示
const formatConditions = (conditions: JoinCondition[], logic: 'AND' | 'OR') => {
  if (conditions.length === 0) return '(条件なし)'
  return conditions
    .map(c => `${c.left.tableAlias}.${c.left.columnName} ${c.operator} ${c.right.tableAlias}.${c.right.columnName}`)
    .join(` ${logic} `)
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <!-- テーブルが不足している場合 -->
    <div v-if="!hasEnoughTables" class="flex flex-col items-center justify-center h-full p-6 text-center">
      <UIcon name="i-heroicons-link-slash" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400 mt-4">JOINを設定するには2つ以上のテーブルが必要です</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
        左パネルからテーブルを追加してください
      </p>
    </div>

    <!-- JOIN一覧 -->
    <div v-else class="h-full overflow-y-auto p-4">
      <div class="space-y-3">
        <!-- 新規JOINボタン -->
        <UButton
          icon="i-heroicons-plus"
          size="sm"
          color="primary"
          variant="soft"
          block
          label="新規JOIN"
          @click="handleAddJoin"
        />

        <!-- 空状態 -->
        <div v-if="store.joins.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-heroicons-link" class="text-4xl text-gray-300 dark:text-gray-600 mb-3" />
          <p class="text-sm text-gray-500 dark:text-gray-400">JOINが設定されていません</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            上のボタンからJOINを追加してください
          </p>
        </div>

        <!-- JOIN一覧 -->
        <UCard
          v-for="join in store.joins"
          :key="join.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">
                {{ join.type }} JOIN {{ join.table.name }} ({{ join.table.alias }})
              </div>
              <div class="text-xs text-gray-500 mt-1 truncate">
                ON {{ formatConditions(join.conditions, join.conditionLogic) }}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <UButton
                icon="i-heroicons-pencil"
                size="xs"
                color="gray"
                variant="ghost"
                @click="handleEditJoin(join)"
              />
              <UButton
                icon="i-heroicons-x-mark"
                size="xs"
                color="red"
                variant="ghost"
                @click="handleRemoveJoin(join.id)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- JOIN設定ダイアログ -->
    <JoinConfigDialog
      v-model="isDialogOpen"
      :join="editingJoin"
      @save="handleSaveJoin"
    />
  </div>
</template>
