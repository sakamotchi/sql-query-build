import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'

const switchFromSimple = vi.fn()
const loadSettings = vi.fn()

vi.mock('~/composables/useProviderSwitch', () => ({
  useProviderSwitch: () => ({
    switchFromSimple,
  }),
}))

vi.mock('@/composables/useProviderSwitch', () => ({
  useProviderSwitch: () => ({
    switchFromSimple,
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

describe('FromSimpleDialog', () => {
  let FromSimpleDialog: typeof import('~/components/security/provider-change/FromSimpleDialog.vue').default

  beforeAll(async () => {
    FromSimpleDialog = (await import('~/components/security/provider-change/FromSimpleDialog.vue')).default
  })

  beforeEach(() => {
    switchFromSimple.mockReset()
    loadSettings.mockReset()
  })

  it('続行で初期化フェーズに進む', async () => {
    const wrapper = mount(FromSimpleDialog, {
      props: {
        open: true,
        targetProvider: 'master-password',
      },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('重要な注意事項')

    const continueButton = wrapper.findAll('button').find((btn) => btn.text().includes('続行'))
    await continueButton?.trigger('click')

    expect(wrapper.text()).toContain('新しいマスターパスワードを設定してください。')
  })

  it('変更で切り替え処理を実行し閉じる', async () => {
    vi.useFakeTimers()
    switchFromSimple.mockResolvedValue()
    const wrapper = mount(FromSimpleDialog, {
      props: {
        open: true,
        targetProvider: 'master-password',
      },
      global: { stubs },
    })

    const continueButton = wrapper.findAll('button').find((btn) => btn.text().includes('続行'))
    await continueButton?.trigger('click')
    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    inputs[0].vm.$emit('update:modelValue', 'Abcdef12')
    inputs[1].vm.$emit('update:modelValue', 'Abcdef12')
    await wrapper.vm.$nextTick()

    const changeButton = wrapper.findAll('button').find((btn) => btn.text().includes('変更'))
    await changeButton?.trigger('click')

    expect(switchFromSimple).toHaveBeenCalledWith({
      targetProvider: 'master-password',
      newPassword: 'Abcdef12',
      newPasswordConfirm: 'Abcdef12',
      skipReload: true,
    })

    await vi.runAllTimersAsync()

    expect(loadSettings).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')?.[0]?.[0]).toBe(false)
    vi.useRealTimers()
  })
})
