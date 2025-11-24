import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import QueryBuilderLayout from './QueryBuilderLayout.vue';
import QueryBuilderToolbar from './QueryBuilderToolbar.vue';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });
}

const vuetifyStubs = {
  'v-toolbar': {
    template: '<div class="v-toolbar"><slot /></div>',
  },
  'v-btn': {
    props: ['title'],
    template:
      '<button v-bind="$attrs" :title="title" @click="$emit(\'click\')" @mousedown="$emit(\'mousedown\', $event)"><slot /></button>',
  },
  'v-icon': {
    template: '<span class="v-icon"><slot /></span>',
  },
  'v-divider': {
    template: '<div class="v-divider"></div>',
  },
  'v-spacer': {
    template: '<div class="v-spacer"></div>',
  },
  'v-text-field': {
    props: ['modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target ? $event.target.value : \'\')" />',
  },
  'v-tabs': {
    props: ['modelValue'],
    template: '<div class="v-tabs"><slot /></div>',
  },
  'v-tab': {
    template: '<button class="v-tab" @click="$emit(\'click\')"><slot /></button>',
  },
  'v-window': {
    props: ['modelValue'],
    template: '<div class="v-window"><slot /></div>',
  },
  'v-window-item': {
    props: ['value'],
    template: '<div class="v-window-item"><slot /></div>',
  },
  'v-list': {
    template: '<ul class="v-list"><slot /></ul>',
  },
  'v-list-item': {
    template: '<li class="v-list-item"><slot /></li>',
  },
  'v-list-item-title': {
    template: '<div class="v-list-item-title"><slot /></div>',
  },
  'v-list-item-subtitle': {
    template: '<div class="v-list-item-subtitle"><slot /></div>',
  },
  'v-chip': {
    template: '<span class="v-chip"><slot /></span>',
  },
  'v-table': {
    template: '<table class="v-table"><slot /></table>',
  },
  'v-alert': {
    template: '<div class="v-alert"><slot /></div>',
  },
};

const mountLayout = (pinia: Pinia) =>
  mount(QueryBuilderLayout, {
    global: {
      plugins: [pinia],
      stubs: vuetifyStubs,
    },
  });

describe('QueryBuilderLayout', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('3カラムレイアウトを表示する', () => {
    const wrapper = mountLayout(pinia);

    expect(wrapper.find('.left-panel-container').exists()).toBe(true);
    expect(wrapper.find('.center-panel-container').exists()).toBe(true);
    expect(wrapper.find('.right-panel-container').exists()).toBe(true);

    wrapper.unmount();
  });

  it('左パネルを折りたたみ/展開できる', async () => {
    const wrapper = mountLayout(pinia);

    const toolbar = wrapper.getComponent(QueryBuilderToolbar);
    toolbar.vm.$emit('toggle-left-panel');
    await nextTick();
    expect(wrapper.find('.left-panel-container').exists()).toBe(false);
    expect(wrapper.find('.left-collapsed').exists()).toBe(true);

    await wrapper.get('.left-collapsed').trigger('click');
    await nextTick();
    expect(wrapper.find('.left-panel-container').exists()).toBe(true);

    wrapper.unmount();
  });

  it('結果パネルをトグルできる', async () => {
    const wrapper = mountLayout(pinia);

    const toolbar = wrapper.getComponent(QueryBuilderToolbar);
    const toggleResult = () => toolbar.vm.$emit('toggle-result-panel');
    expect(wrapper.find('.result-panel-container').exists()).toBe(false);

    toggleResult();
    await nextTick();
    expect(wrapper.find('.result-panel-container').exists()).toBe(true);

    toggleResult();
    await nextTick();
    expect(wrapper.find('.result-panel-container').exists()).toBe(false);

    wrapper.unmount();
  });
});
