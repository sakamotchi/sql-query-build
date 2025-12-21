import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { AppSettings } from '~/types'

const defaultSettings: AppSettings = {
  theme: 'auto',
  language: 'ja',
  autoSave: true,
  windowRestore: true
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { ...defaultSettings } as AppSettings,
    loading: false,
    error: null as string | null
  }),

  getters: {
    currentSettings: (state) => state.settings,
    isAutoSaveEnabled: (state) => state.settings.autoSave,
    isWindowRestoreEnabled: (state) => state.settings.windowRestore,
    currentLanguage: (state) => state.settings.language
  },

  actions: {
    async loadSettings() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          console.info('Tauri is not available; using default settings in browser mode.')
          return
        }

        const settings = await invokeCommand<AppSettings>('get_settings')
        if (settings) {
          this.settings = settings
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load settings'
        console.error('Failed to load settings:', error)
      } finally {
        this.loading = false
      }
    },

    async updateSettings(updates: Partial<AppSettings>) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          // ブラウザモードではローカル状態のみ更新して完了
          this.settings = { ...this.settings, ...updates }
          return this.settings
        }

        const updated = await invokeCommand<AppSettings>('update_settings', { settings: updates })
        this.settings = updated
        return updated
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update settings'
        console.error('Failed to update settings:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetSettings() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          this.settings = { ...defaultSettings }
          return this.settings
        }

        const defaultSettings = await invokeCommand<AppSettings>('reset_settings')
        this.settings = defaultSettings
        return defaultSettings
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to reset settings'
        console.error('Failed to reset settings:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
