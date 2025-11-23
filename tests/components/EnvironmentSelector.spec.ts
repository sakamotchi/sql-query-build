import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EnvironmentSelector from '@/components/connection/EnvironmentSelector.vue';
import { createVuetifyStubs } from '../utils/vuetifyStubs';

const vuetifyStubs = createVuetifyStubs();

describe('EnvironmentSelector', () => {
  const mountComponent = () =>
    mount(EnvironmentSelector, {
      global: {
        stubs: vuetifyStubs,
      },
      props: {
        modelValue: 'development',
      },
    });

  it('環境オプションがすべて表示されること', () => {
    const wrapper = mountComponent();
    const radios = wrapper.findAll('v-radio');
    expect(radios).toHaveLength(4);
  });

  it('選択変更時にupdate:modelValueがemitされること', async () => {
    const wrapper = mountComponent();
    (wrapper.vm as any).handleChange('production');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(['production']);
  });
});
