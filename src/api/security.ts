import { invoke } from '@tauri-apps/api/core';
import type {
  ProviderSwitchResult,
  SecurityConfig,
  SecurityProviderType,
} from '@/types/security';

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

  /**
   * プロバイダーを切り替え（認証情報を再暗号化）
   */
  async switchProvider(params: {
    targetProvider: SecurityProviderType;
    currentPassword?: string;
    newPassword?: string;
    newPasswordConfirm?: string;
  }): Promise<ProviderSwitchResult> {
    return invoke('switch_security_provider', params);
  },
};
