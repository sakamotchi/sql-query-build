<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useWindow } from '@/composables/useWindow';
import { useTheme } from '@/composables/useTheme';
import { useConnectionStore } from '@/stores/connection';
import { updateCurrentWindowTitle } from '@/utils/windowTitle';
import type { ThemeType } from '@/types/theme';
import type { Connection } from '@/types/connection';

const { setConnectionContext, isQueryBuilder, connectionId, initialized } = useWindow();
const { setThemeByEnvironment } = useTheme();
const connectionStore = useConnectionStore();

const isTauriEnvironment = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_IPC__' in window || '__TAURI_INTERNALS__' in window);

const availableThemes: ThemeType[] = ['development', 'test', 'staging', 'production'];

const connectionIdFromQuery = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('connectionId') || '';
});

const fallbackEnvironment = computed<ThemeType>(() => {
  const params = new URLSearchParams(window.location.search);
  const env = params.get('environment') || '';
  if (availableThemes.includes(env as ThemeType)) {
    return env as ThemeType;
  }
  return 'development';
});

const effectiveConnectionId = computed(() => {
  return connectionId.value || connectionIdFromQuery.value;
});

/**
 * 接続情報を読み込んでウィンドウを設定
 */
const setupWindowForConnection = async (connId: string) => {
  if (!connId) return;

  let connection: Connection | null | undefined = connectionStore.getConnectionById(connId);

  if (!connection) {
    try {
      connection = await connectionStore.fetchConnectionById(connId, false);
    } catch (error) {
      console.error('Failed to load connection:', error);
      connection = null;
    }
  }

  if (!connection) {
    console.error('Connection not found:', connId);
    setThemeByEnvironment(fallbackEnvironment.value);
    return;
  }

  await applyConnectionSettings(connection);
};

/**
 * 接続設定を適用
 */
const applyConnectionSettings = async (connection: Connection) => {
  setConnectionContext(connection.id, connection.environment);
  setThemeByEnvironment(connection.environment as ThemeType);

  if (!isTauriEnvironment()) return;

  try {
    await updateCurrentWindowTitle(connection.name, connection.environment);
  } catch (error) {
    console.error('Failed to set window title:', error);
  }
};

// ルート相当のパラメータの監視
watch(
  () => ({
    connId: effectiveConnectionId.value,
    ready: initialized.value,
    queryBuilder: isQueryBuilder.value,
  }),
  async ({ connId, ready, queryBuilder }) => {
    if (!connId || !ready || !queryBuilder) return;
    await setupWindowForConnection(connId);
  },
  { immediate: true }
);

// コンポーネントマウント時の処理
onMounted(async () => {
  if (!effectiveConnectionId.value && isQueryBuilder.value) {
    setThemeByEnvironment(fallbackEnvironment.value);
  }
});
</script>

<template>
  <slot />
</template>
