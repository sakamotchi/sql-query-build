import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { SecurityLevel, SecurityProvider, SecuritySettings } from '~/types'

export const useSecurityStore = defineStore('security', {
  state: () => ({
    settings: {
      provider: 'system',
      level: 'medium',
      masterPasswordSet: false
    } as SecuritySettings,
    loading: false,
    error: null as string | null
  }),

  getters: {
    currentSettings: (state) => state.settings,
    currentProvider: (state) => state.settings.provider,
    currentLevel: (state) => state.settings.level,
    isMasterPasswordSet: (state) => state.settings.masterPasswordSet
  },

  actions: {
    async loadSettings() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        const settings = await invokeCommand<SecuritySettings>('get_security_settings')
        if (settings) {
          this.settings = settings
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load security settings'
        console.error('Failed to load security settings:', error)
      } finally {
        this.loading = false
      }
    },

    async setProvider(provider: SecurityProvider) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('set_security_provider', { provider })
        this.settings.provider = provider
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set security provider'
        console.error('Failed to set security provider:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async setLevel(level: SecurityLevel) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('set_security_level', { level })
        this.settings.level = level
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set security level'
        console.error('Failed to set security level:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async setMasterPassword(password: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('set_master_password', { password })
        this.settings.masterPasswordSet = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set master password'
        console.error('Failed to set master password:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async verifyMasterPassword(password: string): Promise<boolean> {
      try {
        const { invokeCommand } = useTauri()
        return await invokeCommand<boolean>('verify_master_password', { password })
      } catch (error) {
        console.error('Failed to verify master password:', error)
        return false
      }
    }
  }
})
