<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '@/composables/useTheme';
import type { ThemeType } from '@/types/theme';

const { safeSetTheme, currentThemeInfo, needsWarning } = useTheme();

const initialParams = (() => {
  if (typeof window === 'undefined') {
    return { environment: 'development' as ThemeType, connectionId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  const environment = (params.get('environment') as ThemeType) || 'development';
  const connectionId = params.get('connectionId') || '';

  return { environment, connectionId };
})();

const environment = ref<ThemeType>(initialParams.environment);
const connectionId = ref(initialParams.connectionId);
const windowEnvironment = ref<string | null>(null);
const environmentMismatch = computed(() => {
  return windowEnvironment.value !== null && windowEnvironment.value !== environment.value;
});
const themeApplied = ref(false);

onMounted(async () => {
  themeApplied.value = safeSetTheme(environment.value);

  try {
    const windowEnv = await invoke<string>('get_window_environment');
    windowEnvironment.value = windowEnv;
  } catch (error) {
    console.error('Failed to get window environment:', error);
  }
});
</script>

<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>
        SQLエディタ
        <span class="text-caption ms-2">
          {{ currentThemeInfo.label }}
        </span>
      </v-app-bar-title>
    </v-app-bar>

    <v-main :style="{ backgroundColor: currentThemeInfo.background }">
      <v-container class="py-8">
        <v-alert
          v-if="needsWarning"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          {{ currentThemeInfo.label }}で操作中です。変更内容を十分に確認してください。
        </v-alert>

        <v-alert
          v-if="environmentMismatch"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          ウィンドウのラベル環境とクエリパラメーターが一致しません。
        </v-alert>

        <v-alert
          v-if="!themeApplied"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          テーマ適用に失敗したため、開発環境テーマを使用しています。
        </v-alert>

        <v-card>
          <v-card-title>クエリビルダー</v-card-title>
          <v-card-text>
            <div>接続ID: {{ connectionId || '未指定' }}</div>
            <div>環境: {{ currentThemeInfo.label }}</div>
            <div class="mt-4 text-medium-emphasis">
              クエリビルダー画面の実装は今後追加される予定です。
            </div>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>
