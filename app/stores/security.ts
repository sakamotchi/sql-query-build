import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { SecurityLevel, SecurityProvider, SecuritySettings } from '~/types'

const defaultSecuritySettings: SecuritySettings = {
  provider: 'simple',
  level: 'medium',
  masterPasswordSet: false
}

export const useSecurityStore = defineStore('security', {
  state: () => ({
    settings: { ...defaultSecuritySettings } as SecuritySettings,
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
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          console.info('Tauri is not available; using default security settings in browser mode.')
          return
        }

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
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          this.settings.provider = provider
          return
        }

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
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          this.settings.level = level
          return
        }

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
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          // ブラウザモードではTauriに依存する処理をスキップ
          this.settings.masterPasswordSet = true
          return
        }

        // Rustバックエンドのinitialize_master_passwordコマンドを使用
        // passwordConfirmパラメータも必要（キャメルケース）
        await invokeCommand('initialize_master_password', {
          password,
          passwordConfirm: password
        })
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
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          return false
        }

        const verified = await invokeCommand<boolean>('verify_master_password', { password })
        return verified
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to verify master password'
        console.error('Failed to verify master password:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    async changeMasterPassword(oldPassword: string, newPassword: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          throw new Error('Tauri is not available. Running in browser mode.')
        }

        await invokeCommand('change_master_password', {
          current_password: oldPassword,
          new_password: newPassword,
          new_password_confirm: newPassword
        })

        this.settings.masterPasswordSet = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to change master password'
        console.error('Failed to change master password:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetSecurityConfig() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand, isAvailable } = useTauri()

        if (!isAvailable.value) {
          this.settings = { ...defaultSecuritySettings }
          return
        }

        await invokeCommand('reset_security_config')
        await this.loadSettings()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to reset security config'
        console.error('Failed to reset security config:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
