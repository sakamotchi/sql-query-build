use std::sync::Arc;

use serde::Serialize;
use thiserror::Error;
use zeroize::Zeroizing;

use super::{
    InitializeParams, SecurityConfigStorage, SecurityProviderManager, SecurityProviderType,
    UnlockParams,
};
use crate::crypto::security_provider::CredentialStorage;

/// プロバイダー切り替え結果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchResult {
    /// 成功したかどうか
    pub success: bool,
    /// 再暗号化した認証情報の数
    pub re_encrypted_count: usize,
    /// エラーメッセージ（失敗時）
    pub error: Option<String>,
}

/// プロバイダー切り替えパラメータ
#[derive(Debug, Clone)]
pub struct SwitchParams {
    /// 変更先のプロバイダー
    pub target_provider: SecurityProviderType,

    /// 現在のプロバイダーの認証パラメータ
    pub current_auth: UnlockParams,

    /// 新しいプロバイダーの初期化パラメータ
    pub new_init: InitializeParams,
}

/// プロバイダー切り替えエラー
#[derive(Debug, Error)]
pub enum SwitchError {
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Key retrieval failed: {0}")]
    KeyRetrievalFailed(String),

    #[error("Provider change failed: {0}")]
    ProviderChangeFailed(String),

    #[error("Initialization failed: {0}")]
    InitializationFailed(String),

    #[error("Re-encryption failed: {0}")]
    ReEncryptionFailed(String),

    #[error("Config save failed: {0}")]
    ConfigSaveFailed(String),

    #[error("Rollback failed: {0}")]
    RollbackFailed(String),
}

/// プロバイダー切り替えサービス
pub struct ProviderSwitcher {
    /// プロバイダーマネージャー
    provider_manager: Arc<SecurityProviderManager>,

    /// 認証情報ストレージ
    credential_storage: Arc<CredentialStorage>,

    /// 設定ストレージ
    config_storage: Arc<SecurityConfigStorage>,
}

impl ProviderSwitcher {
    pub fn new(
        provider_manager: Arc<SecurityProviderManager>,
        credential_storage: Arc<CredentialStorage>,
        config_storage: Arc<SecurityConfigStorage>,
    ) -> Self {
        Self {
            provider_manager,
            credential_storage,
            config_storage,
        }
    }

    /// 現在のプロバイダー種別を取得
    pub async fn current_provider_type(&self) -> SecurityProviderType {
        self.provider_manager.current_provider_type().await
    }

    /// プロバイダーを切り替え
    pub async fn switch(&self, params: SwitchParams) -> Result<SwitchResult, SwitchError> {
        let SwitchParams {
            target_provider,
            current_auth,
            new_init,
        } = params;

        let original_provider = self.provider_manager.current_provider_type().await;

        if original_provider == target_provider {
            return Ok(SwitchResult {
                success: true,
                re_encrypted_count: 0,
                error: None,
            });
        }

        // 1. 現在のプロバイダーで認証
        self.provider_manager
            .unlock(current_auth.clone())
            .await
            .map_err(|e| SwitchError::AuthenticationFailed(e.to_string()))?;

        // 2. 現在のキーを取得
        let original_key = Zeroizing::new(
            self.provider_manager
                .get_encryption_key()
                .await
                .map_err(|e| SwitchError::KeyRetrievalFailed(e.to_string()))?,
        );

        // 3. 認証情報件数を取得（再暗号化件数として返却）
        let credential_count = self
            .credential_storage
            .credential_count()
            .await
            .map_err(|e| SwitchError::ReEncryptionFailed(e.to_string()))?;

        // 4. 新しいプロバイダーに切り替え
        self.provider_manager
            .change_provider(target_provider)
            .await
            .map_err(|e| SwitchError::ProviderChangeFailed(e.to_string()))?;

        // 5. 新しいプロバイダーを初期化
        if let Err(e) = self.provider_manager.initialize(new_init.clone()).await {
            self.restore_original_provider(original_provider, current_auth)
                .await?;
            return Err(SwitchError::InitializationFailed(e.to_string()));
        }

        // 6. 新しいキーを取得
        let new_key = Zeroizing::new(
            self.provider_manager
                .get_encryption_key()
                .await
                .map_err(|e| SwitchError::KeyRetrievalFailed(e.to_string()))?,
        );

        // 7. 認証情報を再暗号化
        if let Err(e) = self
            .credential_storage
            .re_encrypt_all(original_key.as_slice(), new_key.as_slice())
            .await
        {
            self.rollback_with_reencryption(
                original_provider,
                current_auth.clone(),
                original_key.as_slice(),
                new_key.as_slice(),
            )
            .await?;
            return Err(SwitchError::ReEncryptionFailed(e.to_string()));
        }

        // 8. 設定を保存
        if let Err(e) = self.config_storage.change_provider(target_provider).await {
            self.rollback_with_reencryption(
                original_provider,
                current_auth.clone(),
                original_key.as_slice(),
                new_key.as_slice(),
            )
            .await?;
            return Err(SwitchError::ConfigSaveFailed(e.to_string()));
        }

        Ok(SwitchResult {
            success: true,
            re_encrypted_count: credential_count,
            error: None,
        })
    }

