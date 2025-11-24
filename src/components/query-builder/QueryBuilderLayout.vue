<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';
import QueryBuilderToolbar from './QueryBuilderToolbar.vue';
import LeftPanel from './LeftPanel.vue';
import CenterPanel from './CenterPanel.vue';
import RightPanel from './RightPanel.vue';
import ResultPanel from './ResultPanel.vue';
import ResizablePanel from './ResizablePanel.vue';

const queryBuilderStore = useQueryBuilderStore();

// パネルサイズ
const leftPanelWidth = ref(250);
const rightPanelWidth = ref(350);
const resultPanelHeight = ref(200);
const isResultPanelVisible = ref(false);

// パネル表示状態
const isLeftPanelCollapsed = ref(false);
const isRightPanelCollapsed = ref(false);

// パネルサイズ制約
const panelConstraints = {
  left: { min: 200, max: 400 },
  right: { min: 280, max: 500 },
  result: { min: 100, maxRatio: 0.5 },
};

const getMaxResultHeight = () =>
  window.innerHeight * panelConstraints.result.maxRatio;

/**
 * 左パネルのリサイズ
 */
const handleLeftPanelResize = (width: number) => {
  leftPanelWidth.value = Math.max(
    panelConstraints.left.min,
    Math.min(panelConstraints.left.max, width)
  );
};

/**
 * 右パネルのリサイズ
 */
const handleRightPanelResize = (width: number) => {
  rightPanelWidth.value = Math.max(
    panelConstraints.right.min,
    Math.min(panelConstraints.right.max, width)
  );
};

/**
 * 結果パネルのリサイズ
 */
const handleResultPanelResize = (height: number) => {
  resultPanelHeight.value = Math.max(
    panelConstraints.result.min,
    Math.min(getMaxResultHeight(), height)
  );
};

/**
 * 左パネルの折りたたみ切り替え
 */
const toggleLeftPanel = () => {
  isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value;
};

/**
 * 右パネルの折りたたみ切り替え
 */
const toggleRightPanel = () => {
  isRightPanelCollapsed.value = !isRightPanelCollapsed.value;
};

/**
 * 結果パネルの表示切り替え
 */
const toggleResultPanel = () => {
  isResultPanelVisible.value = !isResultPanelVisible.value;
};

/**
 * クエリ実行後に結果パネルを表示
 */
const showResultPanel = () => {
  isResultPanelVisible.value = true;
};

/**
 * ウィンドウリサイズ時に結果パネル高さを補正
 */
const clampResultHeight = () => {
  resultPanelHeight.value = Math.max(
    panelConstraints.result.min,
    Math.min(getMaxResultHeight(), resultPanelHeight.value)
  );
};

/**
 * ショートカット判定時、入力欄なら何もしない
 */
const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    target.isContentEditable ||
    !!target.closest('.v-field')
  );
};

/**
 * キーボードショートカット
 */
const handleShortcut = (event: KeyboardEvent) => {
  const hasModifier = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();

  if (isEditableTarget(event.target) && key !== 'escape') return;

  if (hasModifier && key === 'enter') {
    event.preventDefault();
    if (queryBuilderStore.canExecuteQuery) {
      queryBuilderStore.executeQuery();
      showResultPanel();
    }
  } else if (hasModifier && key === 's') {
    event.preventDefault();
    // TODO: クエリ保存ダイアログを開く
  } else if (hasModifier && key === 'n') {
    event.preventDefault();
    queryBuilderStore.resetQuery();
  } else if (hasModifier && key === 'b') {
    event.preventDefault();
    toggleLeftPanel();
  } else if (hasModifier && key === 'j') {
    event.preventDefault();
    toggleRightPanel();
  } else if (key === 'escape') {
    if (queryBuilderStore.isExecuting) {
      // TODO: 実行キャンセルは別タスクで実装
    }
  }
};

watch(
  () => queryBuilderStore.isExecuting,
  (isExecuting, wasExecuting) => {
    if (!isExecuting && wasExecuting) {
      showResultPanel();
    }
  }
);

onMounted(() => {
  window.addEventListener('resize', clampResultHeight);
  window.addEventListener('keydown', handleShortcut);
});

onUnmounted(() => {
  window.removeEventListener('resize', clampResultHeight);
  window.removeEventListener('keydown', handleShortcut);
});

// コンポーネント公開
defineExpose({
  showResultPanel,
  toggleResultPanel,
});
</script>

<template>
  <div class="query-builder-layout">
    <!-- ツールバー -->
    <QueryBuilderToolbar
      class="query-builder-toolbar"
      @toggle-left-panel="toggleLeftPanel"
      @toggle-right-panel="toggleRightPanel"
      @toggle-result-panel="toggleResultPanel"
    />

    <!-- メインコンテンツエリア -->
    <div class="query-builder-content">
      <!-- 左パネル -->
      <ResizablePanel
        v-if="!isLeftPanelCollapsed"
        direction="right"
        :initial-size="leftPanelWidth"
        :min-size="panelConstraints.left.min"
        :max-size="panelConstraints.left.max"
        class="left-panel-container"
        @resize="handleLeftPanelResize"
      >
        <LeftPanel />
      </ResizablePanel>

      <!-- 左パネル折りたたみ時のボタン -->
      <div
        v-else
        class="panel-collapsed left-collapsed"
        role="button"
        tabindex="0"
        @click="toggleLeftPanel"
        @keydown.enter.prevent="toggleLeftPanel"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </div>

      <!-- 中央パネル -->
      <div class="center-panel-container">
        <CenterPanel />
      </div>

      <!-- 右パネル折りたたみ時のボタン -->
      <div
        v-if="isRightPanelCollapsed"
        class="panel-collapsed right-collapsed"
        role="button"
        tabindex="0"
        @click="toggleRightPanel"
        @keydown.enter.prevent="toggleRightPanel"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </div>

      <!-- 右パネル -->
      <ResizablePanel
        v-else
        direction="left"
        :initial-size="rightPanelWidth"
        :min-size="panelConstraints.right.min"
        :max-size="panelConstraints.right.max"
        class="right-panel-container"
        @resize="handleRightPanelResize"
      >
        <RightPanel />
      </ResizablePanel>
    </div>

    <!-- 結果パネル -->
    <ResizablePanel
      v-if="isResultPanelVisible"
      direction="top"
      :initial-size="resultPanelHeight"
      :min-size="panelConstraints.result.min"
      class="result-panel-container"
      @resize="handleResultPanelResize"
    >
      <ResultPanel @close="toggleResultPanel" />
    </ResizablePanel>
  </div>
</template>

<style scoped>
.query-builder-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
  overflow: hidden;
}

.query-builder-toolbar {
  flex-shrink: 0;
}

.query-builder-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel-container {
  flex-shrink: 0;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.center-panel-container {
  flex: 1;
  overflow: hidden;
  min-width: 400px;
}

.right-panel-container {
  flex-shrink: 0;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.result-panel-container {
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.panel-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
  transition: background-color 0.2s;
}

.panel-collapsed:hover {
  background: rgb(var(--v-theme-surface-variant));
}

.left-collapsed {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.right-collapsed {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
