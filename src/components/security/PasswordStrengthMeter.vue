<template>
  <div class="password-strength-meter">
    <div class="strength-bars d-flex mb-1">
      <div
        v-for="i in 5"
        :key="i"
        :class="['strength-bar', { active: i <= strengthLevel }]"
        :style="{ backgroundColor: i <= strengthLevel ? color : undefined }"
      />
    </div>
    <div class="d-flex justify-space-between">
      <span :class="['text-caption', `text-${textColor}`]">
        {{ strengthText }}
      </span>
      <span class="text-caption text-grey">
        {{ password.length }} 文字
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PasswordStrength } from '@/types/security';

const props = defineProps<{
  password: string;
  strength: PasswordStrength;
}>();

const strengthLevel = computed(() => {
  switch (props.strength) {
    case 'very_weak':
      return 1;
    case 'weak':
      return 2;
    case 'fair':
      return 3;
    case 'strong':
      return 4;
    case 'very_strong':
      return 5;
    default:
      return 0;
  }
});

const strengthText = computed(() => {
  switch (props.strength) {
    case 'very_weak':
      return 'とても弱い';
    case 'weak':
      return '弱い';
    case 'fair':
      return '普通';
    case 'strong':
      return '強い';
    case 'very_strong':
      return 'とても強い';
    default:
      return '';
  }
});

const color = computed(() => {
  switch (props.strength) {
    case 'very_weak':
      return '#f44336';
    case 'weak':
      return '#ff9800';
    case 'fair':
      return '#ffeb3b';
    case 'strong':
      return '#8bc34a';
    case 'very_strong':
      return '#4caf50';
    default:
      return '#e0e0e0';
  }
});

const textColor = computed(() => {
  switch (props.strength) {
    case 'very_weak':
      return 'error';
    case 'weak':
      return 'warning';
    case 'fair':
      return 'warning';
    case 'strong':
      return 'success';
    case 'very_strong':
      return 'success';
    default:
      return 'grey';
  }
});
</script>

<style scoped>
.strength-bars {
  gap: 4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background-color: #e0e0e0;
  transition: background-color 0.3s ease;
}
</style>
