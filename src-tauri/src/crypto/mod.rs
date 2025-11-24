pub mod encryption;
pub mod error;
pub mod master_key;
pub mod security_provider;
pub mod types;

// 公開API
pub use encryption::{decrypt_string, encrypt_string, AesGcmEncryptor, Encryptor};
pub use error::{CryptoError, CryptoResult};
pub use master_key::{MasterKeyError, MasterKeyManager, MasterKeyResult};
pub use security_provider::{
    InitializeParams, ProviderState, SecurityConfigStorage, SecurityProvider,
    SecurityProviderError, SecurityProviderInfo, SecurityProviderManager, SecurityProviderResult,
    SecurityProviderType, UnlockParams,
};
pub use types::{EncryptedData, EncryptionKey};
