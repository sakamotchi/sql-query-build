import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EnvironmentIndicator from '../EnvironmentIndicator.vue';
import { createVuetifyStubs } from '../../../../tests/utils/vuetifyStubs';

vi.mock('@/composables/useWindow', () => ({
  useWindow: () => ({
    environment: { value: 'production' },
  }),
}));

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    currentThemeInfo: { value: { primary: '#F44336' } },
    isProductionTheme: { value: true },
    isStagingTheme: { value: false },
  }),
}));

describe('EnvironmentIndicator', () => {
  const vuetifyStubs = createVuetifyStubs();

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('本番環境を表示できる', () => {
    const wrapper = mount(EnvironmentIndicator, {
      global: {
        stubs: vuetifyStubs,
      },
    });

    expect(wrapper.text()).toContain('本番環境');
  });
});
