<script setup lang="ts">
import { computed } from 'vue';
import LauncherPage from './pages/launcher.vue';
import QueryBuilderPage from './pages/query-builder.vue';

const pathname = window.location.pathname.replace(/^\/+/, '');
const isQueryBuilder = computed(() => pathname.startsWith('query-builder'));
</script>

<template>
  <QueryBuilderPage v-if="isQueryBuilder" />
  <LauncherPage v-else />
</template>
