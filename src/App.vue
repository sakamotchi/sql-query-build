<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useTheme } from '@/composables/useTheme';
import LauncherPage from './pages/launcher.vue';
import QueryBuilderPage from './pages/query-builder.vue';

const themeStore = useThemeStore();
const { syncVuetifyTheme } = useTheme();

onMounted(() => {
  themeStore.initialize();
  syncVuetifyTheme(themeStore.currentTheme);
});

const isQueryBuilder = computed(() => {
  const pathname = window.location.pathname.replace(/^\/+/, '');
  return pathname.startsWith('query-builder');
});
</script>

<template>
  <QueryBuilderPage v-if="isQueryBuilder" />
  <LauncherPage v-else />
</template>
