<script setup lang="ts">
import QueryBuilderLayout from '@/components/query-builder/QueryBuilderLayout.vue'

// ページメタデータ
definePageMeta({
  title: 'クエリビルダー',
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <QueryBuilderLayout />
  </div>
</template>
