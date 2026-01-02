<script setup lang="ts">
import MutationBuilderLayout from '@/components/mutation-builder/MutationBuilderLayout.vue'

definePageMeta({
  title: 'データ変更',
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <MutationBuilderLayout />
  </div>
</template>
