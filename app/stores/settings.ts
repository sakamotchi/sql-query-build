import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { AppSettings } from '~/types'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      theme: 'auto',
      language: 'ja',
      autoSave: true,
      windowRestore: true
    } as AppSettings,
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
        const { invokeCommand } = useTauri()
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
        const { invokeCommand } = useTauri()
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
        const { invokeCommand } = useTauri()
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
