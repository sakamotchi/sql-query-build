<template>
  <div class="password-requirements">
    <div class="text-caption text-grey mb-2">パスワードの要件</div>
    <div
      v-for="req in requirements"
      :key="req.text"
      class="requirement-item d-flex align-center mb-1"
    >
      <v-icon
        :icon="req.met ? 'mdi-check-circle' : 'mdi-circle-outline'"
        :color="req.met ? 'success' : 'grey'"
        size="small"
        class="mr-2"
      />
      <span :class="['text-caption', req.met ? 'text-success' : 'text-grey']">
        {{ req.text }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  password: string;
}>();

const requirements = computed(() => [
  {
    text: '8文字以上',
    met: props.password.length >= 8,
  },
  {
    text: '大文字を含む（推奨）',
    met: /[A-Z]/.test(props.password),
  },
  {
    text: '小文字を含む（推奨）',
    met: /[a-z]/.test(props.password),
  },
  {
    text: '数字を含む（推奨）',
    met: /[0-9]/.test(props.password),
  },
  {
    text: '記号を含む（推奨）',
    met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(props.password),
  },
]);
</script>

<style scoped>
.requirement-item {
  transition: color 0.2s ease;
}
</style>
