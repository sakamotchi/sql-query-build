pub mod error;
pub mod keychain;
pub mod manager;
pub mod master_password;
mod simple_key;
pub mod simple;
pub mod traits;
pub mod types;

pub use error::{SecurityProviderError, SecurityProviderResult};
pub use keychain::KeychainProvider;
pub use manager::{SecurityConfigStorage, SecurityProviderManager};
pub use master_password::MasterPasswordProvider;
pub use simple::SimpleProvider;
pub use traits::SecurityProvider;
pub use types::{
    InitializeParams, ProviderState, SecurityProviderInfo, SecurityProviderType, UnlockParams,
};

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;

    /// モックプロバイダー（テスト用）
    pub struct MockProvider {
        provider_type: SecurityProviderType,
        state: ProviderState,
        key: Option<Vec<u8>>,
    }

    #[allow(dead_code)]
    impl MockProvider {
        pub fn new(provider_type: SecurityProviderType) -> Self {
            Self {
                provider_type,
                state: ProviderState::Uninitialized,
                key: None,
            }
        }

        pub fn with_state(mut self, state: ProviderState) -> Self {
            self.state = state;
            self
        }

        pub fn with_key(mut self, key: Vec<u8>) -> Self {
            self.key = Some(key);
            self.state = ProviderState::Ready;
            self
        }
    }

    #[async_trait]
    impl SecurityProvider for MockProvider {
        fn provider_type(&self) -> SecurityProviderType {
            self.provider_type
        }

        fn state(&self) -> ProviderState {
            self.state.clone()
        }

        fn needs_initialization(&self) -> bool {
            matches!(self.state, ProviderState::Uninitialized)
        }

        fn needs_unlock(&self) -> bool {
            matches!(self.state, ProviderState::Locked)
        }

        async fn initialize(&mut self, _params: InitializeParams) -> SecurityProviderResult<()> {
            self.key = Some(vec![0u8; 32]);
            self.state = ProviderState::Ready;
            Ok(())
        }

        async fn unlock(&mut self, _params: UnlockParams) -> SecurityProviderResult<()> {
            self.state = ProviderState::Ready;
            Ok(())
        }

        async fn lock(&mut self) {
            self.state = ProviderState::Locked;
        }

        async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
            self.key.clone().ok_or(SecurityProviderError::NotInitialized)
        }

        async fn reset(&mut self) -> SecurityProviderResult<()> {
            self.key = None;
            self.state = ProviderState::Uninitialized;
            Ok(())
        }

        fn validate(&self) -> SecurityProviderResult<()> {
            Ok(())
        }
    }

    #[test]
    fn test_security_provider_type_default() {
        let default = SecurityProviderType::default();
        assert_eq!(default, SecurityProviderType::Simple);
    }

    #[test]
    fn test_security_provider_type_display_name() {
        assert_eq!(
            SecurityProviderType::Simple.display_name(),
            "Simple (Default)"
        );
        assert_eq!(
            SecurityProviderType::MasterPassword.display_name(),
            "Master Password"
        );
        assert_eq!(SecurityProviderType::Keychain.display_name(), "OS Keychain");
    }

    #[test]
    fn test_security_provider_type_security_level() {
        assert_eq!(SecurityProviderType::Simple.security_level(), 1);
        assert_eq!(SecurityProviderType::MasterPassword.security_level(), 2);
        assert_eq!(SecurityProviderType::Keychain.security_level(), 3);
    }

    #[test]
    fn test_security_provider_type_requires_unlock() {
        assert!(!SecurityProviderType::Simple.requires_unlock());
        assert!(SecurityProviderType::MasterPassword.requires_unlock());
        assert!(!SecurityProviderType::Keychain.requires_unlock());
    }

    #[tokio::test]
    async fn test_mock_provider_lifecycle() {
        let mut provider = MockProvider::new(SecurityProviderType::Simple);

        // 初期状態
        assert!(provider.needs_initialization());
        assert!(!provider.needs_unlock());

        // 初期化
        provider
            .initialize(InitializeParams::Simple)
            .await
            .unwrap();
        assert!(!provider.needs_initialization());
        assert!(provider.state().is_ready());

        // キー取得
        let key = provider.get_encryption_key().await.unwrap();
        assert_eq!(key.len(), 32);

        // ロック
        provider.lock().await;
        assert!(provider.state().is_locked());

        // リセット
        provider.reset().await.unwrap();
        assert!(provider.needs_initialization());
    }

    #[test]
    fn test_provider_state_checks() {
        assert!(ProviderState::Ready.is_ready());
        assert!(!ProviderState::Locked.is_ready());

        assert!(ProviderState::Locked.is_locked());
        assert!(!ProviderState::Ready.is_locked());
    }
}
