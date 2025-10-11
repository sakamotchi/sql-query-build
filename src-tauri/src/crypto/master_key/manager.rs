use super::error::{MasterKeyError, MasterKeyResult};
use super::keychain::{Keychain, OsKeychain};
use super::types::{KeychainEntry, MasterKey};
use std::sync::Arc;
use tokio::sync::RwLock;

/// マスターキーを管理する構造体
pub struct MasterKeyManager {
    /// キーチェーン実装
    keychain: Arc<dyn Keychain>,

    /// メモリキャッシュ
    cache: Arc<RwLock<Option<MasterKey>>>,

    /// キーチェーンエントリ
    entry: KeychainEntry,
}

impl MasterKeyManager {
    /// 新しいマネージャーインスタンスを作成
    pub fn new() -> Self {
        Self {
            keychain: Arc::new(OsKeychain),
            cache: Arc::new(RwLock::new(None)),
            entry: KeychainEntry::master_key(),
        }
    }

    /// カスタムキーチェーン実装を使用してマネージャーを作成（テスト用）
    pub fn with_keychain(keychain: Arc<dyn Keychain>) -> Self {
        Self {
            keychain,
            cache: Arc::new(RwLock::new(None)),
            entry: KeychainEntry::master_key(),
        }
    }

    /// マスターキーを初期化（初回起動時）
    pub async fn initialize(&self) -> MasterKeyResult<()> {
        // 既にキーが存在する場合はエラー
        if self.keychain.exists(&self.entry) {
            return Err(MasterKeyError::AlreadyInitialized);
        }

        // 新しいマスターキーを生成
        let master_key = MasterKey::generate();

        // キーチェーンに保存
        self.keychain.store_key(&self.entry, &master_key)?;

        // キャッシュに保存
        let mut cache = self.cache.write().await;
        *cache = Some(master_key);

        Ok(())
    }

    /// マスターキーが初期化済みかチェック
    pub fn is_initialized(&self) -> bool {
        self.keychain.exists(&self.entry)
    }

    /// マスターキーを取得
    pub async fn get_master_key(&self) -> MasterKeyResult<Vec<u8>> {
        // キャッシュをチェック
        {
            let cache = self.cache.read().await;
            if let Some(ref key) = *cache {
                return Ok(key.as_bytes().to_vec());
            }
        }

        // キャッシュにない場合はキーチェーンから取得
        let key = self.keychain.retrieve_key(&self.entry)?;

        // キャッシュに保存
        let key_bytes = key.as_bytes().to_vec();
        {
            let mut cache = self.cache.write().await;
            *cache = Some(key);
        }

        Ok(key_bytes)
    }

    /// キャッシュをクリア
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        *cache = None;
    }

    /// マスターキーを削除（リセット機能）
    pub async fn delete_master_key(&self) -> MasterKeyResult<()> {
        // キーチェーンから削除
        self.keychain.delete_key(&self.entry)?;

        // キャッシュもクリア
        self.clear_cache().await;

        Ok(())
    }

    /// マスターキーを再生成（パスワードリセット時など）
    pub async fn regenerate(&self) -> MasterKeyResult<()> {
        // 既存のキーを削除
        self.delete_master_key().await?;

        // 新しいキーで初期化
        self.initialize().await?;

        Ok(())
    }
}

impl Default for MasterKeyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::master_key::keychain::tests::MockKeychain;

    #[tokio::test]
    async fn test_initialize_master_key() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        assert!(!manager.is_initialized());

        manager.initialize().await.unwrap();

        assert!(manager.is_initialized());
    }

    #[tokio::test]
    async fn test_get_master_key() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        manager.initialize().await.unwrap();

        let key1 = manager.get_master_key().await.unwrap();
        let key2 = manager.get_master_key().await.unwrap();

        // 同じキーが返されることを確認
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[tokio::test]
    async fn test_cache_works() {
        let keychain = Arc::new(MockKeychain::new());
        let manager = MasterKeyManager::with_keychain(keychain.clone());

        manager.initialize().await.unwrap();

        // 1回目の取得（キーチェーンから）
        let key1 = manager.get_master_key().await.unwrap();

        // 2回目の取得（キャッシュから）
        let key2 = manager.get_master_key().await.unwrap();

        assert_eq!(key1, key2);
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        manager.initialize().await.unwrap();
        let _key1 = manager.get_master_key().await.unwrap();

        manager.clear_cache().await;

        // キャッシュクリア後も取得可能
        let key2 = manager.get_master_key().await.unwrap();
        assert_eq!(key2.len(), 32);
    }

    #[tokio::test]
    async fn test_delete_master_key() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        manager.initialize().await.unwrap();
        assert!(manager.is_initialized());

        manager.delete_master_key().await.unwrap();
        assert!(!manager.is_initialized());
    }

    #[tokio::test]
    async fn test_regenerate() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        manager.initialize().await.unwrap();
        let key1 = manager.get_master_key().await.unwrap();

        manager.regenerate().await.unwrap();
        let key2 = manager.get_master_key().await.unwrap();

        // 異なるキーが生成されることを確認
        assert_ne!(key1, key2);
    }

    #[tokio::test]
    async fn test_double_initialization_fails() {
        let manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

        manager.initialize().await.unwrap();

        let result = manager.initialize().await;
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            MasterKeyError::AlreadyInitialized
        ));
    }
}
