import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import App from './App.vue';

vi.mock('./pages/launcher.vue', () => ({
  default: defineComponent({
    name: 'MockLauncherPage',
    template: '<div class="mock-launcher">Launcher Page</div>',
  }),
}));

vi.mock('./pages/query-builder.vue', () => ({
  default: defineComponent({
    name: 'MockQueryBuilderPage',
    template: '<div class="mock-query-builder">Query Builder</div>',
  }),
}));

const setWindowLocation = (url: string) => {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true,
    configurable: true,
  });
};

describe('App.vue', () => {
  beforeEach(() => {
    setWindowLocation('http://localhost/');
  });

  it('ルートパスではランチャーを表示する', () => {
    const wrapper = mount(App);
    expect(wrapper.find('.mock-launcher').exists()).toBe(true);
    expect(wrapper.find('.mock-query-builder').exists()).toBe(false);
  });

  it('query-builderパスではクエリビルダーを表示する', () => {
    setWindowLocation('http://localhost/query-builder?connectionId=1');
    const wrapper = mount(App);
    expect(wrapper.find('.mock-query-builder').exists()).toBe(true);
    expect(wrapper.find('.mock-launcher').exists()).toBe(false);
  });
});
