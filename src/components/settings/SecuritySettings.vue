<template>
  <v-card class="security-settings">
    <v-card-title>
      <v-icon start>mdi-shield-lock</v-icon>
      セキュリティ設定
    </v-card-title>

    <v-card-text>
      <div class="current-provider mb-6">
        <div class="text-subtitle-2 text-grey mb-2">現在のセキュリティ方式</div>
        <v-chip
          :color="currentProviderColor"
          variant="elevated"
          size="large"
        >
          <v-icon start>{{ currentProviderIcon }}</v-icon>
          {{ currentProviderName }}
        </v-chip>
        <SecurityLevelIndicator
          v-if="currentProviderInfo"
          :level="currentSecurityLevel"
          class="mt-2"
        />
      </div>

      <v-alert
        v-if="securityStore.error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ securityStore.error }}
      </v-alert>

      <v-divider class="mb-6" />

      <div class="text-subtitle-1 mb-4">セキュリティ方式を選択</div>

      <v-row>
        <v-col
          v-for="provider in availableProviders"
          :key="provider.type"
          cols="12"
          md="4"
        >
          <SecurityProviderCard
            :provider="provider"
            :is-current="provider.type === currentProvider"
            @select="onProviderSelect"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <ProviderChangeDialog
      v-model="showChangeDialog"
      :from-provider="currentProvider"
      :to-provider="selectedProvider"
      :providers="availableProviders"
      :loading="securityStore.isLoading"
      @confirm="onProviderChange"
      @cancel="handleCancelChange"
    />
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ProviderChangeDialog from '@/components/settings/ProviderChangeDialog.vue';
import SecurityLevelIndicator from '@/components/settings/SecurityLevelIndicator.vue';
import SecurityProviderCard from '@/components/settings/SecurityProviderCard.vue';
import { useSecurityStore } from '@/stores/security';
import type { ProviderChangeParams, SecurityProviderType } from '@/types/security';

const securityStore = useSecurityStore();

const showChangeDialog = ref(false);
const selectedProvider = ref<SecurityProviderType | null>(null);

const currentProvider = computed(() => securityStore.currentProvider);
const currentProviderInfo = computed(() => securityStore.currentProviderInfo);
const currentSecurityLevel = computed(() => securityStore.currentSecurityLevel);
const availableProviders = computed(() => securityStore.availableProviders);

const currentProviderName = computed(
  () => currentProviderInfo.value?.displayName ?? '未設定'
);

const currentProviderIcon = computed(() => {
  switch (currentProvider.value) {
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

const currentProviderColor = computed(() => {
  switch (currentProvider.value) {
    case 'simple':
      return 'grey';
    case 'master_password':
      return 'primary';
    case 'keychain':
      return 'success';
    default:
      return 'grey';
  }
});

const onProviderSelect = (providerType: SecurityProviderType) => {
  if (providerType !== currentProvider.value) {
    selectedProvider.value = providerType;
    showChangeDialog.value = true;
  }
};

const onProviderChange = async (params: ProviderChangeParams) => {
  const targetProvider = params.targetProvider ?? selectedProvider.value;
  if (!targetProvider) return;

  try {
    await securityStore.changeProvider({
      ...params,
      targetProvider,
    });
  } catch (error) {
    console.error('Failed to change provider:', error);
  } finally {
    showChangeDialog.value = false;
    selectedProvider.value = null;
  }
};

const handleCancelChange = () => {
  showChangeDialog.value = false;
  selectedProvider.value = null;
};

onMounted(() => {
  if (!securityStore.config) {
    securityStore.loadConfig();
  }
});
</script>

<style scoped>
.security-settings {
  min-height: 520px;
}
</style>
