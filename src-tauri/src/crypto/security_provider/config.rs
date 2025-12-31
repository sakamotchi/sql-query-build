use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::RwLock;

use crate::crypto::security_provider::types::SecurityProviderType;
use crate::storage::FileStorage;

/// セキュリティ設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// 設定バージョン
    pub version: u32,

    /// 選択されたプロバイダー
    pub provider_type: SecurityProviderType,

    /// プロバイダー固有の設定
    #[serde(flatten)]
    pub provider_config: ProviderSpecificConfig,

    /// 設定作成日時
    pub created_at: DateTime<Utc>,

    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
}

/// プロバイダー固有の設定
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "provider_config_type")]
pub enum ProviderSpecificConfig {
    /// Simpleプロバイダー（追加設定なし）
    Simple,

    /// マスターパスワードプロバイダー
    MasterPassword {
        /// パスワードが設定済みかどうか
        is_configured: bool,
    },

    /// キーチェーンプロバイダー
    Keychain {
        /// キーチェーンが初期化済みかどうか
        is_initialized: bool,
    },
}

impl Default for SecurityConfig {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            version: 1,
            provider_type: SecurityProviderType::Simple,
            provider_config: ProviderSpecificConfig::Simple,
            created_at: now,
            updated_at: now,
        }
    }
}

/// セキュリティ設定関連のエラー
#[derive(Debug, Error)]
pub enum SecurityConfigError {
    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Migration failed: {0}")]
    MigrationFailed(String),
}

/// セキュリティ設定ストレージ
pub struct SecurityConfigStorage {
    /// ファイルストレージ
    file_storage: Arc<FileStorage>,

    /// メモリキャッシュ
    cache: Arc<RwLock<Option<SecurityConfig>>>,

    /// ストレージキー
    storage_key: String,
}

impl SecurityConfigStorage {
    const STORAGE_KEY: &'static str = "security-config";

    pub fn new(file_storage: Arc<FileStorage>) -> Self {
        Self {
            file_storage,
            cache: Arc::new(RwLock::new(None)),
            storage_key: Self::STORAGE_KEY.to_string(),
        }
    }

    /// 設定を読み込み
    pub async fn load(&self) -> Result<SecurityConfig, SecurityConfigError> {
        // キャッシュをチェック
        if let Some(config) = self.cache.read().await.as_ref() {
            return Ok(config.clone());
        }

        // ファイルから読み込み
        let config = match self.file_storage.read::<SecurityConfig>(&self.storage_key) {
            Ok(c) => c,
            Err(crate::storage::StorageError::NotFound(_)) => SecurityConfig::default(),
            Err(e) => return Err(SecurityConfigError::StorageError(e.to_string())),
        };

        // キャッシュに保存
        *self.cache.write().await = Some(config.clone());

        Ok(config)
    }

    /// 設定を保存
    pub async fn save(&self, config: &SecurityConfig) -> Result<(), SecurityConfigError> {
        let mut config = config.clone();
        config.updated_at = Utc::now();

        self.file_storage
            .write(&self.storage_key, &config)
            .map_err(|e| SecurityConfigError::StorageError(e.to_string()))?;

        // キャッシュを更新
        *self.cache.write().await = Some(config);

        Ok(())
    }

    /// プロバイダーを変更
    pub async fn change_provider(
        &self,
        provider_type: SecurityProviderType,
    ) -> Result<(), SecurityConfigError> {
        println!(
            "[SecurityConfigStorage::change_provider] Called with provider_type: {:?}",
            provider_type
        );
        let mut config = self.load().await?;
        println!(
            "[SecurityConfigStorage::change_provider] Loaded config: provider_type={:?}",
            config.provider_type
        );

        config.provider_type = provider_type;
        config.provider_config = match provider_type {
            SecurityProviderType::Simple => ProviderSpecificConfig::Simple,
            SecurityProviderType::MasterPassword => ProviderSpecificConfig::MasterPassword {
                is_configured: false,
            },
            SecurityProviderType::Keychain => ProviderSpecificConfig::Keychain {
                is_initialized: false,
            },
        };

        println!("[SecurityConfigStorage::change_provider] Updated config: provider_type={:?}, config={:?}", config.provider_type, config.provider_config);
        let result = self.save(&config).await;
        println!(
            "[SecurityConfigStorage::change_provider] Save result: {:?}",
            result
        );
        result
    }

    /// プロバイダー固有の設定を更新
    pub async fn update_provider_config(
        &self,
        provider_config: ProviderSpecificConfig,
    ) -> Result<(), SecurityConfigError> {
        println!(
            "[SecurityConfigStorage::update_provider_config] Called with provider_config: {:?}",
            provider_config
        );
        let mut config = self.load().await?;
        println!("[SecurityConfigStorage::update_provider_config] Loaded config: provider_type={:?}, old_config={:?}", config.provider_type, config.provider_config);
        config.provider_config = provider_config;
        println!("[SecurityConfigStorage::update_provider_config] Updated config: provider_type={:?}, new_config={:?}", config.provider_type, config.provider_config);
        let result = self.save(&config).await;
        println!(
            "[SecurityConfigStorage::update_provider_config] Save result: {:?}",
            result
        );
        result
    }

    /// 設定をリセット
    pub async fn reset(&self) -> Result<(), SecurityConfigError> {
        let config = SecurityConfig::default();
        self.save(&config).await
    }

    /// キャッシュをクリア
    pub async fn clear_cache(&self) {
        *self.cache.write().await = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_storage() -> (SecurityConfigStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let file_storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
        let storage = SecurityConfigStorage::new(file_storage);
        (storage, temp_dir)
    }

    #[tokio::test]
    async fn test_default_config() {
        let (storage, _temp) = create_test_storage();

        let config = storage.load().await.unwrap();

        assert_eq!(config.provider_type, SecurityProviderType::Simple);
        assert!(matches!(
            config.provider_config,
            ProviderSpecificConfig::Simple
        ));
    }

    #[tokio::test]
    async fn test_change_provider() {
        let (storage, _temp) = create_test_storage();

        storage
            .change_provider(SecurityProviderType::MasterPassword)
            .await
            .unwrap();

        let config = storage.load().await.unwrap();
        assert_eq!(config.provider_type, SecurityProviderType::MasterPassword);
    }

    #[tokio::test]
    async fn test_update_provider_config() {
        let (storage, _temp) = create_test_storage();

        storage
            .change_provider(SecurityProviderType::MasterPassword)
            .await
            .unwrap();
        storage
            .update_provider_config(ProviderSpecificConfig::MasterPassword {
                is_configured: true,
            })
            .await
            .unwrap();

        let config = storage.load().await.unwrap();
        if let ProviderSpecificConfig::MasterPassword { is_configured } = config.provider_config {
            assert!(is_configured);
        } else {
            panic!("Expected MasterPassword config");
        }
    }

    #[tokio::test]
    async fn test_reset() {
        let (storage, _temp) = create_test_storage();

        storage
            .change_provider(SecurityProviderType::Keychain)
            .await
            .unwrap();
        storage.reset().await.unwrap();

        let config = storage.load().await.unwrap();
        assert_eq!(config.provider_type, SecurityProviderType::Simple);
    }
}
