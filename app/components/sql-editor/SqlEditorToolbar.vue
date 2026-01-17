<script setup lang="ts">

function handleExecute() {
  console.log('Execute button clicked (not implemented yet)')
}

function handleStop() {
  console.log('Stop button clicked (not implemented yet)')
}

function handleSave() {
  console.log('Save button clicked (not implemented yet)')
}
</script>

<template>
  <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-play"
        label="実行"
        :disabled="true"
        color="primary"
        @click="handleExecute"
      />

      <UButton
        icon="i-heroicons-stop"
        label="停止"
        :disabled="true"
        color="neutral"
        variant="soft"
        @click="handleStop"
      />

      <div class="flex-1" />

      <UButton
        icon="i-heroicons-bookmark"
        label="保存"
        :disabled="true"
        color="neutral"
        variant="soft"
        @click="handleSave"
      />
    </div>
  </div>
</template>
