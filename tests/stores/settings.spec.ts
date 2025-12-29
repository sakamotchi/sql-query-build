import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '~/stores/settings'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('SettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルト設定を持つ', () => {
      const store = useSettingsStore()
      expect(store.settings.theme).toBe('auto')
      expect(store.settings.language).toBe('ja')
      expect(store.settings.autoSave).toBe(true)
      expect(store.settings.windowRestore).toBe(true)
    })
  })

  describe('getters', () => {
    it('currentSettingsが設定オブジェクトを返す', () => {
      const store = useSettingsStore()
      expect(store.currentSettings).toEqual({
        theme: 'auto',
        language: 'ja',
        autoSave: true,
        windowRestore: true
      })
    })

    it('isAutoSaveEnabledがautoSaveを返す', () => {
      const store = useSettingsStore()
      expect(store.isAutoSaveEnabled).toBe(true)
    })
  })

  describe('actions', () => {
    it('loadSettingsがブラウザモードで早期リターンする', async () => {
      const store = useSettingsStore()
      await store.loadSettings()
      // エラーなく完了することを確認
      expect(store.error).toBeNull()
    })

    it('updateSettingsがブラウザモードでローカル状態を更新する', async () => {
      const store = useSettingsStore()
      const result = await store.updateSettings({ autoSave: false })
      expect(store.settings.autoSave).toBe(false)
      expect(result?.autoSave).toBe(false)
    })

    it('resetSettingsがブラウザモードでデフォルトに戻す', async () => {
      const store = useSettingsStore()
      store.settings.autoSave = false
      await store.resetSettings()
      expect(store.settings.autoSave).toBe(true)
    })
  })
})
