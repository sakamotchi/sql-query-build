<script setup lang="ts">
import QueryBuilderLayout from '@/components/query-builder/QueryBuilderLayout.vue'

const { t } = useI18n()

useHead({
  title: t('queryBuilder.pageTitle')
})

// ページメタデータ
definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <QueryBuilderLayout />
  </div>
</template>
