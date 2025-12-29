import { defineStore } from 'pinia'
import { safetyApi } from '@/api/safetyApi'
import type { SafetySettings, EnvironmentSafetyConfig } from '@/types/safety-settings'
import type { Environment } from '@/types'
import { DEFAULT_SAFETY_SETTINGS } from '@/types/safety-settings'

interface SafetyState {
  settings: SafetySettings
  loading: boolean
  error: string | null
}

export const useSafetyStore = defineStore('safety', {
  state: (): SafetyState => ({
    settings: DEFAULT_SAFETY_SETTINGS,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * 指定環境の安全設定を取得
     */
    getConfigForEnvironment: (state) => {
      return (env: Environment): EnvironmentSafetyConfig => {
        return state.settings.environments[env] || DEFAULT_SAFETY_SETTINGS.environments[env]
      }
    },
  },

  actions: {
    /**
     * 設定を読み込む
     */
    async loadSettings() {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.getSettings()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定の読み込みに失敗しました'
        // エラー時はデフォルト設定を使用
        this.settings = DEFAULT_SAFETY_SETTINGS
      } finally {
        this.loading = false
      }
    },

    /**
     * 環境別の設定を更新
     */
    async updateEnvironmentConfig(env: Environment, config: EnvironmentSafetyConfig) {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.updateEnvironmentSafety(env, config)
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定の保存に失敗しました'
        throw e
      } finally {
        this.loading = false
      }
    },

    /**
     * デフォルト設定にリセット
     */
    async resetToDefault() {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.resetSettings()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定のリセットに失敗しました'
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
