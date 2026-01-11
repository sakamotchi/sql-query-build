import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import GeneralSettings from '~/components/settings/GeneralSettings.vue'
import type { AppSettings } from '~/types'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const locale = ref('ja')
const setLocale = vi.fn(async (newLocale: string) => {
  locale.value = newLocale
})
const t = (key: string) => {
  const messages: Record<string, string> = {
    'settings.general.title': '一般設定',
    'settings.general.saveButton': '設定を保存',
    'settings.general.saving': '保存中'
  }
  return messages[key] ?? key
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t,
    locale,
    setLocale
  })
}))

const updateSettings = vi.fn()
const settings = ref<AppSettings>({
  theme: 'auto',
  language: 'ja',
  autoSave: true,
  windowRestore: true,
})
const loading = ref(false)
const error = ref<string | null>(null)

vi.mock('~/stores/settings', () => ({
  useSettingsStore: () => ({
    settings,
    loading,
    error,
    updateSettings,
  }),
}))

const setColorMode = vi.fn()

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({
    setColorMode,
  }),
}))

const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot name="header" /><slot /><slot name="footer" /></div>',
  },
  UFormField: {
    template: '<label><slot /></label>',
    props: ['label', 'hint'],
  },
  USelect: {
    template: '<select><slot /></select>',
    props: ['modelValue', 'items', 'disabled'],
  },
  USwitch: {
    template: '<input type="checkbox" />',
    props: ['modelValue'],
  },
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    updateSettings.mockClear()
    updateSettings.mockResolvedValue(undefined)
    setColorMode.mockClear()
    error.value = null
  })

  it('主要な見出しを表示する', () => {
    const wrapper = mount(GeneralSettings, {
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('一般設定')
    expect(wrapper.text()).toContain('設定を保存')
  })

  it('保存ボタンで更新処理を呼び出す', async () => {
    const wrapper = mount(GeneralSettings, {
      global: {
        stubs,
      },
    })

    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()

    expect(updateSettings).toHaveBeenCalledWith({
      theme: 'auto',
      language: 'ja',
    })
  })
})
