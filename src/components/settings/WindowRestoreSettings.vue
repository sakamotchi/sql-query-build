<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const restoreWindowsOnStartup = computed({
  get: () => settingsStore.restoreWindowsOnStartup,
  set: (value) => settingsStore.updateSettings({ restoreWindowsOnStartup: value }),
});

const rememberWindowPositions = computed({
  get: () => settingsStore.rememberWindowPositions,
  set: (value) => settingsStore.updateSettings({ rememberWindowPositions: value }),
});

const confirmBeforeClose = computed({
  get: () => settingsStore.confirmBeforeClose,
  set: (value) => settingsStore.updateSettings({ confirmBeforeClose: value }),
});

const rememberLastOpenedWindows = computed({
  get: () => settingsStore.rememberLastOpenedWindows,
  set: (value) => settingsStore.updateSettings({ rememberLastOpenedWindows: value }),
});
</script>

<template>
  <v-card>
    <v-card-title>ウィンドウ設定</v-card-title>

    <v-card-text>
      <v-switch
        v-model="restoreWindowsOnStartup"
        label="起動時に前回のウィンドウを復元する"
        color="primary"
        hide-details
        class="mb-4"
      />

      <v-switch
        v-model="rememberLastOpenedWindows"
        label="最後に開いたウィンドウを記憶する"
        color="primary"
        hide-details
        :disabled="!restoreWindowsOnStartup"
        class="mb-4"
      />

      <v-switch
        v-model="rememberWindowPositions"
        label="ウィンドウの位置とサイズを記憶する"
        color="primary"
        hide-details
        class="mb-4"
      />

      <v-switch
        v-model="confirmBeforeClose"
        label="アプリケーション終了前に確認する"
        color="primary"
        hide-details
      />
    </v-card-text>
  </v-card>
</template>
