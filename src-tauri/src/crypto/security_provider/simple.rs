use std::sync::{Arc, RwLock};

use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::simple_key::derive_master_key;
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};
use crate::storage::{FileStorage, StorageError};

/// アプリ固定のシード値（コンパイル時に埋め込む）
/// 公開情報となるため、環境情報とソルトを組み合わせて使用する
const APP_SEED: &[u8] = b"sql-query-build-v1-simple-provider-seed-2024";

/// シンプルプロバイダー
///
/// パスワード入力なしで利用できる固定キー暗号化を提供する
pub struct SimpleProvider {
    /// プロバイダーの状態
    state: RwLock<ProviderState>,

    /// 暗号化キー（メモリ上にキャッシュ）
    cached_key: RwLock<Option<Zeroizing<Vec<u8>>>>,

    /// ユーザー固有ソルトのストレージ
    storage: Option<Arc<FileStorage>>,
}

/// ソルト設定
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SimpleSaltConfig {
    version: u32,
    salt: Vec<u8>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl SimpleProvider {
    /// 新しいSimpleProviderを作成
    pub fn new() -> Self {
        Self {
            state: RwLock::new(ProviderState::Uninitialized),
            cached_key: RwLock::new(None),
            storage: None,
        }
    }

    /// ストレージを設定
    pub fn with_storage(mut self, storage: Arc<FileStorage>) -> Self {
        self.storage = Some(storage);
        self
    }

    /// マスターキーを生成
    fn generate_master_key(&self, user_salt: &[u8]) -> Zeroizing<Vec<u8>> {
        derive_master_key(APP_SEED, user_salt)
    }

    /// ユーザー固有ソルトを取得または生成
    async fn get_or_create_user_salt(&self) -> SecurityProviderResult<Vec<u8>> {
        let storage = self
            .storage
            .as_ref()
            .ok_or_else(|| SecurityProviderError::Internal("Storage not configured".to_string()))?;

        match storage.read::<SimpleSaltConfig>("simple_provider_salt") {
            Ok(config) => Ok(config.salt),
            Err(StorageError::NotFound(_)) => {
                let salt = Self::generate_random_salt();
                let config = SimpleSaltConfig {
                    version: 1,
                    salt: salt.clone(),
                    created_at: Utc::now(),
                };
                storage
                    .write("simple_provider_salt", &config)
                    .map_err(|e| SecurityProviderError::StorageError(e.to_string()))?;
                Ok(salt)
            }
            Err(e) => Err(SecurityProviderError::StorageError(e.to_string())),
        }
    }

    /// ランダムなソルトを生成
    fn generate_random_salt() -> Vec<u8> {
        use rand::RngCore;
        let mut salt = vec![0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// 暗号化キーを取得（未初期化なら自動初期化）
    pub async fn get_or_init_encryption_key(&mut self) -> SecurityProviderResult<Vec<u8>> {
        if self.needs_initialization() {
            self.initialize(InitializeParams::Simple).await?;
        }
        self.get_encryption_key().await
    }
}

#[async_trait]
impl SecurityProvider for SimpleProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::Simple
    }

    fn state(&self) -> ProviderState {
        self.state.read().unwrap().clone()
    }

    fn needs_initialization(&self) -> bool {
        matches!(*self.state.read().unwrap(), ProviderState::Uninitialized)
    }

    fn needs_unlock(&self) -> bool {
        // Simpleプロバイダーはアンロック不要
        false
    }

    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()> {
        if !matches!(params, InitializeParams::Simple) {
            return Err(SecurityProviderError::InvalidParams(
                "Simple provider requires Simple params".to_string(),
            ));
        }

        let user_salt = self.get_or_create_user_salt().await?;

        // マスターキーを生成してキャッシュ
        let key = self.generate_master_key(&user_salt);
        *self.cached_key.write().unwrap() = Some(key);

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Ready;

        Ok(())
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        if !matches!(params, UnlockParams::Simple) {
            return Err(SecurityProviderError::InvalidParams(
                "Simple provider does not support unlock parameters".to_string(),
            ));
        }

        // initialize()と同じ処理を実行
        self.initialize(InitializeParams::Simple).await
    }

    async fn lock(&mut self) {
        // キーをクリア（zeroize）
        *self.cached_key.write().unwrap() = None;

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Locked;
    }

    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        if matches!(*self.state.read().unwrap(), ProviderState::Locked) {
            return Err(SecurityProviderError::Locked);
        }

        // キャッシュからキーを取得
        let cached = self.cached_key.read().unwrap();
        match cached.as_ref() {
            Some(key) => Ok(key.to_vec()),
            None => Err(SecurityProviderError::NotInitialized),
        }
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        // キーをクリア
        *self.cached_key.write().unwrap() = None;

        // ソルト設定を削除
        if let Some(storage) = &self.storage {
            let _ = storage.delete("simple_provider_salt");
        }

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Uninitialized;

        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        // Simpleプロバイダーは常に有効
        Ok(())
    }
}

