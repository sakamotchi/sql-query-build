<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import MutationBuilderToolbar from './MutationBuilderToolbar.vue'
import TableSelector from './TableSelector.vue'
import InsertInputPanel from './InsertInputPanel.vue'
import UpdatePanel from './UpdatePanel.vue'
import SqlPreviewPanel from './SqlPreviewPanel.vue'
import ResizablePanel from '@/components/query-builder/ResizablePanel.vue'

const mutationStore = useMutationBuilderStore()
const previewHeight = ref(260)
const mutationType = computed(() => mutationStore.mutationType)

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
        <InsertInputPanel v-if="mutationType === 'INSERT'" />
        <UpdatePanel v-else-if="mutationType === 'UPDATE'" />
        <div v-else class="flex-1 flex items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
          {{ mutationType }} は実装予定です
        </div>
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
