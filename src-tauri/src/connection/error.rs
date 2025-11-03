use thiserror::Error;

/// 接続情報に関するエラー
#[derive(Error, Debug)]
pub enum ConnectionError {
    #[error("接続名が無効です: {0}")]
    InvalidName(String),

    #[error("ホスト名が無効です")]
    InvalidHost,

    #[error("ポート番号が無効です")]
    InvalidPort,

    #[error("データベース名が無効です")]
    InvalidDatabase,

    #[error("ユーザー名が無効です")]
    InvalidUsername,

    #[error("ファイルパスが無効です")]
    InvalidFilePath,

    #[error("接続設定が無効です: {0}")]
    InvalidConfig(String),

    #[error("同じ名前の接続が既に存在します")]
    DuplicateName,

    #[error("接続情報が見つかりません")]
    NotFound,

    #[error("ストレージエラー: {0}")]
    StorageError(String),

    #[error("暗号化エラー: {0}")]
    EncryptionError(String),
}
