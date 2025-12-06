import { invoke } from '@tauri-apps/api/core';
import type {
  PasswordValidationResult,
  PasswordValidationResultResponse,
  ProviderChangeParams,
  ProviderSpecificConfig,
  ProviderSpecificConfigResponse,
  ProviderSwitchResult,
  SecurityConfig,
  SecurityConfigResponse,
  SecurityProviderInfo,
  SecurityProviderInfoResponse,
  SecurityProviderType,
} from '@/types/security';

const normalizeProviderConfig = (
  config: ProviderSpecificConfigResponse
): ProviderSpecificConfig => {
  switch (config.provider_config_type) {
    case 'MasterPassword':
      return {
        providerConfigType: 'MasterPassword',
        isConfigured: config.is_configured,
      };
    case 'Keychain':
      return {
        providerConfigType: 'Keychain',
        isInitialized: config.is_initialized,
      };
    case 'Simple':
    default:
      return { providerConfigType: 'Simple' };
  }
};

const toProviderConfigResponse = (
  config: SecurityConfigResponse
): ProviderSpecificConfigResponse => {
  if ('provider_config' in config && config.provider_config) {
    return config.provider_config;
  }

  return {
    provider_config_type: config.provider_config_type ?? 'Simple',
    is_configured: 'is_configured' in config ? config.is_configured : undefined,
    is_initialized: 'is_initialized' in config ? config.is_initialized : undefined,
  } as ProviderSpecificConfigResponse;
};

const normalizeSecurityConfig = (config: SecurityConfigResponse): SecurityConfig => {
  const providerConfig = toProviderConfigResponse(config);

  return {
    version: config.version,
    providerType: config.provider_type,
    providerConfig: normalizeProviderConfig(providerConfig),
    createdAt: config.created_at,
    updatedAt: config.updated_at,
  };
};

const normalizeProviderInfo = (
  provider: SecurityProviderInfoResponse
): SecurityProviderInfo => ({
  type: provider.provider_type,
  state: provider.state,
  needsInitialization: provider.needs_initialization,
  needsUnlock: provider.needs_unlock,
  displayName: provider.display_name,
  description: provider.description,
  securityLevel: provider.security_level,
});

const normalizePasswordValidationResult = (
  result: PasswordValidationResultResponse
): PasswordValidationResult => ({
  isValid: result.is_valid,
  strength: result.strength,
  errors: result.errors,
  suggestions: result.suggestions,
});

export const securityApi = {
  /**
   * セキュリティ設定を取得
   */
  async getConfig(): Promise<SecurityConfig> {
    const response = await invoke<SecurityConfigResponse>('get_security_config');
    return normalizeSecurityConfig(response);
  },

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  async getAvailableProviders(): Promise<SecurityProviderInfo[]> {
    const response = await invoke<SecurityProviderInfoResponse[]>('get_available_providers');
    return response.map(normalizeProviderInfo);
  },

  /**
   * プロバイダーを変更
   */
  async changeProvider(providerType: SecurityProviderType): Promise<void> {
    return invoke('change_security_provider', { provider_type: providerType });
  },

  /**
   * プロバイダーを切り替え（認証情報を再暗号化）
   */
  async switchProvider(params: ProviderChangeParams): Promise<ProviderSwitchResult> {
    return invoke('switch_security_provider', {
      target_provider: params.targetProvider,
      current_password: params.currentPassword,
      new_password: params.newPassword,
      new_password_confirm: params.newPasswordConfirm,
    });
  },

  /**
   * マスターパスワードを初期化
   */
  async initializeMasterPassword(password: string, passwordConfirm: string): Promise<void> {
    return invoke('initialize_master_password', {
      password,
      password_confirm: passwordConfirm,
    });
  },

  /**
   * パスワード強度をチェック
   */
  async checkPasswordStrength(password: string): Promise<PasswordValidationResult> {
    const result = await invoke<PasswordValidationResultResponse>('check_password_strength', {
      password,
    });
    return normalizePasswordValidationResult(result);
  },
};
