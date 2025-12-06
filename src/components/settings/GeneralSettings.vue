<template>
  <v-card>
    <v-card-title>
      <v-icon start>mdi-cog</v-icon>
      一般設定
    </v-card-title>
    <v-card-text>
      <v-switch
        v-model="restoreWindows"
        label="起動時に前回のウィンドウを復元する"
        color="primary"
        class="mb-2"
      />
      <v-switch
        v-model="rememberPositions"
        label="ウィンドウ位置を記憶する"
        color="primary"
        class="mb-2"
      />
      <v-switch
        v-model="confirmClose"
        label="終了前に確認する"
        color="primary"
        class="mb-2"
      />
      <v-switch
        v-model="rememberLastOpened"
        label="最後に開いたウィンドウを記憶する"
        color="primary"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const {
  restoreWindowsOnStartup,
  rememberWindowPositions,
  confirmBeforeClose,
  rememberLastOpenedWindows,
} = storeToRefs(settingsStore);

const restoreWindows = computed({
  get: () => restoreWindowsOnStartup.value,
  set: value => settingsStore.updateSettings({ restoreWindowsOnStartup: value }),
});

const rememberPositions = computed({
  get: () => rememberWindowPositions.value,
  set: value => settingsStore.updateSettings({ rememberWindowPositions: value }),
});

const confirmClose = computed({
  get: () => confirmBeforeClose.value,
  set: value => settingsStore.updateSettings({ confirmBeforeClose: value }),
});

const rememberLastOpened = computed({
  get: () => rememberLastOpenedWindows.value,
  set: value => settingsStore.updateSettings({ rememberLastOpenedWindows: value }),
});
</script>
