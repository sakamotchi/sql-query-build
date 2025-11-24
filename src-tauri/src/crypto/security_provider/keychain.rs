use async_trait::async_trait;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};

/// OSキーチェーンを利用するプロバイダー（プレースホルダー実装）
pub struct KeychainProvider {
    state: ProviderState,
    key: Option<Vec<u8>>,
}

impl KeychainProvider {
    pub fn new() -> Self {
        Self {
            state: ProviderState::Ready,
            key: Some(Self::default_key()),
        }
    }

    fn default_key() -> Vec<u8> {
        // TODO: 実装時にOSキーチェーンからキーを取得する
        vec![1u8; 32]
    }

    fn ensure_ready(&self) -> SecurityProviderResult<()> {
        match self.state {
            ProviderState::Ready => Ok(()),
            ProviderState::Locked => Err(SecurityProviderError::Locked),
            ProviderState::Uninitialized => Err(SecurityProviderError::NotInitialized),
            ProviderState::Error(ref msg) => Err(SecurityProviderError::Internal(msg.clone())),
        }
    }
}

#[async_trait]
impl SecurityProvider for KeychainProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::Keychain
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

    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()> {
        match params {
            InitializeParams::Keychain => {
                self.state = ProviderState::Ready;
                if self.key.is_none() {
                    self.key = Some(Self::default_key());
                }
                Ok(())
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Keychain provider does not require parameters".to_string(),
            )),
        }
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        match params {
            UnlockParams::Keychain => {
                self.state = ProviderState::Ready;
                if self.key.is_none() {
                    self.key = Some(Self::default_key());
                }
                Ok(())
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Keychain provider does not require parameters".to_string(),
            )),
        }
    }

    async fn lock(&mut self) {
        self.key = None;
        self.state = ProviderState::Locked;
    }

    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        self.ensure_ready()?;
        match &self.key {
            Some(key) => Ok(key.clone()),
            None => Err(SecurityProviderError::KeychainError(
                "Key is not available".to_string(),
            )),
        }
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        self.state = ProviderState::Ready;
        self.key = Some(Self::default_key());
        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        Ok(())
    }
}
