<template>
  <v-app>
    <div
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ currentThemeInfo.label }}に切り替えました
    </div>

    <v-app-bar
      :style="{ backgroundColor: currentThemeInfo.primary, color: '#fff' }"
      density="comfortable"
      flat
    >
      <v-toolbar-title>{{ headerTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-chip
        :color="currentThemeInfo.secondary"
        class="text-white"
        variant="flat"
        size="small"
      >
        {{ currentThemeInfo.label }}
      </v-chip>
    </v-app-bar>

    <v-main :style="{ backgroundColor: currentThemeInfo.background }">
      <v-container fluid class="py-6">
        <v-alert
          v-if="needsWarning"
          type="warning"
          variant="tonal"
          class="mb-4"
          prominent
        >
          {{ warningMessage }}
        </v-alert>

        <v-card class="query-builder-placeholder">
          <v-card-title>クエリビルダー</v-card-title>
          <v-card-subtitle>
            接続ID: {{ connectionId }}
          </v-card-subtitle>
          <v-card-text>
            クエリビルダーの詳細機能は別タスクで実装予定です。現在はテーマ切り替えとウィンドウ起動の挙動を確認できます。
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ThemeType } from '@/types/theme'
import { useTheme } from '@/composables/useTheme'

const urlParams = new URLSearchParams(window.location.search)
const { availableThemes, safeSetTheme, currentThemeInfo, needsWarning } = useTheme()

const normalizeEnvironment = (value: string | null): ThemeType => {
  if (value && availableThemes.value.includes(value as ThemeType)) {
    return value as ThemeType
  }
  console.warn(`Unknown environment "${value}", fallback to development`)
  return 'development'
}

const environment = ref<ThemeType>(
  normalizeEnvironment(urlParams.get('environment'))
)
const connectionName = ref(urlParams.get('connectionName') || '未指定の接続')
const connectionId = ref(urlParams.get('connectionId') || 'unknown')

const headerTitle = computed(() => `${connectionName.value} - SQLエディタ`)
const warningMessage = computed(
  () => `${currentThemeInfo.value.label}での操作です。変更には十分注意してください。`
)

onMounted(async () => {
  safeSetTheme(environment.value)

  if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
    try {
      const windowEnv = await invoke<string>('get_window_environment')
      if (windowEnv !== environment.value) {
        console.warn('Environment mismatch:', windowEnv, environment.value)
      }
    } catch (error) {
      console.error('Failed to get window environment:', error)
    }
  }
})
</script>

<style scoped>
.query-builder-placeholder {
  min-height: 320px;
}
</style>
