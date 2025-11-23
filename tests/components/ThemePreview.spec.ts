import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { THEME_COLORS } from '@/types/theme';
import ThemePreview from '@/components/connection/ThemePreview.vue';
import { createVuetifyStubs } from '../utils/vuetifyStubs';

const vuetifyStubs = createVuetifyStubs();

const factory = (props: Record<string, unknown> = {}) =>
  mount(ThemePreview, {
    global: {
      stubs: vuetifyStubs,
    },
    props: {
      environment: 'development',
      ...props,
    },
  });

describe('ThemePreview', () => {
  it('テーマカラーがヘッダーに適用されること', () => {
    const wrapper = factory({ environment: 'production' });
    const headerStyle = wrapper.find('.preview-header').attributes('style');
    expect(headerStyle?.toLowerCase()).toContain(THEME_COLORS.production.primary.toLowerCase());
  });

  it('本番環境では警告バナーを表示すること', () => {
    const wrapper = factory({ environment: 'production' });
    expect(wrapper.find('.preview-warning-banner').exists()).toBe(true);
  });

  it('開発環境では警告バナーを非表示にすること', () => {
    const wrapper = factory({ environment: 'development' });
    expect(wrapper.find('.preview-warning-banner').exists()).toBe(false);
  });

  it('カラーパレットが3色以上表示されること', () => {
    const wrapper = factory();
    const swatches = wrapper.findAll('.color-swatch');
    expect(swatches.length).toBeGreaterThanOrEqual(3);
  });

  it('接続名のデフォルトを表示すること', () => {
    const wrapper = factory({ environment: 'test' });
    expect(wrapper.text()).toContain('サンプル接続');
  });
});
