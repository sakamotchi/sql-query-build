use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use super::error::{CryptoError, CryptoResult};

/// 暗号化されたデータを表す構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedData {
    /// 暗号化アルゴリズムのバージョン(将来の変更に対応)
    pub version: u32,

    /// AES-GCMのノンス(12バイト)
    pub nonce: Vec<u8>,

    /// PBKDF2のソルト(32バイト)
    pub salt: Vec<u8>,

    /// 暗号化されたデータ(暗号文 + 認証タグ)
    pub ciphertext: Vec<u8>,

    /// PBKDF2の反復回数
    pub iterations: u32,
}

impl EncryptedData {
    /// Base64エンコードされた文字列に変換
    pub fn to_base64(&self) -> CryptoResult<String> {
        let json = serde_json::to_string(self)?;
        Ok(general_purpose::STANDARD.encode(json.as_bytes()))
    }

    /// Base64エンコードされた文字列から復元
    pub fn from_base64(encoded: &str) -> CryptoResult<Self> {
        let decoded = general_purpose::STANDARD.decode(encoded)?;
        let data = serde_json::from_slice(&decoded)?;
        Ok(data)
    }
}

/// 暗号化キーを安全に保持する構造体
#[derive(Zeroize)]
#[zeroize(drop)]
pub struct EncryptionKey {
    key: [u8; 32], // AES-256用の32バイトキー
}

impl EncryptionKey {
    /// 新しいキーを作成(ランダム生成)
    pub fn generate() -> CryptoResult<Self> {
        use rand::RngCore;
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        Ok(Self { key })
    }

    /// バイト配列からキーを作成
    pub fn from_bytes(bytes: &[u8]) -> CryptoResult<Self> {
        if bytes.len() != 32 {
            return Err(CryptoError::InvalidKeyLength);
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(bytes);
        Ok(Self { key })
    }

    /// キーのバイト表現を取得
    pub fn as_bytes(&self) -> &[u8] {
        &self.key
    }
}
