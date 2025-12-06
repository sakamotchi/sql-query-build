<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useThemeStore } from '@/stores/theme';
import { useWindowStore } from '@/stores/window';
import { useSettingsStore } from '@/stores/settings';
import { useTheme } from '@/composables/useTheme';
import { windowApi } from '@/api/window';
import LauncherPage from './pages/launcher.vue';
import QueryBuilderPage from './pages/query-builder.vue';
import SettingsPage from './pages/settings.vue';
import RestoreWindowsDialog from '@/components/dialogs/RestoreWindowsDialog.vue';

const themeStore = useThemeStore();
const windowStore = useWindowStore();
const settingsStore = useSettingsStore();
const { syncVuetifyTheme } = useTheme();

const showRestoreDialog = ref(false);
const savedWindowCount = ref(0);

let unlistenCloseRequested: (() => void) | null = null;
let unlistenBeforeExit: (() => void) | null = null;

const isTauriEnvironment = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_IPC__' in window || '__TAURI_INTERNALS__' in window);

const isQueryBuilder = computed(() => {
  const pathname = window.location.pathname.replace(/^\/+/, '');
  return pathname.startsWith('query-builder');
});

const isSettings = computed(() => {
  const pathname = window.location.pathname.replace(/^\/+/, '');
  return pathname.startsWith('settings');
});

/**
 * アプリケーション初期化
 */
const initializeApp = async () => {
  await settingsStore.loadSettings();

  themeStore.initialize();
  syncVuetifyTheme(themeStore.currentTheme);

  await windowStore.initialize();

  if (windowStore.isLauncher && settingsStore.shouldRestoreWindows && isTauriEnvironment()) {
    await checkAndRestoreWindows();
  }

  if (isTauriEnvironment()) {
    await setupEventListeners();
  }
};

/**
 * 前回のウィンドウ状態を確認
 */
const checkAndRestoreWindows = async () => {
  try {
    const savedStates = await windowApi.getSavedWindowStates();
    if (savedStates.length > 0) {
      savedWindowCount.value = savedStates.length;
      showRestoreDialog.value = true;
    }
  } catch (error) {
    console.error('Failed to check saved windows:', error);
  }
};

/**
 * ウィンドウを復元
 */
const restoreWindows = async () => {
  try {
    const restored = await windowApi.restoreWindows();
    if (restored.length > 0) {
      await windowStore.refreshWindowList();
    }
  } catch (error) {
    console.error('Failed to restore windows:', error);
  } finally {
    showRestoreDialog.value = false;
  }
};

/**
 * 復元をスキップ
 */
const skipRestore = () => {
  showRestoreDialog.value = false;
};

/**
 * イベントリスナーを設定
 */
const setupEventListeners = async () => {
  try {
    unlistenCloseRequested = await listen('tauri://close-requested', async () => {
      if (settingsStore.confirmBeforeClose) {
        // TODO: 終了前確認ダイアログを実装
      }

      try {
        const currentWindow = getCurrentWindow();
        const label = currentWindow.label;
        await windowApi.deleteWindowState(label);
      } catch (error) {
        console.error('Failed to delete closed window state:', error);
      }

      await windowApi.saveAllWindowStates();
    });

    unlistenBeforeExit = await listen('before-exit', async () => {
      await windowApi.saveAllWindowStates();
    });
  } catch (error) {
    console.error('Failed to setup event listeners:', error);
  }
};

/**
 * クリーンアップ
 */
const cleanup = () => {
  if (unlistenCloseRequested) {
    unlistenCloseRequested();
    unlistenCloseRequested = null;
  }
  if (unlistenBeforeExit) {
    unlistenBeforeExit();
    unlistenBeforeExit = null;
  }
};

onMounted(() => {
  initializeApp();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <SettingsPage v-if="isSettings" />
  <QueryBuilderPage v-else-if="isQueryBuilder" />
  <LauncherPage v-else />

  <RestoreWindowsDialog
    v-model="showRestoreDialog"
    :window-count="savedWindowCount"
    @restore="restoreWindows"
    @skip="skipRestore"
  />
</template>
