<script setup lang="ts">
import { computed } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import type { MutationType } from '@/types/mutation-query'

const store = useMutationBuilderStore()

const mutationType = computed(() => store.mutationType)

const handleMutationTypeChange = (type: MutationType) => {
  store.setMutationType(type)
}

const handleExecute = () => {
  console.log('Execute query')
}

const handleSave = () => {
  console.log('Save query')
}

const handleHistory = () => {
  console.log('Show history')
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3">
      <UFieldGroup>
        <UButton
          :color="mutationType === 'INSERT' ? 'primary' : 'gray'"
          :variant="mutationType === 'INSERT' ? 'solid' : 'ghost'"
          @click="handleMutationTypeChange('INSERT')"
        >
          INSERT
        </UButton>
        <UButton
          :color="mutationType === 'UPDATE' ? 'primary' : 'gray'"
          :variant="mutationType === 'UPDATE' ? 'solid' : 'ghost'"
          @click="handleMutationTypeChange('UPDATE')"
        >
          UPDATE
        </UButton>
        <UButton
          :color="mutationType === 'DELETE' ? 'primary' : 'gray'"
          :variant="mutationType === 'DELETE' ? 'solid' : 'ghost'"
          @click="handleMutationTypeChange('DELETE')"
        >
          DELETE
        </UButton>
      </UFieldGroup>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-play"
        color="primary"
        :disabled="!store.canExecuteQuery"
        @click="handleExecute"
      >
        実行
      </UButton>
      <UButton
        icon="i-heroicons-bookmark"
        color="gray"
        variant="ghost"
        @click="handleSave"
      >
        保存
      </UButton>
      <UButton
        icon="i-heroicons-clock"
        color="gray"
        variant="ghost"
        @click="handleHistory"
      >
        履歴
      </UButton>
      <USeparator orientation="vertical" class="h-6" />
      <UButton
        icon="i-heroicons-arrow-left"
        color="gray"
        variant="ghost"
        to="/query-builder"
      >
        データ参照へ
      </UButton>
    </div>
  </div>
</template>
