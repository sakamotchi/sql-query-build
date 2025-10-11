pub mod error;
pub mod keychain;
pub mod manager;
pub mod types;

// 公開API
pub use error::{MasterKeyError, MasterKeyResult};
pub use manager::MasterKeyManager;
pub use types::{KeychainEntry, MasterKey};
