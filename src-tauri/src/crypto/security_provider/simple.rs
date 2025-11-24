use async_trait::async_trait;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};

/// シンプルな固定キーを提供するプロバイダー
pub struct SimpleProvider {
    state: ProviderState,
    key: Vec<u8>,
}

impl SimpleProvider {
    pub fn new() -> Self {
        Self {
            state: ProviderState::Ready,
            key: vec![0u8; 32],
        }
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
impl SecurityProvider for SimpleProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::Simple
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
            InitializeParams::Simple => {
                self.state = ProviderState::Ready;
                self.key = vec![0u8; 32];
                Ok(())
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Simple provider does not require parameters".to_string(),
            )),
        }
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        match params {
            UnlockParams::Simple => {
                self.state = ProviderState::Ready;
                Ok(())
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Simple provider does not support unlock parameters".to_string(),
            )),
        }
    }

    async fn lock(&mut self) {
        self.state = ProviderState::Locked;
    }

    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        self.ensure_ready()?;
        Ok(self.key.clone())
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        self.state = ProviderState::Uninitialized;
        self.key.clear();
        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        if self.key.len() == 32 {
            Ok(())
        } else {
            Err(SecurityProviderError::Internal(
                "Invalid key length".to_string(),
            ))
        }
    }
}
