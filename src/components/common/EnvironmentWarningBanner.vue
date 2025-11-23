<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWindow } from '@/composables/useWindow';
import { useTheme } from '@/composables/useTheme';

const { environment } = useWindow();
const { isProductionTheme, isStagingTheme, shouldShowWarning } = useTheme();

const dismissed = ref(false);

/**
 * バナーを表示するかどうか
 */
const showBanner = computed(() => {
  return shouldShowWarning.value && !dismissed.value;
});

/**
 * 警告メッセージ
 */
const warningMessage = computed(() => {
  if (isProductionTheme.value) {
    return '本番環境に接続しています。操作には十分注意してください。';
  }
  if (isStagingTheme.value) {
    return 'ステージング環境に接続しています。';
  }
  if (environment.value === 'production') {
    return '本番環境に接続しています。操作には十分注意してください。';
  }
  if (environment.value === 'staging') {
    return 'ステージング環境に接続しています。';
  }
  return '';
});

/**
 * バナーの色
 */
const bannerColor = computed(() => {
  if (isProductionTheme.value || environment.value === 'production') {
    return 'error';
  }
  if (isStagingTheme.value || environment.value === 'staging') {
    return 'warning';
  }
  return 'info';
});

/**
 * アイコン
 */
const bannerIcon = computed(() => {
  if (isProductionTheme.value || environment.value === 'production') {
    return 'mdi-alert-circle';
  }
  return 'mdi-alert';
});

/**
 * バナーを閉じる
 */
const dismissBanner = () => {
  dismissed.value = true;
};
</script>

<template>
  <v-banner
    v-if="showBanner"
    :color="bannerColor"
    :icon="bannerIcon"
    class="environment-warning-banner"
    density="compact"
  >
    <template #text>
      {{ warningMessage }}
    </template>
    <template #actions>
      <v-btn
        variant="text"
        size="small"
        @click="dismissBanner"
      >
        閉じる
      </v-btn>
    </template>
  </v-banner>
</template>

<style scoped>
.environment-warning-banner {
  border-radius: 0;
}
</style>
