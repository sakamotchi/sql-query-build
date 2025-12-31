use std::collections::HashMap;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::RwLock;

use crate::crypto::decrypt_string;
use crate::crypto::encrypt_string;
use crate::crypto::security_provider::{
    InitializeParams, ProviderState, SecurityProviderManager, SecurityProviderType,
};
use crate::storage::FileStorage;

/// 接続ID
pub type ConnectionId = String;

/// 認証情報エントリ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialEntry {
    /// パスワード（復号化済み。永続化時はスキップ）
    #[serde(skip)]
    pub password: Option<String>,

    /// 暗号化されたパスワード
    pub encrypted_password: Option<String>,

    /// SSHキーのパスフレーズ（暗号化済み）
    pub encrypted_ssh_passphrase: Option<String>,

    /// SSL証明書のパスワード（暗号化済み）
    pub encrypted_ssl_password: Option<String>,

    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
}

/// 認証情報コレクション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialCollection {
    /// バージョン
    pub version: u32,

    /// 認証情報マップ（接続ID -> 認証情報）
    pub credentials: HashMap<ConnectionId, CredentialEntry>,

    /// 作成日時
    pub created_at: DateTime<Utc>,

    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
}

impl CredentialCollection {
    pub fn new() -> Self {
        let now = Utc::now();
        Self {
            version: 1,
            credentials: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

/// 認証情報エラー
#[derive(Debug, Error)]
pub enum CredentialError {
    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Encryption error: {0}")]
    EncryptionError(String),

    #[error("Decryption error: {0}")]
    DecryptionError(String),

    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Credential not found: {0}")]
    NotFound(String),
}

/// 認証情報ストレージ
pub struct CredentialStorage {
    /// ファイルストレージ
    file_storage: Arc<FileStorage>,

    /// セキュリティプロバイダーマネージャー
    provider_manager: Arc<SecurityProviderManager>,

    /// メモリキャッシュ
    cache: Arc<RwLock<Option<CredentialCollection>>>,

    /// ストレージキー
    storage_key: String,
}

impl CredentialStorage {
    /// ストレージキー
    const STORAGE_KEY: &'static str = "credentials";

    /// 新しいCredentialStorageを作成
    pub fn new(
        file_storage: Arc<FileStorage>,
        provider_manager: Arc<SecurityProviderManager>,
    ) -> Self {
        Self {
            file_storage,
            provider_manager,
            cache: Arc::new(RwLock::new(None)),
            storage_key: Self::STORAGE_KEY.to_string(),
        }
    }

    /// 接続IDに対応する認証情報を取得
    pub async fn get(
        &self,
        connection_id: &str,
    ) -> Result<Option<CredentialEntry>, CredentialError> {
        let mut collection = self.load_collection().await?;

        let entry = match collection.credentials.get(connection_id) {
            Some(entry) => entry.clone(),
            None => return Ok(None),
        };

        let decrypted = self.decrypt_entry(&entry).await?;
        // キャッシュ更新（復号済みは保持しない）
        collection.credentials.insert(
            connection_id.to_string(),
            CredentialEntry {
                password: None,
                ..entry
            },
        );
        *self.cache.write().await = Some(collection);

        Ok(Some(decrypted))
    }

    /// パスワードのみを取得
    pub async fn get_password(
        &self,
        connection_id: &str,
    ) -> Result<Option<String>, CredentialError> {
        let entry = self.get(connection_id).await?;
        Ok(entry.and_then(|e| e.password))
    }

    /// 認証情報を保存
    pub async fn save(
        &self,
        connection_id: &str,
        password: Option<&str>,
        ssh_passphrase: Option<&str>,
        ssl_password: Option<&str>,
    ) -> Result<(), CredentialError> {
        let mut collection = self.load_collection().await?;

        let key = self.get_or_init_key().await?;

        // 各フィールドを暗号化
        let encrypted_password = match password {
            Some(p) if !p.is_empty() => Some(
                encrypt_string(p, &key)
                    .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
            ),
            _ => None,
        };

        let encrypted_ssh_passphrase = match ssh_passphrase {
            Some(p) if !p.is_empty() => Some(
                encrypt_string(p, &key)
                    .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
            ),
            _ => None,
        };

        let encrypted_ssl_password = match ssl_password {
            Some(p) if !p.is_empty() => Some(
                encrypt_string(p, &key)
                    .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
            ),
            _ => None,
        };

        let entry = CredentialEntry {
            password: None,
            encrypted_password,
            encrypted_ssh_passphrase,
            encrypted_ssl_password,
            updated_at: Utc::now(),
        };

        collection
            .credentials
            .insert(connection_id.to_string(), entry);
        collection.updated_at = Utc::now();

        self.save_collection(&collection).await?;

        Ok(())
    }

    /// 認証情報を削除
    pub async fn delete(&self, connection_id: &str) -> Result<(), CredentialError> {
        let mut collection = self.load_collection().await?;

        if collection.credentials.remove(connection_id).is_some() {
            collection.updated_at = Utc::now();
            self.save_collection(&collection).await?;
        }

        Ok(())
    }

    /// 全ての認証情報を削除
    pub async fn delete_all(&self) -> Result<(), CredentialError> {
        let collection = CredentialCollection::new();
        self.save_collection(&collection).await?;
        Ok(())
    }

    /// 保持している認証情報の件数を取得
    pub async fn credential_count(&self) -> Result<usize, CredentialError> {
        let collection = self.load_collection().await?;
        Ok(collection.credentials.len())
    }

    /// 全ての認証情報を新しいキーで再暗号化
    pub async fn re_encrypt_all(
        &self,
        old_key: &[u8],
        new_key: &[u8],
    ) -> Result<(), CredentialError> {
        let mut collection = self.load_collection().await?;

        for (_, entry) in collection.credentials.iter_mut() {
            if let Some(encrypted) = &entry.encrypted_password {
                let decrypted = decrypt_string(encrypted, old_key)
                    .map_err(|e| CredentialError::DecryptionError(e.to_string()))?;
                entry.encrypted_password = Some(
                    encrypt_string(&decrypted, new_key)
                        .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
                );
            }

            if let Some(encrypted) = &entry.encrypted_ssh_passphrase {
                let decrypted = decrypt_string(encrypted, old_key)
                    .map_err(|e| CredentialError::DecryptionError(e.to_string()))?;
                entry.encrypted_ssh_passphrase = Some(
                    encrypt_string(&decrypted, new_key)
                        .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
                );
            }

            if let Some(encrypted) = &entry.encrypted_ssl_password {
                let decrypted = decrypt_string(encrypted, old_key)
                    .map_err(|e| CredentialError::DecryptionError(e.to_string()))?;
                entry.encrypted_ssl_password = Some(
                    encrypt_string(&decrypted, new_key)
                        .map_err(|e| CredentialError::EncryptionError(e.to_string()))?,
                );
            }

            entry.updated_at = Utc::now();
        }

        collection.updated_at = Utc::now();
        self.save_collection(&collection).await?;

        Ok(())
    }

    /// キャッシュをクリア
    pub async fn clear_cache(&self) {
        *self.cache.write().await = None;
    }

    /// コレクションを読み込み
    async fn load_collection(&self) -> Result<CredentialCollection, CredentialError> {
        if let Some(collection) = self.cache.read().await.as_ref() {
            return Ok(collection.clone());
        }

        let collection = match self
            .file_storage
            .read::<CredentialCollection>(&self.storage_key)
        {
            Ok(c) => c,
            Err(crate::storage::StorageError::NotFound(_)) => CredentialCollection::new(),
            Err(e) => return Err(CredentialError::StorageError(e.to_string())),
        };

        *self.cache.write().await = Some(collection.clone());

        Ok(collection)
    }

    /// コレクションを保存
    async fn save_collection(
        &self,
        collection: &CredentialCollection,
    ) -> Result<(), CredentialError> {
        self.file_storage
            .write(&self.storage_key, collection)
            .map_err(|e| CredentialError::StorageError(e.to_string()))?;

        *self.cache.write().await = Some(collection.clone());

        Ok(())
    }

    /// エントリを復号化
    async fn decrypt_entry(
        &self,
        entry: &CredentialEntry,
    ) -> Result<CredentialEntry, CredentialError> {
        let key = self.get_or_init_key().await?;

        let password = match &entry.encrypted_password {
            Some(encrypted) => Some(
                decrypt_string(encrypted, &key)
                    .map_err(|e| CredentialError::DecryptionError(e.to_string()))?,
            ),
            None => None,
        };

        Ok(CredentialEntry {
            password,
            encrypted_password: entry.encrypted_password.clone(),
            encrypted_ssh_passphrase: entry.encrypted_ssh_passphrase.clone(),
            encrypted_ssl_password: entry.encrypted_ssl_password.clone(),
            updated_at: entry.updated_at,
        })
    }

    /// 暗号化キーを取得（Simpleプロバイダーは自動初期化）
    async fn get_or_init_key(&self) -> Result<Vec<u8>, CredentialError> {
        let provider_type = self.provider_manager.current_provider_type().await;
        let state = self.provider_manager.state().await;

        if matches!(state, ProviderState::Uninitialized)
            && matches!(provider_type, SecurityProviderType::Simple)
        {
            self.provider_manager
                .initialize(InitializeParams::Simple)
                .await
                .map_err(|e| CredentialError::ProviderError(e.to_string()))?;
        }

        self.provider_manager
            .get_encryption_key()
            .await
            .map_err(|e| CredentialError::ProviderError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::security_provider::SecurityConfigStorage;
    use tempfile::TempDir;

    async fn create_test_storage() -> (CredentialStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("data");
        let settings_dir = temp_dir.path().join("settings");

        let file_storage = Arc::new(FileStorage::new(data_dir).unwrap());
        let security_storage = Arc::new(FileStorage::new(settings_dir).unwrap());
        let config_storage = Arc::new(SecurityConfigStorage::new(Arc::clone(&security_storage)));

        let provider_manager = Arc::new(
            SecurityProviderManager::new(
                Arc::clone(&config_storage),
                Arc::clone(&security_storage),
            )
            .await
            .unwrap(),
        );

        let storage = CredentialStorage::new(file_storage, provider_manager);
        (storage, temp_dir)
    }

    #[tokio::test]
    async fn test_save_and_get_password() {
        let (storage, _temp) = create_test_storage().await;

        storage
            .save("conn-1", Some("secret123"), None, None)
            .await
            .unwrap();

        let password = storage.get_password("conn-1").await.unwrap();
        assert_eq!(password, Some("secret123".to_string()));
    }

    #[tokio::test]
    async fn test_delete_credential() {
        let (storage, _temp) = create_test_storage().await;

        storage
            .save("conn-1", Some("secret123"), None, None)
            .await
            .unwrap();
        storage.delete("conn-1").await.unwrap();

        let password = storage.get_password("conn-1").await.unwrap();
        assert!(password.is_none());
    }

    #[tokio::test]
    async fn test_update_password() {
        let (storage, _temp) = create_test_storage().await;

        storage
            .save("conn-1", Some("old_password"), None, None)
            .await
            .unwrap();
        storage
            .save("conn-1", Some("new_password"), None, None)
            .await
            .unwrap();

        let password = storage.get_password("conn-1").await.unwrap();
        assert_eq!(password, Some("new_password".to_string()));
    }

    #[tokio::test]
    async fn test_multiple_credentials() {
        let (storage, _temp) = create_test_storage().await;

        storage
            .save("conn-1", Some("pass1"), None, None)
            .await
            .unwrap();
        storage
            .save("conn-2", Some("pass2"), None, None)
            .await
            .unwrap();

        assert_eq!(
            storage.get_password("conn-1").await.unwrap(),
            Some("pass1".to_string())
        );
        assert_eq!(
            storage.get_password("conn-2").await.unwrap(),
            Some("pass2".to_string())
        );
    }
}
