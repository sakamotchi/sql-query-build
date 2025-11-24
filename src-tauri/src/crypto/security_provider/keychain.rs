use std::sync::{Arc, RwLock};

use async_trait::async_trait;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};
use crate::crypto::master_key::{MasterKeyError, MasterKeyManager};

/// OSキーチェーンプロバイダー
///
/// MasterKeyManagerをラップし、SecurityProviderとして扱う。
pub struct KeychainProvider {
    /// 既存のマスターキー管理
    manager: Arc<MasterKeyManager>,

    /// プロバイダーの状態
    state: RwLock<ProviderState>,

    /// 暗号化キーのキャッシュ
    cached_key: RwLock<Option<Vec<u8>>>,
}

impl KeychainProvider {
    /// 新しいKeychainProviderを作成
    pub fn new() -> Self {
        let manager = Arc::new(MasterKeyManager::new());
        let state = if manager.is_initialized() {
            ProviderState::Ready
        } else {
            ProviderState::Uninitialized
        };

        Self {
            manager,
            state: RwLock::new(state),
            cached_key: RwLock::new(None),
        }
    }

    /// 既存のMasterKeyManagerを使用して作成（テスト用）
    pub fn with_manager(manager: Arc<MasterKeyManager>) -> Self {
        let state = if manager.is_initialized() {
            ProviderState::Ready
        } else {
            ProviderState::Uninitialized
        };

        Self {
            manager,
            state: RwLock::new(state),
            cached_key: RwLock::new(None),
        }
    }

    /// MasterKeyErrorをSecurityProviderErrorに変換
    fn convert_error(err: MasterKeyError) -> SecurityProviderError {
        match err {
            MasterKeyError::NotInitialized => SecurityProviderError::NotInitialized,
            MasterKeyError::AlreadyInitialized => SecurityProviderError::AlreadyInitialized,
            MasterKeyError::KeychainError(e) => SecurityProviderError::KeychainError(e.to_string()),
            MasterKeyError::InvalidKeyLength => {
                SecurityProviderError::EncryptionError("Invalid key length".to_string())
            }
            MasterKeyError::AccessDenied => {
                SecurityProviderError::KeychainError("Access denied".to_string())
            }
            MasterKeyError::Base64Error(e) => {
                SecurityProviderError::EncryptionError(e.to_string())
            }
        }
    }

    /// 起動時に自動的にキーを取得（キャッシュに読み込み）
    pub async fn auto_unlock(&mut self) -> SecurityProviderResult<()> {
        if self.manager.is_initialized() {
            self.unlock(UnlockParams::Keychain).await?;
        }
        Ok(())
    }
}

#[async_trait]
impl SecurityProvider for KeychainProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::Keychain
    }

    fn state(&self) -> ProviderState {
        self.state.read().unwrap().clone()
    }

    fn needs_initialization(&self) -> bool {
        !self.manager.is_initialized()
    }

    fn needs_unlock(&self) -> bool {
        // KeychainプロバイダーはOSが認証を管理するため、
        // 明示的なアンロックは不要
        false
    }

    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()> {
        if !matches!(params, InitializeParams::Keychain) {
            return Err(SecurityProviderError::InvalidParams(
                "Keychain provider requires Keychain params".to_string(),
            ));
        }

        self.manager
            .initialize()
            .await
            .map_err(Self::convert_error)?;

        let key = self
            .manager
            .get_master_key()
            .await
            .map_err(Self::convert_error)?;

        *self.cached_key.write().unwrap() = Some(key);
        *self.state.write().unwrap() = ProviderState::Ready;

        Ok(())
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        if !matches!(params, UnlockParams::Keychain) {
            return Err(SecurityProviderError::InvalidParams(
                "Keychain provider requires Keychain params".to_string(),
            ));
        }

        // OSキーチェーンへのアクセス時にOS認証が行われる可能性あり
        let key = self
            .manager
            .get_master_key()
            .await
            .map_err(Self::convert_error)?;

        *self.cached_key.write().unwrap() = Some(key);
        *self.state.write().unwrap() = ProviderState::Ready;

        Ok(())
    }

    async fn lock(&mut self) {
        *self.cached_key.write().unwrap() = None;
        self.manager.clear_cache().await;
        *self.state.write().unwrap() = ProviderState::Locked;
    }

    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        {
            let cached = self.cached_key.read().unwrap();
            if let Some(key) = cached.as_ref() {
                return Ok(key.clone());
            }
        }

        let key = self
            .manager
            .get_master_key()
            .await
            .map_err(Self::convert_error)?;

        *self.cached_key.write().unwrap() = Some(key.clone());

        Ok(key)
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        *self.cached_key.write().unwrap() = None;

        self.manager
            .delete_master_key()
            .await
            .map_err(Self::convert_error)?;

        *self.state.write().unwrap() = ProviderState::Uninitialized;

        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        Ok(())
    }
}

impl Default for KeychainProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::master_key::keychain::{tests::MockKeychain, Keychain};

    fn create_mock_provider() -> KeychainProvider {
        let mock_keychain = Arc::new(MockKeychain::new());
        let manager = Arc::new(MasterKeyManager::with_keychain(mock_keychain));
        KeychainProvider::with_manager(manager)
    }

    #[tokio::test]
    async fn test_keychain_provider_initialization() {
        let mut provider = create_mock_provider();

        assert!(provider.needs_initialization());

        provider
            .initialize(InitializeParams::Keychain)
            .await
            .unwrap();

        assert!(!provider.needs_initialization());
        assert!(provider.state().is_ready());
    }

    #[tokio::test]
    async fn test_keychain_provider_get_key() {
        let mut provider = create_mock_provider();

        provider
            .initialize(InitializeParams::Keychain)
            .await
            .unwrap();

        let key = provider.get_encryption_key().await.unwrap();
        assert_eq!(key.len(), 32);
    }

    #[tokio::test]
    async fn test_keychain_provider_no_unlock_required() {
        let provider = create_mock_provider();
        assert!(!provider.needs_unlock());
    }

    #[tokio::test]
    async fn test_keychain_provider_reset() {
        let mut provider = create_mock_provider();

        provider
            .initialize(InitializeParams::Keychain)
            .await
            .unwrap();
        assert!(!provider.needs_initialization());

        provider.reset().await.unwrap();
        assert!(provider.needs_initialization());
    }

    #[tokio::test]
    async fn test_keychain_provider_key_consistency() {
        let mut provider = create_mock_provider();

        provider
            .initialize(InitializeParams::Keychain)
            .await
            .unwrap();

        let key1 = provider.get_encryption_key().await.unwrap();
        let key2 = provider.get_encryption_key().await.unwrap();

        assert_eq!(key1, key2);
    }

    #[tokio::test]
    async fn test_keychain_provider_auto_unlock() {
        let keychain: Arc<dyn Keychain> = Arc::new(MockKeychain::new());
        let manager = Arc::new(MasterKeyManager::with_keychain(Arc::clone(&keychain)));
        manager.initialize().await.unwrap();

        let mut provider = KeychainProvider::with_manager(manager);
        provider.auto_unlock().await.unwrap();

        assert!(provider.state().is_ready());
        assert_eq!(provider.get_encryption_key().await.unwrap().len(), 32);
    }
}
