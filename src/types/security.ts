/**
 * セキュリティプロバイダーの種別
 */
export type SecurityProviderType = 'simple' | 'master_password' | 'keychain';

/**
 * プロバイダーの状態
 */
export type ProviderState =
  | 'uninitialized'
  | 'locked'
  | 'ready'
  | 'error';

/**
 * セキュリティプロバイダー情報
 */
export interface SecurityProviderInfo {
  /** フロント側で扱うプロバイダー種別（camelCase） */
  type: SecurityProviderType;
  state: ProviderState;
  needsInitialization: boolean;
  needsUnlock: boolean;
  displayName: string;
  description: string;
  securityLevel: number;
}

/**
 * バックエンドからのプロバイダー情報レスポンス（snake_case）
 */
export interface SecurityProviderInfoResponse {
  provider_type: SecurityProviderType;
  state: ProviderState;
  needs_initialization: boolean;
  needs_unlock: boolean;
  display_name: string;
  description: string;
  security_level: number;
}

/**
 * 初期化パラメータ
 */
export type InitializeParams =
  | { type: 'simple' }
  | { type: 'master_password'; password: string; passwordConfirm: string }
  | { type: 'keychain' };

/**
 * アンロックパラメータ
 */
export type UnlockParams =
  | { type: 'simple' }
  | { type: 'master_password'; password: string }
  | { type: 'keychain' };

/**
 * プロバイダー固有設定
 */
export type ProviderSpecificConfig =
  | { providerConfigType: 'Simple' }
  | { providerConfigType: 'MasterPassword'; isConfigured: boolean }
  | { providerConfigType: 'Keychain'; isInitialized: boolean };

/**
 * バックエンドからのプロバイダー固有設定レスポンス（snake_case）
 */
export type ProviderSpecificConfigResponse =
  | { provider_config_type: 'Simple' }
  | { provider_config_type: 'MasterPassword'; is_configured: boolean }
  | { provider_config_type: 'Keychain'; is_initialized: boolean };

/**
 * セキュリティ設定
 */
export interface SecurityConfig {
  version: number;
  providerType: SecurityProviderType;
  providerConfig: ProviderSpecificConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * バックエンドからのセキュリティ設定レスポンス（snake_case）
 */
export type SecurityConfigResponse =
  | {
      version: number;
      provider_type: SecurityProviderType;
      provider_config: ProviderSpecificConfigResponse;
      created_at: string;
      updated_at: string;
    }
  | {
      version: number;
      provider_type: SecurityProviderType;
      provider_config_type: ProviderSpecificConfigResponse['provider_config_type'];
      is_configured?: boolean;
      is_initialized?: boolean;
      created_at: string;
      updated_at: string;
    };

/**
 * プロバイダー切り替え結果
 */
export interface ProviderSwitchResult {
  success: boolean;
  reEncryptedCount: number;
  error?: string | null;
}

/**
 * プロバイダー変更パラメータ
 */
export interface ProviderChangeParams {
  targetProvider: SecurityProviderType;
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
}
