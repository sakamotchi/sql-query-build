<template>
  <v-card variant="outlined" class="environment-color-preview">
    <v-card-title class="text-subtitle-2 d-flex align-center">
      <v-icon size="small" class="mr-2">mdi-palette</v-icon>
      環境色プレビュー
      <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">
        {{ themeInfo.label }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="4">
          <div class="color-item">
            <div class="color-label text-caption">プライマリーカラー</div>
            <div class="d-flex align-center">
              <div class="color-swatch" :style="{ backgroundColor: themeInfo.primary }"></div>
              <v-chip size="small" variant="outlined" class="ml-2">
                {{ themeInfo.primary }}
              </v-chip>
            </div>
          </div>
        </v-col>

        <v-col cols="12" sm="4">
          <div class="color-item">
            <div class="color-label text-caption">セカンダリーカラー</div>
            <div class="d-flex align-center">
              <div class="color-swatch" :style="{ backgroundColor: themeInfo.secondary }"></div>
              <v-chip size="small" variant="outlined" class="ml-2">
                {{ themeInfo.secondary }}
              </v-chip>
            </div>
          </div>
        </v-col>

        <v-col cols="12" sm="4">
          <div class="color-item">
            <div class="color-label text-caption">バックグラウンドカラー</div>
            <div class="d-flex align-center">
              <div class="color-swatch" :style="{ backgroundColor: themeInfo.background }"></div>
              <v-chip size="small" variant="outlined" class="ml-2">
                {{ themeInfo.background }}
              </v-chip>
            </div>
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-3"></v-divider>

      <div class="preview-sample">
        <div class="text-caption mb-2">表示イメージ</div>
        <v-sheet :color="themeInfo.background" rounded class="pa-3">
          <v-btn :color="themeInfo.primary" size="small" variant="elevated">
            サンプルボタン
          </v-btn>
        </v-sheet>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Environment } from '@/types/connection';
import { THEME_COLORS } from '@/types/theme';

const props = defineProps<{
  environment: Environment;
}>();

const themeInfo = computed(() => THEME_COLORS[props.environment]);
</script>

<style scoped lang="scss">
.environment-color-preview {
  max-width: 100%;
}

.color-item {
  margin-bottom: 12px;
}

.color-label {
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.6);
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.preview-sample {
  margin-top: 8px;
}
</style>
