import { computed, onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useWindowStore } from '@/stores/window';
import type { WindowInfo } from '@/types/window';
import type { Environment } from '@/types/connection';

const isTauriEnvironment = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_IPC__' in window || '__TAURI_INTERNALS__' in window);

/**
 * ウィンドウ操作コンポーザブル
 */
export function useWindow() {
  const store = useWindowStore();
  let unlistenFocus: UnlistenFn | null = null;
  let unlistenBlur: UnlistenFn | null = null;

  const setupEventListeners = async () => {
    if (!isTauriEnvironment()) return;

    try {
      unlistenFocus = await listen('tauri://focus', () => {
        store.refreshWindowList();
      });

      unlistenBlur = await listen('tauri://blur', () => {
        // ブラー時の処理が必要になったらここに追加
      });
    } catch (error) {
      console.error('Failed to setup event listeners:', error);
    }
  };

  const cleanup = () => {
    if (unlistenFocus) {
      unlistenFocus();
      unlistenFocus = null;
    }
    if (unlistenBlur) {
      unlistenBlur();
      unlistenBlur = null;
    }
  };

  onMounted(async () => {
    await store.initialize();
    await setupEventListeners();
  });

  onUnmounted(() => {
    cleanup();
  });

  const context = computed(() => store.currentContext);
  const connectionId = computed(() => store.currentConnectionId);
  const environment = computed(() => store.currentEnvironment);
  const isLauncher = computed(() => store.isLauncher);
  const isQueryBuilder = computed(() => store.isQueryBuilder);
  const isSettings = computed(() => store.isSettings);
  const windowCount = computed(() => store.windowCount);
  const openWindows = computed(() => store.openWindows);
  const otherQueryBuilders = computed(() => store.otherQueryBuilders);

  const setConnectionContext = (connectionId: string, environment: Environment | string) => {
    store.setConnectionContext(connectionId, environment);
  };

  const openQueryBuilder = async (
    connectionId: string,
    connectionName: string,
    environment: Environment | string
  ): Promise<WindowInfo | null> => {
    return store.focusOrOpenQueryBuilder(connectionId, connectionName, environment);
  };

  const openSettings = (): Promise<WindowInfo | null> => {
    return store.openSettings();
  };

  const closeCurrentWindow = (): Promise<void> => {
    return store.closeWindow();
  };

  const focusWindow = (label: string): Promise<void> => {
    return store.focusWindow(label);
  };

  const refreshWindowList = (): Promise<void> => {
    return store.refreshWindowList();
  };

  return {
    context,
    connectionId,
    environment,
    isLauncher,
    isQueryBuilder,
    isSettings,
    windowCount,
    openWindows,
    otherQueryBuilders,
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    initialized: computed(() => store.initialized),
    setConnectionContext,
    openQueryBuilder,
    openSettings,
    closeCurrentWindow,
    focusWindow,
    refreshWindowList,
  };
}
