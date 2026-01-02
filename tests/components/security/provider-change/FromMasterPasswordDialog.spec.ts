import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'

const switchFromMasterPassword = vi.fn()
const loadSettings = vi.fn()
const invokeCommand = vi.fn()

vi.mock('~/composables/useProviderSwitch', () => ({
  useProviderSwitch: () => ({
    switchFromMasterPassword,
  }),
}))

vi.mock('@/composables/useProviderSwitch', () => ({
  useProviderSwitch: () => ({
    switchFromMasterPassword,
  }),
}))

vi.mock('~/stores/security', () => ({
  useSecurityStore: () => ({
    loadSettings,
  }),
}))

vi.mock('@/stores/security', () => ({
  useSecurityStore: () => ({
    loadSettings,
  }),
}))

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand,
  }),
}))

vi.mock('@/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand,
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
    props: ['label', 'required'],
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
    template: '<button :disabled="disabled" @click="$emit(\'click\', { stopPropagation() {}, preventDefault() {} })"><slot /></button>',
    props: ['label', 'disabled', 'loading', 'color', 'variant'],
    emits: ['click'],
  },
  UAlert: {
    template: '<div><slot name="title" /><slot /></div>',
    props: ['color', 'variant', 'icon'],
  },
  ProviderCard: {
    template: '<div data-test="provider-card"></div>',
    props: ['provider', 'variant'],
  },
}

describe('FromMasterPasswordDialog', () => {
  let FromMasterPasswordDialog: typeof import('~/components/security/provider-change/FromMasterPasswordDialog.vue').default

  beforeAll(async () => {
    FromMasterPasswordDialog = (await import('~/components/security/provider-change/FromMasterPasswordDialog.vue')).default
  })

  beforeEach(() => {
    switchFromMasterPassword.mockReset()
    loadSettings.mockReset()
    invokeCommand.mockReset()
  })

  it('認証後に切り替え処理を実行し閉じる', async () => {
    vi.useFakeTimers()
    invokeCommand.mockResolvedValue(true)
    switchFromMasterPassword.mockResolvedValue()

    const wrapper = mount(FromMasterPasswordDialog, {
      props: {
        open: true,
        targetProvider: 'simple',
      },
      global: { stubs },
    })

    const continueButton = wrapper.findAll('button').find((btn) => btn.text().includes('続行'))
    await continueButton?.trigger('click')
    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    inputs[0].vm.$emit('update:modelValue', 'currentPass')
    await wrapper.vm.$nextTick()

    const authButton = wrapper.findAll('button').find((btn) => btn.text().includes('認証'))
    await authButton?.trigger('click')

    expect(invokeCommand).toHaveBeenCalledWith('verify_master_password', {
      password: 'currentPass',
    })
    expect(switchFromMasterPassword).toHaveBeenCalledWith({
      targetProvider: 'simple',
      currentPassword: 'currentPass',
      skipReload: true,
    })

    await vi.runAllTimersAsync()

    expect(loadSettings).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')?.[0]?.[0]).toBe(false)
    vi.useRealTimers()
  })
})
