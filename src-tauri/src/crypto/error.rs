use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("暗号化に失敗しました")]
    EncryptionFailed,

    #[error("復号化に失敗しました(キーが間違っているか、データが破損しています)")]
    DecryptionFailed,

    #[error("サポートされていないバージョンです: {0}")]
    UnsupportedVersion(u32),

    #[error("キーの長さが不正です")]
    InvalidKeyLength,

    #[error("Base64デコードエラー: {0}")]
    Base64Error(#[from] base64::DecodeError),

    #[error("JSON変換エラー: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("UTF-8変換エラー")]
    InvalidUtf8,

    #[error("キー導出エラー")]
    KeyDerivationError,
}

pub type CryptoResult<T> = Result<T, CryptoError>;
