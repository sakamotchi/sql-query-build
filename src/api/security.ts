import { invoke } from '@tauri-apps/api/core';
import type { SecurityConfig, SecurityProviderType } from '@/types/security';

export const securityApi = {
  /**
   * セキュリティ設定を取得
   */
  async getConfig(): Promise<SecurityConfig> {
    return invoke<SecurityConfig>('get_security_config');
  },

  /**
   * プロバイダーを変更
   */
  async changeProvider(providerType: SecurityProviderType): Promise<void> {
    return invoke('change_security_provider', { providerType });
  },
};
