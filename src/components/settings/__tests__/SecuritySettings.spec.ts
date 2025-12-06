import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SecuritySettings from '../SecuritySettings.vue';
import { useSecurityStore } from '@/stores/security';
import type { SecurityConfig, SecurityProviderInfo } from '@/types/security';

const vuetifyStubs = {
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
  'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
  'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
  'v-icon': { template: '<span class="v-icon"><slot /></span>' },
  'v-chip': { template: '<div class="v-chip"><slot /></div>' },
  'v-row': { template: '<div class="v-row"><slot /></div>' },
  'v-col': { template: '<div class="v-col"><slot /></div>' },
  'v-divider': { template: '<div class="v-divider"></div>' },
  'v-alert': { template: '<div class="v-alert"><slot /></div>' },
  'v-btn': {
    template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
  },
  'v-avatar': { template: '<div class="v-avatar"><slot /></div>' },
  'v-card-item': { template: '<div class="v-card-item"><slot /></div>' },
};

const providerCardStub = {
  props: ['provider', 'isCurrent'],
  template:
    '<div class="provider-card" @click="$emit(\'select\', provider.type)">{{ provider.displayName }}</div>',
};

const providerChangeDialogStub = {
  props: ['modelValue', 'toProvider'],
  emits: ['update:modelValue', 'confirm', 'cancel'],
  template: `
    <div v-if="modelValue" class="provider-change-dialog">
      <button class="confirm" @click="$emit('confirm', { targetProvider: toProvider })">confirm</button>
    </div>
  `,
};

const levelIndicatorStub = {
  template: '<div class="level-indicator"></div>',
};

const baseProviders: SecurityProviderInfo[] = [
  {
    type: 'simple',
    displayName: 'Simple',
    description: 'Simple description',
    securityLevel: 1,
    state: 'ready',
    needsInitialization: false,
    needsUnlock: false,
  },
  {
    type: 'master_password',
    displayName: 'Master Password',
    description: 'Master description',
    securityLevel: 2,
    state: 'ready',
    needsInitialization: true,
    needsUnlock: true,
  },
];

const baseConfig: SecurityConfig = {
  version: 1,
  providerType: 'simple',
  providerConfig: { providerConfigType: 'Simple' },
  createdAt: '',
  updatedAt: '',
};

const createWrapper = () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSecurityStore();

  store.config = { ...baseConfig };
  store.availableProviders = [...baseProviders];
  store.isLoading = false;
  store.error = null;
  store.loadConfig = vi.fn();
  store.changeProvider = vi.fn();

  const wrapper = mount(SecuritySettings, {
    global: {
      plugins: [pinia],
      stubs: {
        ...vuetifyStubs,
        SecurityProviderCard: providerCardStub,
        ProviderChangeDialog: providerChangeDialogStub,
        SecurityLevelIndicator: levelIndicatorStub,
      },
    },
  });

  return { wrapper, store };
};

describe('SecuritySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('現在のプロバイダー名を表示する', () => {
    const { wrapper } = createWrapper();
    expect(wrapper.text()).toContain('Simple');
    wrapper.unmount();
  });

  it('別のプロバイダー選択時に変更ダイアログを開く', async () => {
    const { wrapper, store } = createWrapper();

    const cards = wrapper.findAll('.provider-card');
    expect(cards.length).toBeGreaterThan(1);

    await cards[1].trigger('click');
    expect(wrapper.find('.provider-change-dialog').exists()).toBe(true);

    await wrapper.find('.confirm').trigger('click');
    expect(store.changeProvider).toHaveBeenCalledWith({
      targetProvider: 'master_password',
    });

    wrapper.unmount();
  });
});
