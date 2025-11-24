<template>
  <WindowEnvironmentProvider>
    <v-app>
      <v-layout>
        <div
          class="sr-only"
          role="status"
          aria-live="polite"
        >
          {{ currentThemeInfo.label }}に切り替えました
        </div>

        <EnvironmentWarningBanner />

        <!-- 環境ヘッダー (App Bar) -->
        <v-app-bar
          v-if="connection"
          :color="currentThemeInfo.primary"
          role="banner"
          class="environment-app-bar"
          elevation="2"
          :height="appBarHeight"
          app
        >
          <EnvironmentHeader
            :environment="connection.environment"
            :connection-id="connection.id"
            :connection-name="connection.name"
            :db-type="connection.dbType"
            :host="connection.host"
            :port="connection.port"
            :database="connection.database"
            :connected="isConnected"
            @settings="handleOpenSettings"
            @disconnect="handleDisconnect"
          >
            <template #indicator>
              <EnvironmentIndicator />
            </template>
          </EnvironmentHeader>
        </v-app-bar>

        <!-- ローディング状態 -->
        <v-sheet
          v-else-if="isLoadingConnection"
          class="environment-header--placeholder"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="32"
          ></v-progress-circular>
          <span class="ml-3 text-body-2">接続情報を読み込み中...</span>
        </v-sheet>

        <!-- エラー状態 -->
        <v-alert
          v-else-if="connectionErrorMessage"
          type="error"
          variant="tonal"
          class="environment-header--error"
          prominent
        >
          {{ connectionErrorMessage }}
        </v-alert>

        <v-main
          class="query-builder-main"
          :style="{ backgroundColor: currentThemeInfo.background }"
        >
          <div class="query-builder-page">
            <v-alert
              v-if="connectionErrorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ connectionErrorMessage }}
            </v-alert>

            <div
              v-else-if="isLoadingConnection"
              class="loading-placeholder"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="32"
              ></v-progress-circular>
              <span class="ml-3 text-body-2">クエリビルダーを準備中です...</span>
            </div>

            <v-alert
              v-else-if="!connection"
              type="warning"
              variant="tonal"
              class="mb-4"
            >
              接続情報が取得できませんでした。ランチャーから開き直してください。
            </v-alert>

            <div
              v-else
              class="layout-shell"
            >
              <QueryBuilderLayout />
            </div>
          </div>
        </v-main>
      </v-layout>
    </v-app>
  </WindowEnvironmentProvider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useDisplay } from 'vuetify';
import type { ThemeType } from '@/types/theme';
import { useTheme } from '@/composables/useTheme';
import { useWindow } from '@/composables/useWindow';
import { useConnectionStore } from '@/stores/connection';
import type { Connection } from '@/types/connection';
import EnvironmentHeader from '@/components/common/EnvironmentHeader.vue';
import WindowEnvironmentProvider from '@/components/common/WindowEnvironmentProvider.vue';
import EnvironmentWarningBanner from '@/components/common/EnvironmentWarningBanner.vue';
import EnvironmentIndicator from '@/components/common/EnvironmentIndicator.vue';
import { updateCurrentWindowTitle } from '@/utils/windowTitle';
import QueryBuilderLayout from '@/components/query-builder/QueryBuilderLayout.vue';

const urlParams = new URLSearchParams(window.location.search);
const connectionStore = useConnectionStore();
const { availableThemes, safeSetTheme, currentThemeInfo, setThemeByEnvironment } = useTheme();
const { setConnectionContext, isQueryBuilder: isQueryBuilderWindow } = useWindow();
const { mdAndDown } = useDisplay();

const normalizeEnvironment = (value: string | null): ThemeType => {
  if (value && availableThemes.value.includes(value as ThemeType)) {
    return value as ThemeType;
  }
  console.warn(`Unknown environment "${value}", fallback to development`);
  return 'development';
};

const fallbackEnvironment = ref<ThemeType>(
  normalizeEnvironment(urlParams.get('environment'))
);
const connectionId = ref(urlParams.get('connectionId') || '');

const connection = ref<Connection | null>(null);
const isLoadingConnection = ref(true);
const connectionError = ref<string | null>(null);
const isConnected = ref(true);

const connectionErrorMessage = computed(() => connectionError.value ?? '');

const appBarHeight = computed(() => (mdAndDown.value ? 120 : 72));

const isTauriEnvironment =
  typeof window !== 'undefined' && '__TAURI_IPC__' in window;

const setWindowTitle = async (conn: Connection) => {
  if (!isTauriEnvironment) return;
  await updateCurrentWindowTitle(conn.name, conn.environment);
};

const loadConnection = async () => {
  if (!connectionId.value) {
    connectionError.value = '接続IDが指定されていません。ランチャーから開き直してください。';
    connection.value = null;
    isLoadingConnection.value = false;
    syncWindowContext(null);
    safeSetTheme(fallbackEnvironment.value);
    return;
  }

  isLoadingConnection.value = true;
  connectionError.value = null;

  try {
    let found = connectionStore.getConnectionById(connectionId.value);
    if (!found) {
      found = await connectionStore.fetchConnectionById(connectionId.value, false);
    }

    if (found) {
      connection.value = found;
      setThemeByEnvironment(found.environment as ThemeType);
      syncWindowContext(connection.value);
      await setWindowTitle(found);
    } else {
      connectionError.value = '接続情報が見つかりませんでした。';
      connection.value = null;
      safeSetTheme(fallbackEnvironment.value);
      syncWindowContext(null);
    }
  } catch (error) {
    console.error('Failed to load connection info', error);
    connectionError.value = '接続情報の取得に失敗しました。ランチャーから再度お試しください。';
    connection.value = null;
    safeSetTheme(fallbackEnvironment.value);
    syncWindowContext(null);
  } finally {
    isLoadingConnection.value = false;
  }
};

const syncWindowContext = (conn: Connection | null) => {
  if (!isQueryBuilderWindow.value) return;

  if (conn) {
    setConnectionContext(conn.id, conn.environment);
  } else if (connectionId.value) {
    setConnectionContext(connectionId.value, fallbackEnvironment.value);
  }
};

const handleOpenSettings = () => {
  console.info('設定ダイアログは今後のタスクで実装予定です。');
};

const handleDisconnect = () => {
  isConnected.value = false;
  console.info('接続を切断しました（UI上の表示のみ）。');
};

onMounted(async () => {
  safeSetTheme(fallbackEnvironment.value);
  await loadConnection();

  if (isTauriEnvironment) {
    try {
      const windowEnv = await invoke<string>('get_window_environment');
      if (connection.value && windowEnv !== connection.value.environment) {
        console.warn('Environment mismatch:', windowEnv, connection.value.environment);
      }
    } catch (error) {
      console.error('Failed to get window environment:', error);
    }
  }
});
</script>

<style scoped>
.environment-app-bar {
  color: #fff;
}

.environment-app-bar :deep(.v-toolbar__content) {
  height: 100%;
  padding: 12px 16px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.environment-header--placeholder,
.environment-header--error {
  position: sticky;
  top: 0;
  z-index: 90;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.environment-header--placeholder {
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
}

.query-builder-main {
  display: flex;
  min-height: calc(100vh - 64px);
}

.query-builder-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.layout-shell {
  flex: 1;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 320px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

@media (max-width: 960px) {
  .environment-app-bar :deep(.v-toolbar__content) {
    padding: 16px;
  }
}
</style>
