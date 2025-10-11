use super::error::{MasterKeyError, MasterKeyResult};
use zeroize::Zeroize;

/// キーチェーンに保存するエントリの識別情報
#[derive(Debug, Clone)]
pub struct KeychainEntry {
    /// サービス名（アプリケーション識別子）
    pub service: String,

    /// ユーザー名（キーの種類を識別）
    pub username: String,
}

impl KeychainEntry {
    /// マスターキー用のエントリを作成
    pub fn master_key() -> Self {
        Self {
            service: "sql-query-builder".to_string(),
            username: "master-encryption-key".to_string(),
        }
    }
}

/// マスターキーを安全に保持する構造体
#[derive(Zeroize, Clone)]
#[zeroize(drop)]
pub struct MasterKey {
    /// 32バイトのキーデータ
    key: [u8; 32],
}

impl MasterKey {
    /// 新しいランダムなマスターキーを生成
    pub fn generate() -> Self {
        use rand::RngCore;
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        Self { key }
    }

    /// バイト配列からマスターキーを作成
    pub fn from_bytes(bytes: &[u8]) -> MasterKeyResult<Self> {
        if bytes.len() != 32 {
            return Err(MasterKeyError::InvalidKeyLength);
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(bytes);
        Ok(Self { key })
    }

    /// キーのバイト表現を取得
    pub fn as_bytes(&self) -> &[u8] {
        &self.key
    }

    /// Base64エンコードされた文字列として取得
    pub fn to_base64(&self) -> String {
        use base64::{engine::general_purpose, Engine as _};
        general_purpose::STANDARD.encode(&self.key)
    }

    /// Base64文字列からマスターキーを作成
    pub fn from_base64(encoded: &str) -> MasterKeyResult<Self> {
        use base64::{engine::general_purpose, Engine as _};
        let bytes = general_purpose::STANDARD.decode(encoded)?;
        Self::from_bytes(&bytes)
    }
}
