<script setup lang="ts">
import { ref } from 'vue'
import QueryBuilderToolbar from './QueryBuilderToolbar.vue'
import LeftPanel from './LeftPanel.vue'
import CenterPanel from './CenterPanel.vue'
import RightPanel from './RightPanel.vue'
import ResultPanel from './ResultPanel.vue'
import ResizablePanel from './ResizablePanel.vue'

// パネルサイズ
const leftPanelWidth = ref(250)
const rightPanelWidth = ref(350)
const resultPanelHeight = ref(200)
const isResultPanelVisible = ref(false)

// パネル表示状態
const isLeftPanelCollapsed = ref(false)
const isRightPanelCollapsed = ref(false)

// パネルサイズ制約
const panelConstraints = {
  left: { min: 200, max: 400 },
  right: { min: 280, max: 500 },
  result: { min: 100, maxRatio: 0.5 },
}

/**
 * 左パネルのリサイズ
 */
const handleLeftPanelResize = (width: number) => {
  leftPanelWidth.value = Math.max(
    panelConstraints.left.min,
    Math.min(panelConstraints.left.max, width)
  )
}

/**
 * 右パネルのリサイズ
 */
const handleRightPanelResize = (width: number) => {
  rightPanelWidth.value = Math.max(
    panelConstraints.right.min,
    Math.min(panelConstraints.right.max, width)
  )
}

/**
 * 結果パネルのリサイズ
 */
const handleResultPanelResize = (height: number) => {
  const maxHeight = window.innerHeight * panelConstraints.result.maxRatio
  resultPanelHeight.value = Math.max(
    panelConstraints.result.min,
    Math.min(maxHeight, height)
  )
}

/**
 * 左パネルの折りたたみ切り替え
 */
const toggleLeftPanel = () => {
  isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value
}

/**
 * 右パネルの折りたたみ切り替え
 */
const toggleRightPanel = () => {
  isRightPanelCollapsed.value = !isRightPanelCollapsed.value
}

/**
 * 結果パネルの表示切り替え
 */
const toggleResultPanel = () => {
  isResultPanelVisible.value = !isResultPanelVisible.value
}

/**
 * クエリ実行後に結果パネルを表示
 */
const showResultPanel = () => {
  isResultPanelVisible.value = true
}

// コンポーネント公開
defineExpose({
  showResultPanel,
  toggleResultPanel,
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- ツールバー -->
    <QueryBuilderToolbar
      class="flex-shrink-0"
      @toggle-left-panel="toggleLeftPanel"
      @toggle-right-panel="toggleRightPanel"
      @toggle-result-panel="toggleResultPanel"
    />

    <!-- メインコンテンツエリア -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左パネル -->
      <ResizablePanel
        v-if="!isLeftPanelCollapsed"
        direction="right"
        :initial-size="leftPanelWidth"
        :min-size="panelConstraints.left.min"
        :max-size="panelConstraints.left.max"
        class="flex-shrink-0 border-r border-gray-200 dark:border-gray-800"
        @resize="handleLeftPanelResize"
      >
        <LeftPanel />
      </ResizablePanel>

      <!-- 左パネル折りたたみ時のボタン -->
      <div
        v-else
        class="flex items-center justify-center w-6 bg-white dark:bg-gray-900 cursor-pointer transition-colors duration-200 border-r border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="toggleLeftPanel"
      >
        <UIcon name="i-heroicons-chevron-right" />
      </div>

      <!-- 中央パネル -->
      <div class="flex-1 overflow-hidden min-w-[400px]">
        <CenterPanel />
      </div>

      <!-- 右パネル折りたたみ時のボタン -->
      <div
        v-if="isRightPanelCollapsed"
        class="flex items-center justify-center w-6 bg-white dark:bg-gray-900 cursor-pointer transition-colors duration-200 border-l border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="toggleRightPanel"
      >
        <UIcon name="i-heroicons-chevron-left" />
      </div>

      <!-- 右パネル -->
      <ResizablePanel
        v-else
        direction="left"
        :initial-size="rightPanelWidth"
        :min-size="panelConstraints.right.min"
        :max-size="panelConstraints.right.max"
        class="flex-shrink-0 border-l border-gray-200 dark:border-gray-800"
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
      class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800"
      @resize="handleResultPanelResize"
    >
      <ResultPanel @close="toggleResultPanel" />
    </ResizablePanel>
  </div>
</template>

