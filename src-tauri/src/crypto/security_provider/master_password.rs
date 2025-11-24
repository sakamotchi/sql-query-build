use async_trait::async_trait;
use sha2::{Digest, Sha256};

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};

/// マスターパスワードベースのプロバイダー
pub struct MasterPasswordProvider {
    state: ProviderState,
    key: Option<Vec<u8>>,
    password_hash: Option<Vec<u8>>,
}

impl MasterPasswordProvider {
    pub fn new() -> Self {
        Self {
            state: ProviderState::Uninitialized,
            key: None,
            password_hash: None,
        }
    }

    fn hash_password(password: &str) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        hasher.finalize().to_vec()
    }

    fn derive_key(password: &str) -> Vec<u8> {
        Self::hash_password(password)
    }

    fn ensure_ready(&self) -> SecurityProviderResult<()> {
        match self.state {
            ProviderState::Ready => Ok(()),
            ProviderState::Locked => Err(SecurityProviderError::Locked),
            ProviderState::Uninitialized => Err(SecurityProviderError::NotInitialized),
            ProviderState::Error(ref msg) => Err(SecurityProviderError::Internal(msg.clone())),
        }
    }

    fn ensure_initialized(&self) -> SecurityProviderResult<()> {
        if self.password_hash.is_none() {
            Err(SecurityProviderError::NotInitialized)
        } else {
            Ok(())
        }
    }
}

#[async_trait]
impl SecurityProvider for MasterPasswordProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::MasterPassword
    }

    fn state(&self) -> ProviderState {
        self.state.clone()
    }

    fn needs_initialization(&self) -> bool {
        self.password_hash.is_none() || matches!(self.state, ProviderState::Uninitialized)
    }

    fn needs_unlock(&self) -> bool {
        matches!(self.state, ProviderState::Locked)
    }

    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()> {
        match params {
            InitializeParams::MasterPassword {
                password,
                password_confirm,
            } => {
                if self.password_hash.is_some() {
                    return Err(SecurityProviderError::AlreadyInitialized);
                }

                if password != password_confirm {
                    return Err(SecurityProviderError::PasswordMismatch);
                }

                let hash = Self::hash_password(&password);
                self.key = Some(Self::derive_key(&password));
                self.password_hash = Some(hash);
                self.state = ProviderState::Ready;
                Ok(())
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Master password parameters are required".to_string(),
            )),
        }
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        self.ensure_initialized()?;

        match params {
            UnlockParams::MasterPassword { password } => {
                let hash = Self::hash_password(&password);
                match &self.password_hash {
                    Some(expected) if *expected == hash => {
                        self.key = Some(Self::derive_key(&password));
                        self.state = ProviderState::Ready;
                        Ok(())
                    }
                    _ => Err(SecurityProviderError::AuthenticationFailed),
                }
            }
            _ => Err(SecurityProviderError::InvalidParams(
                "Master password parameters are required".to_string(),
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
            None => Err(SecurityProviderError::NotInitialized),
        }
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        self.state = ProviderState::Uninitialized;
        self.key = None;
        self.password_hash = None;
        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        if self.password_hash.is_some() {
            Ok(())
        } else {
            Err(SecurityProviderError::NotInitialized)
        }
    }
}
