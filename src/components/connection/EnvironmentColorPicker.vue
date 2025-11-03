<template>
  <div class="environment-color-picker">
    <div class="text-subtitle-2 mb-2">テーマカラー</div>
    <v-item-group v-model="selectedColor" mandatory>
      <v-row>
        <v-col
          v-for="color in colorOptions"
          :key="color.value"
          cols="3"
        >
          <v-item v-slot="{ isSelected, toggle }" :value="color.value">
            <v-card
              :color="color.value"
              :variant="isSelected ? 'elevated' : 'outlined'"
              :elevation="isSelected ? 4 : 0"
              @click="toggle"
              class="color-card"
            >
              <v-card-text class="text-center pa-2">
                <div
                  class="color-preview"
                  :style="{ backgroundColor: color.value }"
                ></div>
                <div class="text-caption mt-1">{{ color.label }}</div>
                <v-icon v-if="isSelected" color="white" size="small">
                  mdi-check-circle
                </v-icon>
              </v-card-text>
            </v-card>
          </v-item>
        </v-col>
      </v-row>
    </v-item-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Environment } from '@/types/connection';

const props = defineProps<{
  modelValue: string;
  environment: Environment;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const selectedColor = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const colorOptions = computed(() => {
  const baseColors: Record<Environment, Array<{ label: string; value: string }>> = {
    development: [
      { label: '緑', value: '#4CAF50' },
      { label: '明緑', value: '#81C784' },
      { label: '濃緑', value: '#388E3C' },
    ],
    test: [
      { label: '青', value: '#2196F3' },
      { label: '明青', value: '#64B5F6' },
      { label: '濃青', value: '#1976D2' },
    ],
    staging: [
      { label: 'オレンジ', value: '#FF9800' },
      { label: '明オレンジ', value: '#FFB74D' },
      { label: '濃オレンジ', value: '#F57C00' },
    ],
    production: [
      { label: '赤', value: '#F44336' },
      { label: '明赤', value: '#E57373' },
      { label: '濃赤', value: '#D32F2F' },
    ],
  };

  return baseColors[props.environment] || baseColors.development;
});
</script>

<style scoped lang="scss">
.color-card {
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 auto;
  border: 2px solid rgba(0, 0, 0, 0.1);
}
</style>
