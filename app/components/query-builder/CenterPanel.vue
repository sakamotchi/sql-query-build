<script setup lang="ts">
import { ref } from 'vue'
import TableRelationArea from './TableRelationArea.vue'
import ConditionTabs from './ConditionTabs.vue'
import type { JoinClause } from '@/types/query-model'

// 上下パネルの分割比率
const splitRatio = ref(50) // 50%
const isDragging = ref(false)
const conditionTabsRef = ref<InstanceType<typeof ConditionTabs> | null>(null)

/**
 * 分割ドラッグ開始
 */
const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

/**
 * 分割ドラッグ処理
 */
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const container = document.querySelector('.center-panel')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const ratio = ((e.clientY - rect.top) / rect.height) * 100
  splitRatio.value = Math.max(20, Math.min(80, ratio))
}

/**
 * 分割ドラッグ終了
 */
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const handleOpenJoinDialog = (payload?: { join?: JoinClause }) => {
  if (payload?.join) {
    conditionTabsRef.value?.openJoinEditDialog(payload.join)
  } else {
    conditionTabsRef.value?.openJoinAddDialog()
  }
}
</script>

<template>
  <div class="flex flex-col h-full center-panel">
    <!-- 上部: テーブル関係図 -->
    <div
      class="min-h-[100px] overflow-hidden"
      :style="{ height: `${splitRatio}%` }"
    >
      <TableRelationArea @open-join-dialog="handleOpenJoinDialog" />
    </div>

    <!-- 分割ハンドル -->
    <div
      class="h-2 cursor-row-resize flex items-center justify-center flex-shrink-0 border-t border-b border-gray-200 dark:border-gray-800 transition-colors"
      :class="isDragging ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-900 hover:bg-primary-50 dark:hover:bg-primary-900/20'"
      @mousedown="startDrag"
    >
      <div
        class="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded transition-colors"
        :class="isDragging ? 'bg-primary-500' : 'group-hover:bg-primary-500'"
      />
    </div>

    <!-- 下部: 条件設定タブ -->
    <div
      class="overflow-hidden min-h-[100px]"
      :style="{ height: `${100 - splitRatio}%` }"
    >
      <ConditionTabs ref="conditionTabsRef" />
    </div>
  </div>
</template>
