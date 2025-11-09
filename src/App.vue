<script setup lang="ts">
import { computed } from 'vue';
import LauncherPage from './pages/launcher.vue';
import QueryBuilderPage from './pages/query-builder.vue';

const currentComponent = computed(() => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/^\/+/, '');

    if (path.startsWith('query-builder')) {
      return QueryBuilderPage;
    }
  }

  return LauncherPage;
});
</script>

<template>
  <component :is="currentComponent" />
</template>
