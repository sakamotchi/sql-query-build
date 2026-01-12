import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SafetySettingsPanel from '~/components/settings/SafetySettingsPanel.vue'
import { DEFAULT_SAFETY_SETTINGS } from '@/types/safety-settings'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const settings = ref(DEFAULT_SAFETY_SETTINGS)
const loading = ref(false)
const error = ref<string | null>(null)
const loadSettings = vi.fn()
const resetToDefault = vi.fn()

vi.mock('@/stores/safety', () => ({
  useSafetyStore: () => ({
    settings,
    loading,
    error,
    loadSettings,
    resetToDefault,
  }),
}))

const toastAdd = vi.fn()
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    add: toastAdd
  })
}))

vi.mock('#imports', () => ({
  useToast: () => ({
    add: toastAdd
  }),
  useNuxtApp: () => ({
    $toast: { add: toastAdd }
  }),
  useState: (key: string, init?: () => any) => ref(init ? init() : undefined)
}))

vi.mock('nuxt/app', () => ({
  useNuxtApp: () => ({ 
    payload: {}, 
  }),
  useState: (key: string, init: () => any) => ref(init ? init() : undefined)
}))

const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  EnvironmentSafetyCard: {
    template: '<div data-test="env-card"></div>',
    props: ['environment', 'label', 'description', 'config'],
  },
}

describe('SafetySettingsPanel', () => {
  beforeEach(() => {
    loadSettings.mockClear()
    resetToDefault.mockClear()
    error.value = null
  })

  it('初期表示で設定読み込みと環境カードを表示する', () => {
    const wrapper = mount(SafetySettingsPanel, {
      global: {
        stubs,
      },
    })

    expect(loadSettings).toHaveBeenCalled()
    expect(wrapper.findAll('[data-test="env-card"]').length).toBe(4)
    expect(wrapper.text()).toContain('環境別安全設定')
  })
})
