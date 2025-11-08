use super::error::{MasterKeyError, MasterKeyResult};
use super::types::{KeychainEntry, MasterKey};

/// OSのキーチェーンとのインターフェース
pub trait Keychain: Send + Sync {
    /// キーを保存
    fn store_key(&self, entry: &KeychainEntry, key: &MasterKey) -> MasterKeyResult<()>;

    /// キーを取得
    fn retrieve_key(&self, entry: &KeychainEntry) -> MasterKeyResult<MasterKey>;

    /// キーを削除
    fn delete_key(&self, entry: &KeychainEntry) -> MasterKeyResult<()>;

    /// キーが存在するかチェック
    fn exists(&self, entry: &KeychainEntry) -> bool;
}

/// keyring crateを使用したクロスプラットフォーム実装
pub struct OsKeychain;

impl Keychain for OsKeychain {
    fn store_key(&self, entry: &KeychainEntry, key: &MasterKey) -> MasterKeyResult<()> {
        let keyring_entry = keyring::Entry::new(&entry.service, &entry.username)?;

        // Base64エンコードして文字列として保存
        keyring_entry.set_password(&key.to_base64())?;

        Ok(())
    }

    fn retrieve_key(&self, entry: &KeychainEntry) -> MasterKeyResult<MasterKey> {
        let keyring_entry = keyring::Entry::new(&entry.service, &entry.username)?;

        let password = keyring_entry.get_password()?;

        MasterKey::from_base64(&password)
    }

    fn delete_key(&self, entry: &KeychainEntry) -> MasterKeyResult<()> {
        let keyring_entry = keyring::Entry::new(&entry.service, &entry.username)?;

        keyring_entry.delete_credential()?;

        Ok(())
    }

    fn exists(&self, entry: &KeychainEntry) -> bool {
        let keyring_entry = match keyring::Entry::new(&entry.service, &entry.username) {
            Ok(entry) => entry,
            Err(_) => return false,
        };

        keyring_entry.get_password().is_ok()
    }
}

// 統合テストからも使用されるため、常に公開する
pub mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    /// テスト用のインメモリキーチェーン
    pub struct MockKeychain {
        storage: Mutex<HashMap<String, String>>,
    }

    impl MockKeychain {
        pub fn new() -> Self {
            Self {
                storage: Mutex::new(HashMap::new()),
            }
        }

        fn key(&self, entry: &KeychainEntry) -> String {
            format!("{}:{}", entry.service, entry.username)
        }
    }

    impl Keychain for MockKeychain {
        fn store_key(&self, entry: &KeychainEntry, key: &MasterKey) -> MasterKeyResult<()> {
            let mut storage = self.storage.lock().unwrap();
            storage.insert(self.key(entry), key.to_base64());
            Ok(())
        }

        fn retrieve_key(&self, entry: &KeychainEntry) -> MasterKeyResult<MasterKey> {
            let storage = self.storage.lock().unwrap();
            let encoded = storage
                .get(&self.key(entry))
                .ok_or(MasterKeyError::NotInitialized)?;
            MasterKey::from_base64(encoded)
        }

        fn delete_key(&self, entry: &KeychainEntry) -> MasterKeyResult<()> {
            let mut storage = self.storage.lock().unwrap();
            storage.remove(&self.key(entry));
            Ok(())
        }

        fn exists(&self, entry: &KeychainEntry) -> bool {
            let storage = self.storage.lock().unwrap();
            storage.contains_key(&self.key(entry))
        }
    }
}
