<template>
  <div class="environment-selector">
    <v-label class="mb-2 environment-selector__label">
      環境タイプ
      <span class="text-error">*</span>
    </v-label>

    <v-radio-group
      role="radiogroup"
      aria-label="環境タイプ選択"
      :model-value="modelValue"
      class="mb-4"
      :disabled="disabled"
      @update:model-value="handleChange"
    >
      <v-radio
        v-for="option in environmentOptions"
        :key="option.value"
        :value="option.value"
        :color="THEME_COLORS[option.value].primary"
        :aria-label="option.title"
        :aria-describedby="`${option.value}-description`"
        class="environment-selector__radio"
      >
        <template #label>
          <div class="environment-selector__option">
            <v-icon :color="THEME_COLORS[option.value].primary" class="mr-2">
              {{ option.icon }}
            </v-icon>
            <div>
              <div class="font-weight-medium">{{ option.title }}</div>
              <div
                :id="`${option.value}-description`"
                class="text-caption text-medium-emphasis"
              >
                {{ option.description }}
              </div>
            </div>
          </div>
        </template>
      </v-radio>
    </v-radio-group>

    <EnvironmentColorPreview :environment="modelValue" />
  </div>
</template>

<script setup lang="ts">
import EnvironmentColorPreview from '@/components/connection/EnvironmentColorPreview.vue';
import type { Environment } from '@/types/connection';
import { THEME_COLORS } from '@/types/theme';

interface EnvironmentSelectorProps {
  modelValue: Environment;
  disabled?: boolean;
}

const props = withDefaults(defineProps<EnvironmentSelectorProps>(), {
  disabled: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', environment: Environment): void;
}>();

const environmentOptions = [
  {
    value: 'development' as Environment,
    title: '開発環境',
    icon: 'mdi-code-tags',
    description: '開発・デバッグ用の環境',
  },
  {
    value: 'test' as Environment,
    title: 'テスト環境',
    icon: 'mdi-test-tube',
    description: '機能テスト・品質検証用の環境',
  },
  {
    value: 'staging' as Environment,
    title: 'ステージング環境',
    icon: 'mdi-server-network',
    description: '本番前の最終確認用環境',
  },
  {
    value: 'production' as Environment,
    title: '本番環境',
    icon: 'mdi-database-alert',
    description: '実運用環境 - 慎重な操作が必要',
  },
];

const handleChange = (value: Environment) => {
  emit('update:modelValue', value);
};
</script>

<style scoped lang="scss">
.environment-selector {
  &__label {
    font-weight: 600;
  }

  &__radio :deep(.v-label) {
    opacity: 1 !important;
  }

  &__option {
    display: flex;
    align-items: flex-start;
  }
}
</style>
