<template>
  <div class="security-level-indicator d-flex align-center">
    <span class="text-caption text-grey mr-2">セキュリティレベル:</span>
    <div class="level-bars d-flex">
      <div
        v-for="i in 3"
        :key="i"
        :class="['level-bar', { active: i <= level }]"
        :style="{ backgroundColor: i <= level ? color : undefined }"
      />
    </div>
    <span :class="['text-caption ml-2', `text-${textColor}`]">
      {{ levelText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  level: number;
}>();

const levelText = computed(() => {
  switch (props.level) {
    case 1:
      return '低';
    case 2:
      return '高';
    case 3:
      return '最高';
    default:
      return '';
  }
});

const color = computed(() => {
  switch (props.level) {
    case 1:
      return '#9e9e9e';
    case 2:
      return '#1976d2';
    case 3:
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
});

const textColor = computed(() => {
  switch (props.level) {
    case 1:
      return 'grey';
    case 2:
      return 'primary';
    case 3:
      return 'success';
    default:
      return 'grey';
  }
});
</script>

<style scoped>
.level-bars {
  gap: 4px;
}

.level-bar {
  width: 20px;
  height: 8px;
  border-radius: 2px;
  background-color: #e0e0e0;
  transition: background-color 0.3s ease;
}
</style>
