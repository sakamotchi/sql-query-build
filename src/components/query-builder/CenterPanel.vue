<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import TableRelationArea from './TableRelationArea.vue';
import ConditionTabs from './ConditionTabs.vue';

const containerRef = ref<HTMLElement | null>(null);

// 上下パネルの分割比率
const splitRatio = ref(50); // 50%
const isDragging = ref(false);

/**
 * 分割ドラッグ開始
 */
const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  isDragging.value = true;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

/**
 * 分割ドラッグ処理
 */
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const ratio = ((e.clientY - rect.top) / rect.height) * 100;
  splitRatio.value = Math.max(20, Math.min(80, ratio));
};

/**
 * 分割ドラッグ終了
 */
const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

onUnmounted(() => {
  if (isDragging.value) {
    stopDrag();
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="center-panel"
  >
    <!-- 上部: テーブル関係図 -->
    <div
      class="table-relation-area"
      :style="{ height: `${splitRatio}%` }"
    >
      <TableRelationArea />
    </div>

    <!-- 分割ハンドル -->
    <div
      class="split-handle"
      :class="{ 'is-dragging': isDragging }"
      @mousedown="startDrag"
    >
      <div class="handle-indicator" />
    </div>

    <!-- 下部: 条件設定タブ -->
    <div
      class="condition-tabs-area"
      :style="{ height: `${100 - splitRatio}%` }"
    >
      <ConditionTabs />
    </div>
  </div>
</template>

<style scoped>
.center-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.table-relation-area {
  overflow: hidden;
  min-height: 100px;
}

.condition-tabs-area {
  overflow: hidden;
  min-height: 100px;
}

.split-handle {
  height: 8px;
  background: rgb(var(--v-theme-surface));
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.split-handle:hover,
.split-handle.is-dragging {
  background: rgba(var(--v-theme-primary), 0.1);
}

.handle-indicator {
  width: 30px;
  height: 4px;
  background: rgba(var(--v-border-color), 0.5);
  border-radius: 2px;
}

.split-handle:hover .handle-indicator,
.split-handle.is-dragging .handle-indicator {
  background: rgb(var(--v-theme-primary));
}
</style>
