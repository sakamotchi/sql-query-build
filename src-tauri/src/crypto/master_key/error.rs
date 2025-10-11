use thiserror::Error;

#[derive(Error, Debug)]
pub enum MasterKeyError {
    #[error("マスターキーが既に初期化されています")]
    AlreadyInitialized,

    #[error("マスターキーが見つかりません（初期化が必要です）")]
    NotInitialized,

    #[error("キーの長さが不正です")]
    InvalidKeyLength,

    #[error("キーチェーンエラー: {0}")]
    KeychainError(#[from] keyring::Error),

    #[error("Base64デコードエラー: {0}")]
    Base64Error(#[from] base64::DecodeError),

    #[error("キーチェーンへのアクセスが拒否されました")]
    AccessDenied,
}

pub type MasterKeyResult<T> = Result<T, MasterKeyError>;
