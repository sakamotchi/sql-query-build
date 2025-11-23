<script setup lang="ts">
import { computed } from 'vue';
import type { Environment } from '@/types/connection';
import { THEME_COLORS } from '@/types/theme';

interface ThemePreviewProps {
  environment: Environment;
  connectionName?: string;
  interactive?: boolean;
}

const props = withDefaults(
  defineProps<ThemePreviewProps>(),
  {
    connectionName: 'サンプル接続',
    interactive: true,
  }
);

const themeInfo = computed(() => THEME_COLORS[props.environment]);

const environmentIcon = computed(() => {
  const icons: Record<Environment, string> = {
    development: 'mdi-code-tags',
    test: 'mdi-test-tube',
    staging: 'mdi-server-network',
    production: 'mdi-database-alert',
  };
  return icons[props.environment];
});

const showWarning = computed(() => props.environment === 'production' || props.environment === 'staging');

const warningMessage = computed(() => {
  if (props.environment === 'production') {
    return '⚠️ 本番環境 - UPDATE/DELETE操作には十分注意してください';
  }
  if (props.environment === 'staging') {
    return '⚠️ ステージング環境 - 本番前の環境です';
  }
  return '';
});

const paletteItems = computed(() => [
  { label: 'プライマリー', value: themeInfo.value.primary },
  { label: 'セカンダリー', value: themeInfo.value.secondary },
  { label: 'バックグラウンド', value: themeInfo.value.background },
]);
</script>

<template>
  <div
    class="theme-preview"
    role="region"
    aria-label="テーマプレビュー"
  >
    <div
      class="sr-only"
      aria-live="polite"
    >
      {{ themeInfo.label }}のプレビューを表示中
    </div>

    <div class="text-subtitle-2 mb-3 d-flex align-center">
      <v-icon size="small" class="mr-2">mdi-eye</v-icon>
      テーマプレビュー
      <v-chip
        size="x-small"
        variant="tonal"
        color="primary"
        class="ml-2"
      >
        {{ themeInfo.label }}
      </v-chip>
    </div>

    <transition
      name="theme-fade"
      mode="out-in"
    >
      <v-card
        :key="environment"
        variant="outlined"
        class="preview-container"
      >
        <v-alert
          v-if="showWarning"
          :color="environment === 'production' ? 'error' : 'warning'"
          variant="flat"
          density="compact"
          class="preview-warning-banner"
        >
          <template #prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          <strong>{{ warningMessage }}</strong>
        </v-alert>

        <div
          class="preview-header"
          :style="{ backgroundColor: themeInfo.primary, color: 'white' }"
        >
          <div class="d-flex align-center pa-3">
            <v-icon
              :color="'white'"
              class="mr-3"
            >
              {{ environmentIcon }}
            </v-icon>
            <div class="flex-grow-1">
              <div class="font-weight-medium d-flex align-center flex-wrap">
                <v-chip
                  :color="themeInfo.secondary"
                  size="x-small"
                  variant="elevated"
                  class="mr-2"
                >
                  {{ themeInfo.label }}
                </v-chip>
                <span class="connection-name">
                  {{ connectionName }}
                </span>
              </div>
              <div class="text-caption opacity-90">
                localhost:5432 / sample_db
              </div>
            </div>
            <v-chip
              color="success"
              size="x-small"
              variant="elevated"
            >
              接続中
            </v-chip>
          </div>
        </div>

        <div
          class="preview-content pa-4"
          :style="{ backgroundColor: themeInfo.background }"
        >
          <div class="section mb-4">
            <div class="section-title">ボタン</div>
            <div class="button-group">
              <v-btn
                :color="themeInfo.primary"
                size="small"
                variant="elevated"
                :ripple="interactive"
              >
                プライマリー
              </v-btn>
              <v-btn
                :color="themeInfo.secondary"
                size="small"
                variant="elevated"
                :ripple="interactive"
              >
                セカンダリー
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                :style="{ borderColor: themeInfo.primary, color: themeInfo.primary }"
                :ripple="interactive"
              >
                アウトライン
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                :style="{ color: themeInfo.primary }"
                :ripple="interactive"
              >
                テキスト
              </v-btn>
            </div>
            <div v-if="interactive" class="text-caption text-medium-emphasis mt-2">
              ボタンにカーソルを合わせて色味やトーンを確認できます
            </div>
          </div>

          <div class="section mb-4">
            <div class="section-title">カード</div>
            <v-card
              max-width="360"
              variant="outlined"
            >
              <v-card-title>サンプルカード</v-card-title>
              <v-card-text>
                このカードは{{ themeInfo.label }}のテーマプレビューです。
              </v-card-text>
              <v-card-actions class="d-flex justify-end">
                <v-btn
                  :color="themeInfo.primary"
                  size="small"
                  variant="text"
                  :ripple="interactive"
                >
                  アクション
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  :style="{ color: themeInfo.secondary }"
                  :ripple="interactive"
                >
                  詳細
                </v-btn>
              </v-card-actions>
            </v-card>
          </div>

          <div class="section mb-4">
            <div class="section-title">アラート</div>
            <div class="alert-list">
              <v-alert
                type="info"
                variant="tonal"
                density="compact"
              >
                情報メッセージの表示例
              </v-alert>
              <v-alert
                type="success"
                variant="tonal"
                density="compact"
              >
                成功メッセージの表示例
              </v-alert>
              <v-alert
                type="warning"
                variant="tonal"
                density="compact"
              >
                警告メッセージの表示例
              </v-alert>
              <v-alert
                type="error"
                variant="tonal"
                density="compact"
              >
                エラーメッセージの表示例
              </v-alert>
            </div>
          </div>

          <div class="section">
            <div class="section-title">カラーパレット</div>
            <div class="color-palette">
              <div
                v-for="color in paletteItems"
                :key="color.label"
                class="color-item"
              >
                <div
                  class="color-swatch"
                  :style="{ backgroundColor: color.value }"
                ></div>
                <div class="color-info">
                  <div class="text-caption font-weight-medium">{{ color.label }}</div>
                  <div class="text-caption text-grey">{{ color.value }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.theme-preview {
  max-width: 100%;
}

.preview-container {
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  border-radius: 12px;
  animation: fadeIn 0.3s ease-out;
}

.preview-warning-banner {
  border-radius: 0;
  margin: 0;
}

.preview-header {
  transition: background-color 0.3s ease-in-out;
}

.preview-content {
  min-height: 420px;
  transition: background-color 0.3s ease-in-out;
}

.connection-name {
  color: white;
}

.section-title {
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
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

.theme-fade-enter-active,
.theme-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.theme-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.theme-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .preview-content {
    min-height: 340px;
  }

  .color-palette {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>
