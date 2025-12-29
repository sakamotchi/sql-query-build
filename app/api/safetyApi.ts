import { invoke } from '@tauri-apps/api/core'
import type { SafetySettings, EnvironmentSafetyConfig } from '@/types/safety-settings'
import type { Environment } from '@/types'

export const safetyApi = {
  /**
   * 安全設定を取得
   */
  async getSettings(): Promise<SafetySettings> {
    return await invoke('get_safety_settings')
  },

  /**
   * 環境別の安全設定を更新
   */
  async updateEnvironmentSafety(
    environment: Environment,
    config: EnvironmentSafetyConfig
  ): Promise<SafetySettings> {
    return await invoke('update_environment_safety', { environment, config })
  },

  /**
   * 安全設定をデフォルトにリセット
   */
  async resetSettings(): Promise<SafetySettings> {
    return await invoke('reset_safety_settings')
  },
}
