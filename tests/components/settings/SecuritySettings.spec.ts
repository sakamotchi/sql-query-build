import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SecuritySettings from '~/components/settings/SecuritySettings.vue'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const settings = ref({
  provider: 'simple',
  level: 'medium',
  masterPasswordSet: false,
})
const loading = ref(false)
const error = ref<string | null>(null)
const setLevel = vi.fn()
const resetSecurityConfig = vi.fn()

vi.mock('~/stores/security', () => ({
  useSecurityStore: () => ({
    settings,
    loading,
    error,
    setLevel,
    resetSecurityConfig,
  }),
}))

const openChangeDialog = vi.fn()
const isFromSimpleDialogOpen = ref(false)
const isFromMasterPasswordDialogOpen = ref(false)

vi.mock('~/composables/useProviderChangeDialog', () => ({
  useProviderChangeDialog: () => ({
    isFromSimpleDialogOpen,
    isFromMasterPasswordDialogOpen,
    openChangeDialog,
  }),
}))



const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  UFormField: {
    template: '<label><slot /></label>',
    props: ['label', 'hint'],
  },
  USelect: {
    template: '<select><slot /></select>',
    props: ['modelValue', 'items', 'disabled'],
  },
  URadioGroup: {
    template: '<div><slot /></div>',
    props: ['modelValue', 'items', 'disabled', 'valueAttribute'],
  },
  SecurityProviderComparison: {
    template: '<div data-test="provider-comparison"></div>',
  },
  SecurityLevelDetails: {
    template: '<div data-test="level-details"></div>',
  },
  MasterPasswordSetupDialog: {
    template: '<div></div>',
    props: ['open', 'mode'],
  },
  FromSimpleDialog: {
    template: '<div></div>',
    props: ['open', 'targetProvider'],
  },
  FromMasterPasswordDialog: {
    template: '<div></div>',
    props: ['open', 'targetProvider'],
  },
}

describe('SecuritySettings', () => {
  beforeEach(() => {
    setLevel.mockClear()
    resetSecurityConfig.mockClear()
    setLevel.mockResolvedValue(undefined)
    resetSecurityConfig.mockResolvedValue(undefined)
    openChangeDialog.mockClear()
    error.value = null
  })

  it('主要な見出しを表示する', () => {
    const wrapper = mount(SecuritySettings, {
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('セキュリティプロバイダー')
  })

  it('比較セクションを開閉できる', async () => {
    const wrapper = mount(SecuritySettings, {
      global: {
        stubs,
      },
    })

    expect(wrapper.find('[data-test="provider-comparison"]').exists()).toBe(false)

    const comparisonButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('プロバイダー比較'))

    expect(comparisonButton).toBeTruthy()
    await comparisonButton?.trigger('click')

    expect(wrapper.find('[data-test="provider-comparison"]').exists()).toBe(true)
  })
})