impl Default for SimpleProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for SimpleProvider {
    fn drop(&mut self) {
        // プロバイダー破棄時にキーをクリア
        if let Ok(mut cached) = self.cached_key.write() {
            *cached = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tempfile::TempDir;

    fn create_test_storage() -> (Arc<FileStorage>, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
        (storage, temp_dir)
    }

    #[tokio::test]
    async fn test_simple_provider_initialization() {
        let (storage, _temp) = create_test_storage();
        let mut provider = SimpleProvider::new().with_storage(storage);

        assert!(provider.needs_initialization());
        assert_eq!(provider.state(), ProviderState::Uninitialized);

        provider.initialize(InitializeParams::Simple).await.unwrap();

        assert!(!provider.needs_initialization());
        assert_eq!(provider.state(), ProviderState::Ready);
    }

    #[tokio::test]
    async fn test_simple_provider_get_key() {
        let (storage, _temp) = create_test_storage();
        let mut provider = SimpleProvider::new().with_storage(storage);

        provider.initialize(InitializeParams::Simple).await.unwrap();

        let key = provider.get_encryption_key().await.unwrap();
        assert_eq!(key.len(), 32);
    }

    #[tokio::test]
    async fn test_simple_provider_key_consistency() {
        let (storage, _temp) = create_test_storage();
        let mut provider = SimpleProvider::new().with_storage(storage.clone());

        provider.initialize(InitializeParams::Simple).await.unwrap();
        let key1 = provider.get_encryption_key().await.unwrap();

        // 新しいプロバイダーインスタンスでも同じキーが得られる
        let mut provider2 = SimpleProvider::new().with_storage(storage);
        provider2.initialize(InitializeParams::Simple).await.unwrap();
        let key2 = provider2.get_encryption_key().await.unwrap();

        assert_eq!(key1, key2);
    }

    #[tokio::test]
    async fn test_simple_provider_reset() {
        let (storage, _temp) = create_test_storage();
        let mut provider = SimpleProvider::new().with_storage(storage.clone());

        provider.initialize(InitializeParams::Simple).await.unwrap();
        let key1 = provider.get_encryption_key().await.unwrap();

        provider.reset().await.unwrap();
        assert!(provider.needs_initialization());

        // リセット後は新しいソルトで新しいキーが生成される
        provider.initialize(InitializeParams::Simple).await.unwrap();
        let key2 = provider.get_encryption_key().await.unwrap();

        assert_ne!(key1, key2);
    }

    #[tokio::test]
    async fn test_simple_provider_no_unlock_required() {
        let provider = SimpleProvider::new();
        assert!(!provider.needs_unlock());
    }

    #[tokio::test]
    async fn test_simple_provider_lock() {
        let (storage, _temp) = create_test_storage();
        let mut provider = SimpleProvider::new().with_storage(storage);

        provider.initialize(InitializeParams::Simple).await.unwrap();
        provider.lock().await;

        assert!(provider.state().is_locked());

        // ロック後はキー取得がエラーになる
        assert!(provider.get_encryption_key().await.is_err());
    }
}
