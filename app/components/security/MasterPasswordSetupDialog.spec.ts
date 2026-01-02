import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { nuxtUiStubs } from '../../../tests/utils/nuxt-ui-stubs'

const loadingRef = ref(false)
const setMasterPassword = vi.fn()
const changeMasterPassword = vi.fn()

vi.mock('pinia', () => ({
  storeToRefs: () => ({ loading: loadingRef }),
}))

vi.mock('~/stores/security', () => ({
  useSecurityStore: () => ({
    setMasterPassword,
    changeMasterPassword,
  }),
}))

vi.mock('@/stores/security', () => ({
  useSecurityStore: () => ({
    setMasterPassword,
    changeMasterPassword,
  }),
}))

const stubs = {
  ...nuxtUiStubs,
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title', 'description', 'preventClose'],
  },
  UFormField: {
    template: '<div><slot /></div>',
    props: ['label', 'hint', 'required'],
  },
  UInput: {
    name: 'UInput',
    template: '<input />',
    props: ['modelValue', 'type', 'placeholder', 'autocomplete'],
    emits: ['update:modelValue'],
  },
  USwitch: {
    name: 'USwitch',
    template: '<input type="checkbox" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'disabled', 'loading', 'color', 'variant'],
    emits: ['click'],
  },
  UAlert: {
    template: '<div data-test="alert"><slot /></div>',
    props: ['color', 'variant', 'icon'],
  },
  PasswordStrengthMeter: {
    template: '<div data-test="strength"></div>',
    props: ['password', 'strength'],
  },
  PasswordRequirements: {
    template: '<div data-test="requirements"></div>',
    props: ['validation'],
  },
}

describe('MasterPasswordSetupDialog', () => {
  let MasterPasswordSetupDialog: typeof import('./MasterPasswordSetupDialog.vue').default

  beforeAll(async () => {
    MasterPasswordSetupDialog = (await import('./MasterPasswordSetupDialog.vue')).default
  })

  beforeEach(() => {
    setMasterPassword.mockReset()
    changeMasterPassword.mockReset()
    loadingRef.value = false
  })

  it('マスターパスワードを設定できる', async () => {
    setMasterPassword.mockResolvedValue()
    const wrapper = mount(MasterPasswordSetupDialog, {
      props: { open: true },
      global: { stubs },
    })

    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    inputs[0].vm.$emit('update:modelValue', 'Abcdef12')
    inputs[1].vm.$emit('update:modelValue', 'Abcdef12')
    await wrapper.vm.$nextTick()

    const submitButton = wrapper.findAll('button').find((btn) => btn.text().includes('設定'))
    await submitButton?.trigger('click')

    expect(setMasterPassword).toHaveBeenCalledWith('Abcdef12')
    expect(wrapper.emitted('update:open')?.[0]?.[0]).toBe(false)
  })

  it('変更モードでパスワードを更新できる', async () => {
    changeMasterPassword.mockResolvedValue()
    const wrapper = mount(MasterPasswordSetupDialog, {
      props: { open: true, mode: 'change' },
      global: { stubs },
    })

    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    inputs[0].vm.$emit('update:modelValue', 'currentPass')
    inputs[1].vm.$emit('update:modelValue', 'Abcdef12')
    inputs[2].vm.$emit('update:modelValue', 'Abcdef12')
    await wrapper.vm.$nextTick()

    const submitButton = wrapper.findAll('button').find((btn) => btn.text().includes('変更'))
    await submitButton?.trigger('click')

    expect(changeMasterPassword).toHaveBeenCalledWith('currentPass', 'Abcdef12')
    expect(wrapper.emitted('update:open')?.[0]?.[0]).toBe(false)
  })

  it('設定失敗時にエラーメッセージを表示する', async () => {
    setMasterPassword.mockRejectedValue(new Error('fail'))
    const wrapper = mount(MasterPasswordSetupDialog, {
      props: { open: true },
      global: { stubs },
    })

    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    inputs[0].vm.$emit('update:modelValue', 'Abcdef12')
    inputs[1].vm.$emit('update:modelValue', 'Abcdef12')
    await wrapper.vm.$nextTick()

    const submitButton = wrapper.findAll('button').find((btn) => btn.text().includes('設定'))
    await submitButton?.trigger('click')

    expect(wrapper.find('[data-test="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('設定に失敗しました')
  })
})
