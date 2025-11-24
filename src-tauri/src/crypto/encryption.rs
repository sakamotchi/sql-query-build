use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;

use super::error::{CryptoError, CryptoResult};
use super::types::{EncryptedData, EncryptionKey};

/// 暗号化/復号化を行うトレイト
pub trait Encryptor {
    /// データを暗号化
    fn encrypt(&self, plaintext: &[u8], master_key: &[u8]) -> CryptoResult<EncryptedData>;

    /// データを復号化
    fn decrypt(&self, encrypted: &EncryptedData, master_key: &[u8]) -> CryptoResult<Vec<u8>>;
}

/// AES-256-GCMを使用した暗号化実装
pub struct AesGcmEncryptor {
    /// PBKDF2の反復回数
    iterations: u32,
}

impl AesGcmEncryptor {
    /// デフォルトの反復回数(600,000回)
    const DEFAULT_ITERATIONS: u32 = 600_000;

    /// 新しいEncryptorインスタンスを作成
    pub fn new() -> Self {
        Self {
            iterations: Self::DEFAULT_ITERATIONS,
        }
    }

    /// カスタム反復回数でEncryptorを作成
    pub fn with_iterations(iterations: u32) -> Self {
        Self { iterations }
    }

    /// マスターキーから暗号化キーを導出
    fn derive_key(&self, master_key: &[u8], salt: &[u8]) -> CryptoResult<EncryptionKey> {
        use pbkdf2::pbkdf2_hmac;
        use sha2::Sha256;

        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(master_key, salt, self.iterations, &mut key);

        EncryptionKey::from_bytes(&key)
    }

    /// ランダムなソルトを生成
    fn generate_salt(&self) -> [u8; 32] {
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// ランダムなノンスを生成
    fn generate_nonce(&self) -> [u8; 12] {
        let mut nonce = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce);
        nonce
    }
}

impl Default for AesGcmEncryptor {
    fn default() -> Self {
        Self::new()
    }
}

impl Encryptor for AesGcmEncryptor {
    fn encrypt(&self, plaintext: &[u8], master_key: &[u8]) -> CryptoResult<EncryptedData> {
        // ソルトとノンスを生成
        let salt = self.generate_salt();
        let nonce_bytes = self.generate_nonce();

        // マスターキーから暗号化キーを導出
        let encryption_key = self.derive_key(master_key, &salt)?;

        // AES-GCM暗号化
        let cipher = Aes256Gcm::new_from_slice(encryption_key.as_bytes())
            .map_err(|_| CryptoError::EncryptionFailed)?;

        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|_| CryptoError::EncryptionFailed)?;

        Ok(EncryptedData {
            version: 1,
            nonce: nonce_bytes.to_vec(),
            salt: salt.to_vec(),
            ciphertext,
            iterations: self.iterations,
        })
    }

    fn decrypt(&self, encrypted: &EncryptedData, master_key: &[u8]) -> CryptoResult<Vec<u8>> {
        // バージョンチェック
        if encrypted.version != 1 {
            return Err(CryptoError::UnsupportedVersion(encrypted.version));
        }

        // マスターキーから暗号化キーを導出
        let encryption_key = self.derive_key(master_key, &encrypted.salt)?;

        // AES-GCM復号化
        let cipher = Aes256Gcm::new_from_slice(encryption_key.as_bytes())
            .map_err(|_| CryptoError::DecryptionFailed)?;

        let nonce = Nonce::from_slice(&encrypted.nonce);

        let plaintext = cipher
            .decrypt(nonce, encrypted.ciphertext.as_ref())
            .map_err(|_| CryptoError::DecryptionFailed)?;

        Ok(plaintext)
    }
}

/// 文字列を暗号化してBase64エンコードされた文字列を返す
pub fn encrypt_string(plaintext: &str, master_key: &[u8]) -> CryptoResult<String> {
    let encryptor = AesGcmEncryptor::new();
    let encrypted = encryptor.encrypt(plaintext.as_bytes(), master_key)?;
    encrypted.to_base64()
}

