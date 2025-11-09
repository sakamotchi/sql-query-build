import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

vi.mock('./pages/launcher.vue', () => ({
  default: {
    name: 'MockLauncherPage',
    template: '<div data-testid="launcher-page">Launcher</div>',
  },
}));

vi.mock('./pages/query-builder.vue', () => ({
  default: {
    name: 'MockQueryBuilderPage',
    template: '<div data-testid="query-builder-page">QueryBuilder</div>',
  },
}));

describe('App.vue', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('初期表示でランチャーページを表示する', () => {
    const wrapper = mount(App);
    expect(wrapper.find('[data-testid="launcher-page"]').exists()).toBe(true);
  });

  it('query-builderパスではクエリビルダーページを表示する', () => {
    window.history.replaceState({}, '', '/query-builder?environment=test');
    const wrapper = mount(App);
    expect(wrapper.find('[data-testid="query-builder-page"]').exists()).toBe(true);
  });
});
