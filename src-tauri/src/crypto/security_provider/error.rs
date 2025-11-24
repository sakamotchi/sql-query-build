use thiserror::Error;

/// セキュリティプロバイダーのエラー型
#[derive(Debug, Error)]
pub enum SecurityProviderError {
    /// 未初期化エラー
    #[error("Provider is not initialized")]
    NotInitialized,

    /// ロック中エラー
    #[error("Provider is locked")]
    Locked,

    /// 既に初期化済み
    #[error("Provider is already initialized")]
    AlreadyInitialized,

    /// パスワード不一致
    #[error("Passwords do not match")]
    PasswordMismatch,

    /// パスワードが弱い
    #[error("Password is too weak: {0}")]
    WeakPassword(String),

    /// 認証失敗
    #[error("Authentication failed")]
    AuthenticationFailed,

    /// キーチェーンエラー
    #[error("Keychain error: {0}")]
    KeychainError(String),

    /// 暗号化エラー
    #[error("Encryption error: {0}")]
    EncryptionError(String),

    /// ストレージエラー
    #[error("Storage error: {0}")]
    StorageError(String),

    /// 無効なパラメータ
    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    /// 内部エラー
    #[error("Internal error: {0}")]
    Internal(String),
}

pub type SecurityProviderResult<T> = Result<T, SecurityProviderError>;
