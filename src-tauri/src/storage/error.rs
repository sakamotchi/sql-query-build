use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("ファイル操作エラー: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON変換エラー: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("ロック取得エラー")]
    LockError,

    #[error("データが見つかりません: {0}")]
    NotFound(String),

    #[error("データが既に存在します: {0}")]
    AlreadyExists(String),

    #[error("パスマネージャーの初期化に失敗しました")]
    PathManagerInitError,
}

pub type StorageResult<T> = Result<T, StorageError>;

// RwLock poisonエラーの変換
impl<T> From<std::sync::PoisonError<T>> for StorageError {
    fn from(_: std::sync::PoisonError<T>) -> Self {
        StorageError::LockError
    }
}
