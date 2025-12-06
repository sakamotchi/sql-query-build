import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { securityApi } from '@/api/security';
import type {
  ProviderChangeParams,
  ProviderState,
  SecurityConfig,
  SecurityProviderInfo,
  SecurityProviderType,
} from '@/types/security';

export const useSecurityStore = defineStore('security', () => {
  const config = ref<SecurityConfig | null>(null);
  const availableProviders = ref<SecurityProviderInfo[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const providerState = ref<ProviderState>('uninitialized');

  const currentProvider = computed<SecurityProviderType>(
    () => config.value?.providerType ?? 'simple'
  );

  const currentProviderInfo = computed(
    () =>
      availableProviders.value.find(provider => provider.type === currentProvider.value) ??
      null
  );

  const currentSecurityLevel = computed(
    () => currentProviderInfo.value?.securityLevel ?? 1
  );

  const needsUnlock = computed(
    () =>
      config.value?.providerType === 'master_password' && providerState.value === 'locked'
  );

  const loadConfig = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const [configResponse, providers] = await Promise.all([
        securityApi.getConfig(),
        securityApi.getAvailableProviders(),
      ]);
      config.value = configResponse;
      availableProviders.value = providers;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  const changeProvider = async (params: ProviderChangeParams) => {
    isLoading.value = true;
    error.value = null;
    try {
      await securityApi.switchProvider(params);
      await loadConfig();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const initialize = async () => {
    await loadConfig();
    try {
      const info = await securityApi.getProviderInfo();
      providerState.value = info.state;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
    }
  };

  const unlock = async (password: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      await securityApi.unlockWithMasterPassword(password);
      providerState.value = 'ready';
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const reset = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await securityApi.resetProvider();
      await loadConfig();
      providerState.value = 'ready';
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    config,
    availableProviders,
    isLoading,
    error,
    providerState,
    currentProvider,
    currentProviderInfo,
    currentSecurityLevel,
    needsUnlock,
    loadConfig,
    changeProvider,
    initialize,
    unlock,
    reset,
  };
});
