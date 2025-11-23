<template>
  <v-chip
    :color="chipColor"
    :variant="variant"
    :size="chipSize"
    class="environment-badge"
    :aria-label="`${themeInfo.label}バッジ`"
    :text-color="chipTextColor"
    rounded="lg"
  >
    <v-icon
      v-if="showIcon"
      :size="iconSize"
      start
      class="mr-1"
    >
      {{ environmentIcon }}
    </v-icon>
    <span class="environment-badge__label">{{ themeInfo.label }}</span>
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Environment } from '@/stores/types';
import { THEME_COLORS } from '@/types/theme';

const props = withDefaults(
  defineProps<{
    environment: Environment;
    size?: 'small' | 'default' | 'large';
    showIcon?: boolean;
    variant?: 'elevated' | 'flat' | 'tonal' | 'outlined';
    color?: string;
    textColor?: string;
  }>(),
  {
    size: 'small',
    showIcon: false,
    variant: 'elevated',
  }
);

const themeInfo = computed(() => THEME_COLORS[props.environment]);

const iconSize = computed(() => {
  const sizes: Record<'small' | 'default' | 'large', string> = {
    small: 'x-small',
    default: 'small',
    large: 'default',
  };
  return sizes[props.size];
});

const chipSize = computed(() => {
  const sizes: Record<'small' | 'default' | 'large', 'x-small' | 'small' | 'default'> = {
    small: 'x-small',
    default: 'small',
    large: 'default',
  };
  return sizes[props.size];
});

const chipColor = computed(() => props.color || themeInfo.value.primary);
const chipTextColor = computed(() => props.textColor || undefined);

const environmentIcon = computed(() => {
  const icons: Record<Environment, string> = {
    development: 'mdi-code-tags',
    test: 'mdi-test-tube',
    staging: 'mdi-server-network',
    production: 'mdi-database-alert',
  };
  return icons[props.environment];
});

const variant = computed(() => props.variant);
</script>

<style scoped>
.environment-badge {
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: none;
}

.environment-badge__label {
  white-space: nowrap;
}
</style>
