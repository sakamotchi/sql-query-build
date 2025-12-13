<script setup lang="ts">
import '~/assets/css/tailwind.css'

useHead({
  title: 'SQL Query Build',
  meta: [
    { name: 'description', content: 'Visual SQL Query Builder for Multiple Environments' }
  ]
})
</script>

<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
