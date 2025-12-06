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
  providerType: SecurityProviderType;
  state: ProviderState;
  needsInitialization: boolean;
  needsUnlock: boolean;
  displayName: string;
  description: string;
  securityLevel: number;
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
  | { provider_config_type: 'Simple' }
  | { provider_config_type: 'MasterPassword'; is_configured: boolean }
  | { provider_config_type: 'Keychain'; is_initialized: boolean };

/**
 * セキュリティ設定
 */
export interface SecurityConfig {
  version: number;
  provider_type: SecurityProviderType;
  provider_config: ProviderSpecificConfig;
  created_at: string;
  updated_at: string;
}

/**
 * プロバイダー切り替え結果
 */
export interface ProviderSwitchResult {
  success: boolean;
  reEncryptedCount: number;
  error?: string | null;
}
