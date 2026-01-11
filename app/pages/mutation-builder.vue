<script setup lang="ts">
import MutationBuilderLayout from '@/components/mutation-builder/MutationBuilderLayout.vue'

const { t } = useI18n()

useHead({
  title: t('mutationBuilder.pageTitle')
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <MutationBuilderLayout />
  </div>
</template>
