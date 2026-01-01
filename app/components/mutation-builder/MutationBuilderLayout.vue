<script setup lang="ts">
import { ref } from 'vue'
import MutationBuilderToolbar from './MutationBuilderToolbar.vue'
import MutationBuilderLeftPanel from './MutationBuilderLeftPanel.vue'
import MutationBuilderCenterPanel from './MutationBuilderCenterPanel.vue'
import MutationBuilderRightPanel from './MutationBuilderRightPanel.vue'
import ResizablePanel from '@/components/query-builder/ResizablePanel.vue'

const leftPanelWidth = ref(250)
const rightPanelWidth = ref(350)

const panelConstraints = {
  left: { min: 200, max: 400 },
  right: { min: 280, max: 500 },
}

const handleLeftPanelResize = (width: number) => {
  leftPanelWidth.value = Math.max(
    panelConstraints.left.min,
    Math.min(panelConstraints.left.max, width)
  )
}

const handleRightPanelResize = (width: number) => {
  rightPanelWidth.value = Math.max(
    panelConstraints.right.min,
    Math.min(panelConstraints.right.max, width)
  )
}

</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
    <MutationBuilderToolbar class="flex-shrink-0" />

    <div class="flex flex-1 min-h-0">
      <ResizablePanel
        direction="right"
        :initial-size="leftPanelWidth"
        :min-size="panelConstraints.left.min"
        :max-size="panelConstraints.left.max"
        class="flex-shrink-0 border-r border-gray-200 dark:border-gray-800"
        @resize="handleLeftPanelResize"
      >
        <MutationBuilderLeftPanel />
      </ResizablePanel>

      <div class="flex-1 min-w-[400px] h-full">
        <MutationBuilderCenterPanel />
      </div>

      <ResizablePanel
        direction="left"
        :initial-size="rightPanelWidth"
        :min-size="panelConstraints.right.min"
        :max-size="panelConstraints.right.max"
        class="flex-shrink-0 border-l border-gray-200 dark:border-gray-800"
        @resize="handleRightPanelResize"
      >
        <MutationBuilderRightPanel />
      </ResizablePanel>
    </div>
  </div>
</template>