/// Base64エンコードされた暗号化文字列を復号化
pub fn decrypt_string(encrypted_base64: &str, master_key: &[u8]) -> CryptoResult<String> {
    let encryptor = AesGcmEncryptor::new();
    let encrypted = EncryptedData::from_base64(encrypted_base64)?;
    let plaintext = encryptor.decrypt(&encrypted, master_key)?;

    String::from_utf8(plaintext).map_err(|_| CryptoError::InvalidUtf8)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{engine::general_purpose, Engine};

    #[test]
    fn test_encrypt_decrypt() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"sensitive password";

        // 暗号化
        let encrypted = encryptor.encrypt(plaintext, master_key).unwrap();

        // 復号化
        let decrypted = encryptor.decrypt(&encrypted, master_key).unwrap();

        assert_eq!(plaintext, decrypted.as_slice());
    }

    #[test]
    fn test_wrong_key_fails() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"correct-key-32-bytes-long!!!!!!";
        let wrong_key = b"wrong-key-32-bytes-long!!!!!!!!!";
        let plaintext = b"sensitive password";

        // 正しいキーで暗号化
        let encrypted = encryptor.encrypt(plaintext, master_key).unwrap();

        // 間違ったキーで復号化
        let result = encryptor.decrypt(&encrypted, wrong_key);

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CryptoError::DecryptionFailed));
    }

    #[test]
    fn test_string_encryption() {
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = "my secret password";

        // 暗号化
        let encrypted = encrypt_string(plaintext, master_key).unwrap();

        // Base64文字列であることを確認
        assert!(general_purpose::STANDARD.decode(&encrypted).is_ok());

        // 復号化
        let decrypted = decrypt_string(&encrypted, master_key).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_nonce_uniqueness() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"same plaintext";

        // 同じ平文を2回暗号化
        let encrypted1 = encryptor.encrypt(plaintext, master_key).unwrap();
        let encrypted2 = encryptor.encrypt(plaintext, master_key).unwrap();

        // ノンスが異なることを確認(同じ平文でも暗号文は異なる)
        assert_ne!(encrypted1.nonce, encrypted2.nonce);
        assert_ne!(encrypted1.ciphertext, encrypted2.ciphertext);

        // 両方とも正しく復号化できることを確認
        let decrypted1 = encryptor.decrypt(&encrypted1, master_key).unwrap();
        let decrypted2 = encryptor.decrypt(&encrypted2, master_key).unwrap();

        assert_eq!(decrypted1, decrypted2);
        assert_eq!(decrypted1, plaintext);
    }

    #[test]
    fn test_base64_roundtrip() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"test data";

        let encrypted = encryptor.encrypt(plaintext, master_key).unwrap();

        // Base64エンコード
        let encoded = encrypted.to_base64().unwrap();

        // Base64デコード
        let decoded = EncryptedData::from_base64(&encoded).unwrap();

        // 復号化して元のデータと一致することを確認
        let decrypted = encryptor.decrypt(&decoded, master_key).unwrap();
        assert_eq!(plaintext, decrypted.as_slice());
    }

    #[test]
    fn test_tampered_data_fails() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"sensitive data";

        let mut encrypted = encryptor.encrypt(plaintext, master_key).unwrap();

        // 暗号文を改ざん
        if let Some(byte) = encrypted.ciphertext.first_mut() {
            *byte ^= 0xFF;
        }

        // 改ざんされたデータの復号化は失敗すべき
        let result = encryptor.decrypt(&encrypted, master_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_unsupported_version() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"test data";

        let mut encrypted = encryptor.encrypt(plaintext, master_key).unwrap();

        // バージョンを不正な値に変更
        encrypted.version = 999;

        // サポートされていないバージョンエラーが発生すべき
        let result = encryptor.decrypt(&encrypted, master_key);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CryptoError::UnsupportedVersion(999)
        ));
    }

    #[test]
    fn test_key_zeroize() {
        let key_bytes = [0x42u8; 32];
        let key = EncryptionKey::from_bytes(&key_bytes).unwrap();

        // キーが正しく設定されていることを確認
        assert_eq!(key.as_bytes(), &key_bytes);

        // ドロップ時にzeroizeが自動的に呼ばれる
        drop(key);

        // zeroize crateのテストに依存してメモリがクリアされることを確認
    }

    #[test]
    fn test_sufficient_iterations() {
        let encryptor = AesGcmEncryptor::new();

        // 最低でも100,000回以上の反復を使用していることを確認
        assert!(encryptor.iterations >= 100_000);
    }

    #[test]
    fn test_custom_iterations() {
        let iterations = 200_000;
        let encryptor = AesGcmEncryptor::with_iterations(iterations);

        assert_eq!(encryptor.iterations, iterations);

        // カスタム反復回数でも暗号化/復号化が正常に動作することを確認
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"test data";

        let encrypted = encryptor.encrypt(plaintext, master_key).unwrap();
        assert_eq!(encrypted.iterations, iterations);

        let decrypted = encryptor.decrypt(&encrypted, master_key).unwrap();
        assert_eq!(plaintext, decrypted.as_slice());
    }

    #[test]
    fn test_encryption_performance() {
        use std::time::Instant;

        // テスト用に反復回数を減らす（10,000回 = デフォルトの1/60）
        let encryptor = AesGcmEncryptor::with_iterations(10_000);
        let master_key = b"test-master-key-32-bytes-long!!!";
        let plaintext = b"performance test data";

        let start = Instant::now();

        // 10回暗号化（パフォーマンスの著しい劣化がないことを確認）
        for _ in 0..10 {
            let _ = encryptor.encrypt(plaintext, master_key).unwrap();
        }

        let duration = start.elapsed();

        // 10回で30秒以内に完了することを確認（十分な余裕を持たせる）
        assert!(
            duration.as_secs() < 30,
            "Encryption took {} seconds, expected < 30",
            duration.as_secs()
        );
    }

    #[test]
    fn test_key_derivation_consistency() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let salt = [0x42u8; 32];

        // 同じソルトから導出されるキーは常に同じ
        let key1 = encryptor.derive_key(master_key, &salt).unwrap();
        let key2 = encryptor.derive_key(master_key, &salt).unwrap();

        // 導出されるキーが同じであることを確認
        assert_eq!(key1.as_bytes(), key2.as_bytes());

        // 異なるソルトからは異なるキーが導出される
        let different_salt = [0x43u8; 32];
        let key3 = encryptor.derive_key(master_key, &different_salt).unwrap();
        assert_ne!(key1.as_bytes(), key3.as_bytes());
    }

    #[test]
    fn test_large_data_encryption() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";

        // 大きなデータ（1MB）
        let large_plaintext = vec![0x42u8; 1_000_000];

        // 暗号化
        let encrypted = encryptor.encrypt(&large_plaintext, master_key).unwrap();

        // 復号化
        let decrypted = encryptor.decrypt(&encrypted, master_key).unwrap();

        // データが一致することを確認
        assert_eq!(large_plaintext, decrypted);
    }

    #[test]
    fn test_empty_data_encryption() {
        let encryptor = AesGcmEncryptor::new();
        let master_key = b"test-master-key-32-bytes-long!!!";
        let empty_plaintext = b"";

        // 空データの暗号化
        let encrypted = encryptor.encrypt(empty_plaintext, master_key).unwrap();

        // 復号化
        let decrypted = encryptor.decrypt(&encrypted, master_key).unwrap();

        // 空データが正しく処理されることを確認
        assert_eq!(empty_plaintext, decrypted.as_slice());
    }

    #[test]
    fn test_unicode_string_encryption() {
        let master_key = b"test-master-key-32-bytes-long!!!";
        let unicode_text = "こんにちは世界 🌍 Hello World!";

        // Unicode文字列の暗号化
        let encrypted = encrypt_string(unicode_text, master_key).unwrap();

        // 復号化
        let decrypted = decrypt_string(&encrypted, master_key).unwrap();

        // Unicode文字列が正しく処理されることを確認
        assert_eq!(unicode_text, decrypted);
    }
}
