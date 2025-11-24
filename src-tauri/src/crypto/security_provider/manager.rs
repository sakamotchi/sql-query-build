use std::{path::PathBuf, sync::Arc};

use tokio::sync::RwLock;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::keychain::KeychainProvider;
use super::master_password::MasterPasswordProvider;
use super::simple::SimpleProvider;
use super::traits::SecurityProvider;
use super::types::{
    InitializeParams, ProviderState, SecurityProviderConfig, SecurityProviderInfo,
    SecurityProviderType, UnlockParams,
};
use crate::storage::FileStorage;

/// セキュリティプロバイダー設定の永続化ストレージ
#[derive(Debug)]
pub struct SecurityConfigStorage {
    path: PathBuf,
}

impl SecurityConfigStorage {
    /// 新しいストレージを作成
    pub fn new(settings_dir: PathBuf) -> Self {
        Self {
            path: settings_dir.join("security_provider.json"),
        }
    }

    /// 設定を読み込み
    pub async fn load(&self) -> SecurityProviderResult<SecurityProviderConfig> {
        let path = self.path.clone();

        if !path.exists() {
            return Ok(SecurityProviderConfig::default());
        }

        let config = tokio::task::spawn_blocking(move || -> SecurityProviderResult<_> {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| SecurityProviderError::StorageError(e.to_string()))?;
            serde_json::from_str(&content)
                .map_err(|e| SecurityProviderError::StorageError(e.to_string()))
        })
        .await
        .map_err(|e| SecurityProviderError::StorageError(e.to_string()))??;

        Ok(config)
    }

    /// 設定を保存
    pub async fn save(&self, config: &SecurityProviderConfig) -> SecurityProviderResult<()> {
        let path = self.path.clone();
        let config = config.clone();

        tokio::task::spawn_blocking(move || -> SecurityProviderResult<()> {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| SecurityProviderError::StorageError(e.to_string()))?;
            }

            let json = serde_json::to_string_pretty(&config)
                .map_err(|e| SecurityProviderError::StorageError(e.to_string()))?;
            std::fs::write(&path, json)
                .map_err(|e| SecurityProviderError::StorageError(e.to_string()))
        })
        .await
        .map_err(|e| SecurityProviderError::StorageError(e.to_string()))??;

        Ok(())
    }
}

/// セキュリティプロバイダーを管理するマネージャー
pub struct SecurityProviderManager {
    /// 現在のプロバイダー
    provider: Arc<RwLock<Box<dyn SecurityProvider>>>,

    /// 設定ストレージ
    config_storage: Arc<SecurityConfigStorage>,

    /// プロバイダーで使用する共通ストレージ
    storage: Arc<FileStorage>,
}

impl SecurityProviderManager {
    /// 新しいマネージャーを作成
    pub async fn new(
        config_storage: Arc<SecurityConfigStorage>,
        storage: Arc<FileStorage>,
    ) -> SecurityProviderResult<Self> {
        let config = config_storage.load().await?;
        let provider = Self::create_provider(config.provider_type, Arc::clone(&storage))?;

        Ok(Self {
            provider: Arc::new(RwLock::new(provider)),
            config_storage,
            storage,
        })
    }

    /// プロバイダーを作成
    fn create_provider(
        provider_type: SecurityProviderType,
        storage: Arc<FileStorage>,
    ) -> SecurityProviderResult<Box<dyn SecurityProvider>> {
        match provider_type {
            SecurityProviderType::Simple => {
                Ok(Box::new(SimpleProvider::new().with_storage(storage)))
            }
            SecurityProviderType::MasterPassword => Ok(Box::new(MasterPasswordProvider::new())),
            SecurityProviderType::Keychain => Ok(Box::new(KeychainProvider::new())),
        }
    }

    /// 現在のプロバイダー種別を取得
    pub async fn current_provider_type(&self) -> SecurityProviderType {
        self.provider.read().await.provider_type()
    }

    /// プロバイダーの状態を取得
    pub async fn state(&self) -> ProviderState {
        self.provider.read().await.state()
    }

    /// プロバイダーを初期化
    pub async fn initialize(&self, params: InitializeParams) -> SecurityProviderResult<()> {
        let mut provider = self.provider.write().await;
        provider.initialize(params).await
    }

    /// プロバイダーをアンロック
    pub async fn unlock(&self, params: UnlockParams) -> SecurityProviderResult<()> {
        let mut provider = self.provider.write().await;
        provider.unlock(params).await
    }

    /// プロバイダーをロック
    pub async fn lock(&self) {
        let mut provider = self.provider.write().await;
        provider.lock().await;
    }

    /// 暗号化キーを取得
    pub async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        let provider = self.provider.read().await;
        provider.get_encryption_key().await
    }

    /// プロバイダーを変更
    ///
    /// # Note
    /// プロバイダー変更時は、既存の認証情報を新しいプロバイダーで
    /// 再暗号化する必要がある（1.5a.7で実装）
    pub async fn change_provider(
        &self,
        new_type: SecurityProviderType,
    ) -> SecurityProviderResult<()> {
        // 現在のプロバイダーで認証情報を復号化
        // 新しいプロバイダーを作成
        // 認証情報を再暗号化
        // 設定を保存

        let new_provider = Self::create_provider(new_type, Arc::clone(&self.storage))?;

        let mut provider = self.provider.write().await;
        *provider = new_provider;

        // 設定を更新
        let mut config = self.config_storage.load().await?;
        config.provider_type = new_type;
        self.config_storage.save(&config).await?;

        Ok(())
    }

    /// 現在のプロバイダー情報を取得
    pub async fn provider_info(&self) -> SecurityProviderInfo {
        let provider = self.provider.read().await;
        let provider_type = provider.provider_type();

        SecurityProviderInfo {
            provider_type,
            state: format!("{:?}", provider.state()),
            needs_initialization: provider.needs_initialization(),
            needs_unlock: provider.needs_unlock(),
            display_name: provider_type.display_name().to_string(),
            description: provider_type.description().to_string(),
            security_level: provider_type.security_level(),
        }
    }
}
