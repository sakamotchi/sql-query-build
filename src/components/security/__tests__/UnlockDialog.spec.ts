import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, PropType } from 'vue';
import UnlockDialog from '../UnlockDialog.vue';
import { useSecurityStore } from '@/stores/security';

const createSimpleStub = (tag: string) =>
  defineComponent({
    name: `${tag}-stub`,
    setup(_, { slots }) {
      return () => h(tag, { class: `${tag}-stub` }, slots.default?.());
    },
  });

const VDialogStub = defineComponent({
  name: 'VDialogStub',
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'v-dialog-stub' }, slots.default?.()) : null);
  },
});

const VFormStub = defineComponent({
  name: 'VFormStub',
  props: { modelValue: { type: Boolean, default: true } },
  emits: ['update:modelValue', 'submit'],
  setup(props, { slots, emit, expose }) {
    const validate = () => {
      emit('update:modelValue', props.modelValue);
      return props.modelValue;
    };

    emit('update:modelValue', props.modelValue);
    expose({ validate });

    return () =>
      h(
        'form',
        {
          class: 'v-form-stub',
          onSubmit: (event: Event) => {
            event.preventDefault();
            emit('submit', event);
          },
        },
        slots.default?.()
      );
  },
});

const VTextFieldStub = defineComponent({
  name: 'VTextFieldStub',
  props: {
    modelValue: { type: String, default: '' },
    type: { type: String, default: 'text' },
    appendInnerIcon: { type: String, default: undefined },
    errorMessages: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  },
  emits: ['update:modelValue', 'click:append-inner', 'keyup:enter'],
  setup(props, { emit }) {
    const handleInput = (event: Event) => {
      const value = (event.target as HTMLInputElement).value;
      emit('update:modelValue', value);
    };

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        emit('keyup:enter', event);
      }
    };

    return () =>
      h('div', { class: 'v-text-field-stub' }, [
        h('input', {
          value: props.modelValue,
          type: props.type,
          onInput: handleInput,
          onKeyup: handleKeyup,
        }),
        props.appendInnerIcon
          ? h(
              'button',
              {
                type: 'button',
                class: 'append-inner',
                onClick: () => emit('click:append-inner'),
              },
              props.appendInnerIcon
            )
          : null,
        props.errorMessages?.length
          ? h(
              'div',
              { class: 'error-messages' },
              props.errorMessages.join(' ')
            )
          : null,
      ]);
  },
});

const VBtnStub = defineComponent({
  name: 'VBtnStub',
  props: {
    disabled: { type: Boolean, default: false },
    type: { type: String, default: 'button' },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          class: 'v-btn-stub',
          type: props.type as 'button' | 'submit',
          disabled: props.disabled,
          onClick: (event: Event) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

const VFadeTransitionStub = defineComponent({
  name: 'VFadeTransitionStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'v-fade-transition-stub' }, slots.default?.());
  },
});

const createStubs = () => ({
  'v-dialog': VDialogStub,
  'v-card': createSimpleStub('div'),
  'v-card-item': createSimpleStub('div'),
  'v-card-title': createSimpleStub('div'),
  'v-card-subtitle': createSimpleStub('div'),
  'v-card-text': createSimpleStub('div'),
  'v-card-actions': createSimpleStub('div'),
  'v-avatar': createSimpleStub('div'),
  'v-icon': createSimpleStub('span'),
  'v-form': VFormStub,
  'v-text-field': VTextFieldStub,
  'v-btn': VBtnStub,
  'v-alert': createSimpleStub('div'),
  'v-spacer': createSimpleStub('div'),
  'v-fade-transition': VFadeTransitionStub,
});

const mountDialog = () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSecurityStore();

  store.unlock = vi.fn().mockResolvedValue(undefined) as any;
  store.reset = vi.fn().mockResolvedValue(undefined) as any;

  const wrapper = mount(UnlockDialog, {
    props: {
      modelValue: true,
    },
    global: {
      plugins: [pinia],
      stubs: createStubs(),
    },
  });

  return { wrapper, store };
};

describe('UnlockDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ダイアログが表示される', () => {
    const { wrapper } = mountDialog();
    expect(wrapper.find('.unlock-dialog').exists()).toBe(true);
    wrapper.unmount();
  });

  it('正しいパスワードでアンロックする', async () => {
    const { wrapper, store } = mountDialog();
    const input = wrapper.find('input');
    await input.setValue('correct-password');

    const vm = wrapper.vm as any;
    vm.isFormValid = true;
    vm.form = { validate: () => true };

    await vm.onSubmit();
    await flushPromises();

    expect(store.unlock).toHaveBeenCalledWith('correct-password');
    expect(wrapper.emitted('unlocked')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false]);

    wrapper.unmount();
  });

  it('間違ったパスワードでエラーを表示する', async () => {
    const { wrapper, store } = mountDialog();
    (store.unlock as any).mockRejectedValueOnce(new Error('invalid'));

    await wrapper.find('input').setValue('wrong-password');
    const vm = wrapper.vm as any;
    vm.isFormValid = true;
    vm.form = { validate: () => true };

    await vm.onSubmit();
    await flushPromises();

    expect(wrapper.text()).toContain('認証に失敗しました');
    wrapper.unmount();
  });

  it('最大試行回数でロックアウトする', async () => {
    vi.useFakeTimers();
    const { wrapper, store } = mountDialog();
    (store.unlock as any).mockRejectedValue(new Error('invalid'));

    const vm = wrapper.vm as any;
    vm.isFormValid = true;
    vm.form = { validate: () => true };

    for (let i = 0; i < 5; i += 1) {
      await vm.onSubmit();
      await flushPromises();
    }

    expect(wrapper.text()).toContain('ロックされています');

    vi.advanceTimersByTime(30000);
    await flushPromises();
    wrapper.unmount();
  });

  it('リセット確認からリセットを実行する', async () => {
    const { wrapper, store } = mountDialog();

    const resetLink = wrapper.findAll('.v-btn-stub').find(button =>
      button.text().includes('パスワードを忘れた場合')
    );
    expect(resetLink).toBeDefined();
    await resetLink?.trigger('click');

    const resetButton = wrapper.findAll('.v-btn-stub').find(button =>
      button.text().includes('リセットする')
    );
    expect(resetButton).toBeDefined();
    await resetButton?.trigger('click');
    await flushPromises();

    expect(store.reset).toHaveBeenCalled();
    expect(wrapper.emitted('reset')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false]);

    wrapper.unmount();
  });
});
