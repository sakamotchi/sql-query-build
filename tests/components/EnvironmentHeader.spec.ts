import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import EnvironmentHeader from '@/components/common/EnvironmentHeader.vue';
import { createVuetifyStubs } from '../utils/vuetifyStubs';

const mockThemeInfo = computed(() => ({
  name: 'development',
  label: '開発環境',
  primary: '#4CAF50',
  secondary: '#66BB6A',
  background: '#F1F8E9',
  description: 'mock',
}));

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    currentThemeInfo: mockThemeInfo,
    isProductionTheme: computed(() => false),
    isStagingTheme: computed(() => false),
    needsWarning: computed(() => false),
  }),
}));

const vuetifyStubs = createVuetifyStubs();

describe('EnvironmentHeader', () => {
  const defaultProps = {
    environment: 'development' as const,
    connectionId: 'conn-1',
    connectionName: 'Dev DB',
    dbType: 'postgresql' as const,
    host: 'localhost',
    port: 5432,
    database: 'dev_db',
    connected: true,
  };

  const factory = (props?: Partial<typeof defaultProps>) =>
    mount(EnvironmentHeader, {
      global: {
        stubs: vuetifyStubs,
      },
      props: {
        ...defaultProps,
        ...props,
      },
    });

  it('環境情報と接続詳細が表示されること', () => {
    const wrapper = factory();
    expect(wrapper.text()).toContain('開発環境');
    expect(wrapper.text()).toContain('Dev DB');
    expect(wrapper.text()).toContain('localhost:5432');
    expect(wrapper.text()).toContain('dev_db');
  });

  it('設定ボタンでsettingsイベントがemitされること', async () => {
    const wrapper = factory();
    await wrapper.find('[data-testid="header-settings-btn"]').trigger('click');
    expect(wrapper.emitted('settings')).toBeTruthy();
  });

  it('切断ボタンでdisconnectイベントがemitされること', async () => {
    const wrapper = factory();
    await wrapper.find('[data-testid="header-disconnect-btn"]').trigger('click');
    expect(wrapper.emitted('disconnect')).toBeTruthy();
  });

  it('接続状態に応じてチップ表示が変わること', async () => {
    const wrapper = factory();
    expect(wrapper.text()).toContain('接続中');

    await wrapper.setProps({ connected: false });
    expect(wrapper.text()).toContain('切断');
    expect(wrapper.find('[data-testid="header-disconnect-btn"]').exists()).toBe(false);
  });
});