    /// プロバイダーを元に戻す（認証情報変更前の段階で利用）
    async fn restore_original_provider(
        &self,
        original_provider: SecurityProviderType,
        auth: UnlockParams,
    ) -> Result<(), SwitchError> {
        self.provider_manager
            .change_provider(original_provider)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))?;

        self.provider_manager
            .unlock(auth)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))
    }

    /// 再暗号化後のロールバック
    async fn rollback_with_reencryption(
        &self,
        original_provider: SecurityProviderType,
        original_auth: UnlockParams,
        original_key: &[u8],
        target_key: &[u8],
    ) -> Result<(), SwitchError> {
        self.credential_storage
            .re_encrypt_all(target_key, original_key)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))?;

        self.provider_manager
            .change_provider(original_provider)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))?;

        self.provider_manager
            .unlock(original_auth)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))?;

        self.config_storage
            .change_provider(original_provider)
            .await
            .map_err(|e| SwitchError::RollbackFailed(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::security_provider::{SecurityConfigStorage, SecurityProviderManager};
    use crate::storage::FileStorage;
    use std::sync::Arc;
    use tempfile::TempDir;

    async fn create_test_switcher() -> (
        ProviderSwitcher,
        Arc<SecurityProviderManager>,
        Arc<CredentialStorage>,
        Arc<SecurityConfigStorage>,
        TempDir,
    ) {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("data");
        let settings_dir = temp_dir.path().join("settings");

        let data_storage = Arc::new(FileStorage::new(data_dir).unwrap());
        let settings_storage = Arc::new(FileStorage::new(settings_dir).unwrap());
        let config_storage = Arc::new(SecurityConfigStorage::new(settings_storage.clone()));

        let provider_manager = Arc::new(
            SecurityProviderManager::new(config_storage.clone(), settings_storage.clone())
                .await
                .unwrap(),
        );

        let credential_storage = Arc::new(CredentialStorage::new(
            data_storage,
            provider_manager.clone(),
        ));

        let switcher = ProviderSwitcher::new(
            provider_manager.clone(),
            credential_storage.clone(),
            config_storage.clone(),
        );

        (
            switcher,
            provider_manager,
            credential_storage,
            config_storage,
            temp_dir,
        )
    }

    #[tokio::test]
    async fn test_switch_simple_to_master_password() {
        let (switcher, provider_manager, credential_storage, config_storage, _tmp) =
            create_test_switcher().await;

        credential_storage
            .save("conn-1", Some("secret123"), None, None)
            .await
            .unwrap();

        let result = switcher
            .switch(SwitchParams {
                target_provider: SecurityProviderType::MasterPassword,
                current_auth: UnlockParams::Simple,
                new_init: InitializeParams::MasterPassword {
                    password: "StrongPassw0rd!".to_string(),
                    password_confirm: "StrongPassw0rd!".to_string(),
                },
            })
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.re_encrypted_count, 1);
        assert_eq!(
            provider_manager.current_provider_type().await,
            SecurityProviderType::MasterPassword
        );

        let config = config_storage.load().await.unwrap();
        assert_eq!(config.provider_type, SecurityProviderType::MasterPassword);

        let password = credential_storage.get_password("conn-1").await.unwrap();
        assert_eq!(password.as_deref(), Some("secret123"));
    }

    #[tokio::test]
    async fn test_switch_master_password_to_simple() {
        let (switcher, provider_manager, credential_storage, config_storage, _tmp) =
            create_test_switcher().await;

        // MasterPasswordプロバイダーで初期化して認証情報を保存
        provider_manager
            .change_provider(SecurityProviderType::MasterPassword)
            .await
            .unwrap();
        provider_manager
            .initialize(InitializeParams::MasterPassword {
                password: "OrigPass123!".to_string(),
                password_confirm: "OrigPass123!".to_string(),
            })
            .await
            .unwrap();
        provider_manager
            .unlock(UnlockParams::MasterPassword {
                password: "OrigPass123!".to_string(),
            })
            .await
            .unwrap();
        config_storage
            .change_provider(SecurityProviderType::MasterPassword)
            .await
            .unwrap();

        credential_storage
            .save("conn-2", Some("keepme"), None, None)
            .await
            .unwrap();

        let result = switcher
            .switch(SwitchParams {
                target_provider: SecurityProviderType::Simple,
                current_auth: UnlockParams::MasterPassword {
                    password: "OrigPass123!".to_string(),
                },
                new_init: InitializeParams::Simple,
            })
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.re_encrypted_count, 1);
        assert_eq!(
            provider_manager.current_provider_type().await,
            SecurityProviderType::Simple
        );

        let config = config_storage.load().await.unwrap();
        assert_eq!(config.provider_type, SecurityProviderType::Simple);

        let password = credential_storage.get_password("conn-2").await.unwrap();
        assert_eq!(password.as_deref(), Some("keepme"));
    }

    #[tokio::test]
    async fn test_switch_rollback_on_initialization_failure() {
        let (switcher, provider_manager, credential_storage, config_storage, _tmp) =
            create_test_switcher().await;

        credential_storage
            .save("conn-rollback", Some("should_stay"), None, None)
            .await
            .unwrap();

        let result = switcher
            .switch(SwitchParams {
                target_provider: SecurityProviderType::MasterPassword,
                current_auth: UnlockParams::Simple,
                new_init: InitializeParams::MasterPassword {
                    password: "MismatchPass1".to_string(),
                    password_confirm: "MismatchPass2".to_string(),
                },
            })
            .await;

        assert!(matches!(
            result,
            Err(SwitchError::InitializationFailed(_))
        ));
        assert_eq!(
            provider_manager.current_provider_type().await,
            SecurityProviderType::Simple
        );

        let config = config_storage.load().await.unwrap();
        assert_eq!(config.provider_type, SecurityProviderType::Simple);

        let password = credential_storage
            .get_password("conn-rollback")
            .await
            .unwrap();
        assert_eq!(password.as_deref(), Some("should_stay"));
    }
}
