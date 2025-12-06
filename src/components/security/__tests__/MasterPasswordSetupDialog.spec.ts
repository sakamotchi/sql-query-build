import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import MasterPasswordSetupDialog from '../MasterPasswordSetupDialog.vue';
import { securityApi } from '@/api/security';

vi.mock('@/api/security', () => {
  const checkPasswordStrength = vi.fn();
  const initializeMasterPassword = vi.fn();

  return {
    securityApi: {
      checkPasswordStrength,
      initializeMasterPassword,
    },
  };
});

const createSimpleStub = (tag: string) =>
  defineComponent({
    name: `${tag}-stub`,
    setup(_, { slots }) {
      return () => h(tag, { class: `${tag}-stub` }, slots.default?.());
    },
  });

const VDialogStub = defineComponent({
  name: 'VDialogStub',
  props: { modelValue: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'v-dialog-stub' }, slots.default?.()) : null);
  },
});

const VFormStub = defineComponent({
  name: 'VFormStub',
  props: { modelValue: { type: Boolean, default: true } },
  emits: ['update:modelValue'],
  setup(props, { slots, emit, expose }) {
    const validate = () => {
      emit('update:modelValue', props.modelValue);
      return props.modelValue;
    };

    emit('update:modelValue', props.modelValue);
    expose({ validate });

    return () => h('form', { class: 'v-form-stub' }, slots.default?.());
  },
});

const VTextFieldStub = defineComponent({
  name: 'VTextFieldStub',
  props: {
    modelValue: { type: String, default: '' },
    type: { type: String, default: 'text' },
    appendInnerIcon: { type: String, default: undefined },
  },
  emits: ['update:modelValue', 'click:append-inner', 'input'],
  setup(props, { emit }) {
    const handleInput = (event: Event) => {
      const value = (event.target as HTMLInputElement).value;
      emit('update:modelValue', value);
      emit('input', value);
    };

    const handleAppendClick = () => emit('click:append-inner');

    return () =>
      h('div', { class: 'v-text-field-stub' }, [
        h('input', {
          value: props.modelValue,
          type: props.type,
          onInput: handleInput,
        }),
        props.appendInnerIcon
          ? h(
              'button',
              {
                type: 'button',
                class: 'append-inner',
                onClick: handleAppendClick,
              },
              props.appendInnerIcon
            )
          : null,
      ]);
  },
});

const VBtnStub = defineComponent({
  name: 'VBtnStub',
  props: { disabled: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          class: 'v-btn-stub',
          disabled: props.disabled,
          onClick: (event: Event) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

const createStubs = () => ({
  'v-dialog': VDialogStub,
  'v-card': createSimpleStub('div'),
  'v-card-title': createSimpleStub('div'),
  'v-card-text': createSimpleStub('div'),
  'v-card-actions': createSimpleStub('div'),
  'v-alert': createSimpleStub('div'),
  'v-icon': createSimpleStub('span'),
  'v-form': VFormStub,
  'v-text-field': VTextFieldStub,
  'v-btn': VBtnStub,
  'v-spacer': createSimpleStub('div'),
});

describe('MasterPasswordSetupDialog', () => {
  const mockedApi = vi.mocked(securityApi);

  const mountDialog = () =>
    mount(MasterPasswordSetupDialog, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: createStubs(),
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.checkPasswordStrength.mockResolvedValue({
      isValid: true,
      strength: 'very_weak',
      errors: [],
      suggestions: [],
    });
    mockedApi.initializeMasterPassword.mockResolvedValue(undefined);
  });

  it('パスワード入力で強度チェックを行う', async () => {
    const wrapper = mountDialog();
    mockedApi.checkPasswordStrength.mockResolvedValueOnce({
      isValid: true,
      strength: 'strong',
      errors: [],
      suggestions: [],
    });

    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    await inputs[0].setValue('StrongP@ss123!');
    await flushPromises();

    expect(mockedApi.checkPasswordStrength).toHaveBeenCalledWith('StrongP@ss123!');
    expect((wrapper.vm as any).passwordStrength).toBe('strong');
  });

  it('設定成功時にAPIを呼び出して success を emit する', async () => {
    const wrapper = mountDialog();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('Password123!');
    await inputs[1].setValue('Password123!');

    const vm = wrapper.vm as any;
    vm.isFormValid = true;
    vm.form = { validate: () => true };

    await vm.onSubmit();

    await flushPromises();

    expect(mockedApi.initializeMasterPassword).toHaveBeenCalledWith('Password123!', 'Password123!');
    expect(wrapper.emitted('success')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('キャンセルで入力と強度をリセットする', async () => {
    const wrapper = mountDialog();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('Password123!');
    await inputs[1].setValue('Password123!');

    const cancelButton = wrapper.findAll('button').find(button => button.text() === 'キャンセル');
    expect(cancelButton).toBeDefined();
    await cancelButton?.trigger('click');

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect((wrapper.vm as any).password).toBe('');
    expect((wrapper.vm as any).passwordConfirm).toBe('');
    expect((wrapper.vm as any).passwordStrength).toBe('very_weak');
  });

  it('API エラー時にメッセージを表示する', async () => {
    mockedApi.initializeMasterPassword.mockRejectedValueOnce(new Error('設定に失敗しました'));
    const wrapper = mountDialog();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Password123!');
    await inputs[1].setValue('Password123!');

    const vm = wrapper.vm as any;
    vm.isFormValid = true;
    vm.form = { validate: () => true };

    await vm.onSubmit();
    await flushPromises();

    expect(wrapper.text()).toContain('設定に失敗しました');
  });
});
