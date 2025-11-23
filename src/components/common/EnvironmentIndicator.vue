<script setup lang="ts">
import { computed } from 'vue';
import { useWindow } from '@/composables/useWindow';
import { useTheme } from '@/composables/useTheme';

const { environment } = useWindow();
const { currentThemeInfo, isProductionTheme, isStagingTheme } = useTheme();

/**
 * 環境アイコン
 */
const environmentIcons: Record<string, string> = {
  development: 'mdi-code-braces',
  test: 'mdi-test-tube',
  staging: 'mdi-rocket-launch',
  production: 'mdi-database',
};

/**
 * 環境ラベル
 */
const environmentLabels: Record<string, string> = {
  development: '開発環境',
  test: 'テスト環境',
  staging: 'ステージング',
  production: '本番環境',
};

const icon = computed(() => {
  return environmentIcons[environment.value || 'development'] || 'mdi-database';
});

const label = computed(() => {
  return environmentLabels[environment.value || 'development'] || environment.value;
});

const color = computed(() => {
  return currentThemeInfo.value?.primary || '#4CAF50';
});

const showWarning = computed(() => {
  return isProductionTheme.value || isStagingTheme.value;
});
</script>

<template>
  <div class="environment-indicator">
    <v-chip
      :color="color"
      :variant="showWarning ? 'flat' : 'tonal'"
      size="small"
      class="environment-chip"
    >
      <v-icon :icon="icon" size="small" start />
      {{ label }}
      <v-icon
        v-if="showWarning"
        icon="mdi-alert"
        size="small"
        end
      />
    </v-chip>
  </div>
</template>

<style scoped>
.environment-indicator {
  display: inline-flex;
  align-items: center;
}

.environment-chip {
  font-weight: 500;
}
</style>
