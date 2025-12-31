pub mod encryption;
pub mod error;
pub mod master_key;
pub mod password_cache;
pub mod security_provider;
pub mod types;

// 公開API
pub use encryption::{decrypt_string, encrypt_string, AesGcmEncryptor, Encryptor};
pub use error::{CryptoError, CryptoResult};
pub use master_key::{MasterKeyError, MasterKeyManager, MasterKeyResult};
pub use password_cache::DecryptedPasswordCache;
pub use security_provider::{
    CredentialCollection, CredentialEntry, CredentialError, CredentialStorage, InitializeParams,
    ProviderSpecificConfig, ProviderState, ProviderSwitcher, SecurityConfig, SecurityConfigError,
    SecurityConfigStorage, SecurityProvider, SecurityProviderError, SecurityProviderInfo,
    SecurityProviderManager, SecurityProviderResult, SecurityProviderType, SwitchError,
    SwitchParams, SwitchResult, UnlockParams,
};
pub use types::{EncryptedData, EncryptionKey};
