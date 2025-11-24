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
