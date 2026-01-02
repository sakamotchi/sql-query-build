<script setup lang="ts">
import { ref } from 'vue'
import MutationBuilderToolbar from './MutationBuilderToolbar.vue'
import TableSelector from './TableSelector.vue'
import InsertInputPanel from './InsertInputPanel.vue'
import SqlPreviewPanel from './SqlPreviewPanel.vue'
import ResizablePanel from '@/components/query-builder/ResizablePanel.vue'

const previewHeight = ref(260)

const panelConstraints = {
  preview: { min: 180, max: 420 },
}

const handlePreviewResize = (height: number) => {
  previewHeight.value = Math.max(
    panelConstraints.preview.min,
    Math.min(panelConstraints.preview.max, height)
  )
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
    <MutationBuilderToolbar class="flex-shrink-0" />
    <TableSelector class="flex-shrink-0" />

    <div class="flex flex-col flex-1 min-h-0">
      <div class="flex-1 min-h-0">
        <InsertInputPanel />
      </div>

      <ResizablePanel
        direction="top"
        :initial-size="previewHeight"
        :min-size="panelConstraints.preview.min"
        :max-size="panelConstraints.preview.max"
        class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800"
        @resize="handlePreviewResize"
      >
        <SqlPreviewPanel />
      </ResizablePanel>
    </div>
  </div>
</template>
