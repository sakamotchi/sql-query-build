<template>
  <v-card
    :class="['provider-card', { 'is-current': isCurrent }]"
    :color="isCurrent ? 'primary' : undefined"
    :variant="isCurrent ? 'elevated' : 'outlined'"
    @click="$emit('select', provider.type)"
  >
    <v-card-item>
      <template #prepend>
        <v-avatar :color="iconColor" size="48">
          <v-icon :icon="icon" size="24" />
        </v-avatar>
      </template>

      <v-card-title>{{ provider.displayName }}</v-card-title>
      <v-card-subtitle>{{ securityLevelText }}</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <p class="text-body-2 mb-3">{{ provider.description }}</p>

      <div class="features">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-item d-flex align-center mb-1"
        >
          <v-icon
            :icon="feature.available ? 'mdi-check-circle' : 'mdi-close-circle'"
            :color="feature.available ? 'success' : 'grey'"
            size="small"
            class="mr-2"
          />
          <span class="text-body-2">{{ feature.text }}</span>
        </div>
      </div>
    </v-card-text>

    <v-card-actions v-if="!isCurrent">
      <v-btn
        color="primary"
        variant="tonal"
        block
        @click.stop="$emit('select', provider.type)"
      >
        この方式に変更
      </v-btn>
    </v-card-actions>

    <v-card-actions v-else>
      <v-chip color="white" variant="flat" block>
        <v-icon start>mdi-check</v-icon>
        現在使用中
      </v-chip>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SecurityProviderInfo, SecurityProviderType } from '@/types/security';

const props = defineProps<{
  provider: SecurityProviderInfo;
  isCurrent: boolean;
}>();

defineEmits<{
  select: [type: SecurityProviderType];
}>();

const icon = computed(() => {
  switch (props.provider.type) {
    case 'simple':
      return 'mdi-lock-open-outline';
    case 'master_password':
      return 'mdi-key';
    case 'keychain':
      return 'mdi-shield-check';
    default:
      return 'mdi-lock';
  }
});

const iconColor = computed(() => {
  if (props.isCurrent) return 'white';
  switch (props.provider.type) {
    case 'simple':
      return 'grey-lighten-2';
    case 'master_password':
      return 'primary-lighten-4';
    case 'keychain':
      return 'success-lighten-4';
    default:
      return 'grey-lighten-2';
  }
});

const securityLevelText = computed(() => {
  switch (props.provider.securityLevel) {
    case 1:
      return 'セキュリティレベル: 低';
    case 2:
      return 'セキュリティレベル: 高';
    case 3:
      return 'セキュリティレベル: 最高';
    default:
      return '';
  }
});

const features = computed(() => {
  switch (props.provider.type) {
    case 'simple':
      return [
        { text: 'パスワード入力不要', available: true },
        { text: '即座に起動可能', available: true },
        { text: '高度な暗号化', available: false },
        { text: '生体認証', available: false },
      ];
    case 'master_password':
      return [
        { text: 'パスワード入力不要', available: false },
        { text: '高度な暗号化', available: true },
        { text: 'ユーザーのみ復号可能', available: true },
        { text: '生体認証', available: false },
      ];
    case 'keychain':
      return [
        { text: 'パスワード入力不要', available: true },
        { text: 'OSレベルのセキュリティ', available: true },
        { text: '高度な暗号化', available: true },
        { text: '生体認証対応', available: true },
      ];
    default:
      return [];
  }
});
</script>

<style scoped>
.provider-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
}

.provider-card:hover:not(.is-current) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.is-current {
  cursor: default;
}

.feature-item {
  font-size: 0.875rem;
}
</style>
