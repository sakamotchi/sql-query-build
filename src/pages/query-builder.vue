<template>
  <v-app>
    <v-layout>
      <div
        class="sr-only"
        role="status"
        aria-live="polite"
      >
        {{ currentThemeInfo.label }}に切り替えました
      </div>

      <!-- 警告バナー -->
      <v-alert
        v-if="connection && shouldShowWarning"
        :color="warningColor"
        variant="flat"
        density="comfortable"
        class="warning-banner"
        :class="warningBannerClass"
        role="alert"
      >
        <template #prepend>
          <v-icon icon="mdi-alert"></v-icon>
        </template>
        <strong>{{ warningMessage }}</strong>
      </v-alert>

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
        />
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

      <v-main :style="{ backgroundColor: currentThemeInfo.background }">
        <v-container fluid class="py-6">
          <v-alert
            v-if="connectionErrorMessage"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ connectionErrorMessage }}
          </v-alert>

          <v-card class="query-builder-placeholder">
            <v-card-title>クエリビルダー</v-card-title>
            <v-card-subtitle>
              接続ID: {{ connectionId || 'unknown' }}
            </v-card-subtitle>
            <v-card-text>
              クエリビルダーの詳細機能は別タスクで実装予定です。現在はテーマ切り替えとウィンドウ起動の挙動を確認できます。
            </v-card-text>
          </v-card>
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useDisplay } from 'vuetify';
import type { ThemeType } from '@/types/theme';
import { useTheme } from '@/composables/useTheme';
import { useConnectionStore } from '@/stores/connection';
import type { Connection } from '@/types/connection';
import EnvironmentHeader from '@/components/common/EnvironmentHeader.vue';

const urlParams = new URLSearchParams(window.location.search);
const connectionStore = useConnectionStore();
const { availableThemes, safeSetTheme, currentThemeInfo, isProductionTheme, isStagingTheme } = useTheme();
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

// 警告バナー関連
const isProduction = computed(() => {
  return isProductionTheme.value || connection.value?.environment === 'production';
});

const isStaging = computed(() => {
  return isStagingTheme.value || connection.value?.environment === 'staging';
});

const shouldShowWarning = computed(() => {
  return isProduction.value || isStaging.value;
});

const warningMessage = computed(() => {
  if (isProduction.value) {
    return '⚠️ 本番環境 - UPDATE / DELETE 操作には十分注意してください';
  }
  if (isStaging.value) {
    return '⚠️ ステージング環境 - 本番相当のデータを扱っています';
  }
  return '';
});

const warningColor = computed(() => (isProduction.value ? 'error' : 'warning'));

const warningBannerClass = computed(() => {
  if (!shouldShowWarning.value) return '';
  return isProduction.value ? 'production-warning' : 'staging-warning';
});

const appBarHeight = computed(() => (mdAndDown.value ? 120 : 72));

const loadConnection = async () => {
  if (!connectionId.value) {
    connectionError.value = '接続IDが指定されていません。ランチャーから開き直してください。';
    connection.value = null;
    isLoadingConnection.value = false;
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
      safeSetTheme(found.environment);
    } else {
      connectionError.value = '接続情報が見つかりませんでした。';
      connection.value = null;
      safeSetTheme(fallbackEnvironment.value);
    }
  } catch (error) {
    console.error('Failed to load connection info', error);
    connectionError.value = '接続情報の取得に失敗しました。ランチャーから再度お試しください。';
    connection.value = null;
    safeSetTheme(fallbackEnvironment.value);
  } finally {
    isLoadingConnection.value = false;
  }
};

const handleOpenSettings = () => {
  console.info('設定ダイアログは今後のタスクで実装予定です。');
};

const handleDisconnect = () => {
  isConnected.value = false;
  console.info('接続を切断しました（UI上の表示のみ）。');
};

const isTauriEnvironment = typeof window !== 'undefined' && '__TAURI_IPC__' in window;

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

.warning-banner {
  border-radius: 0;
  margin-bottom: 0;
  animation: pulse-warning 2s ease-in-out infinite;
}

.warning-banner.staging-warning {
  animation-duration: 2.8s;
}

@keyframes pulse-warning {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
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

.query-builder-placeholder {
  min-height: 320px;
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

@media (max-width: 960px) {
  .environment-app-bar :deep(.v-toolbar__content) {
    padding: 16px;
  }
}
</style>
