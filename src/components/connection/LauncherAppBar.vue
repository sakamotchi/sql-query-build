<template>
  <v-app-bar color="primary" dark elevation="2">
    <v-app-bar-nav-icon>
      <v-icon>mdi-database</v-icon>
    </v-app-bar-nav-icon>

    <v-app-bar-title>SQLエディタ ランチャー</v-app-bar-title>

    <v-spacer></v-spacer>

    <v-btn
      prepend-icon="mdi-plus-circle"
      @click="$emit('new-connection')"
      aria-label="新規接続を追加"
      role="button"
    >
      新規接続
    </v-btn>

    <v-btn
      icon="mdi-cog"
      @click="$emit('open-settings')"
      aria-label="設定を開く"
      role="button"
    ></v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
defineEmits<{
  'new-connection': []
  'open-settings': []
}>()
</script>
