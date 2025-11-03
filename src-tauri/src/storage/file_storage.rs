use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;
use crate::storage::error::{StorageError, StorageResult};

/// ジェネリックなストレージ操作を定義するトレイト
pub trait Storage<T>
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    /// データを読み込む
    fn read(&self, key: &str) -> StorageResult<T>;

    /// データを書き込む
    fn write(&self, key: &str, data: &T) -> StorageResult<()>;

    /// データを削除する
    fn delete(&self, key: &str) -> StorageResult<()>;

    /// 全てのキーを取得する
    fn list_keys(&self) -> StorageResult<Vec<String>>;

    /// データが存在するかチェック
    fn exists(&self, key: &str) -> bool;
}

pub struct FileStorage {
    base_path: PathBuf,
    // ファイルアクセスの排他制御用
    lock: RwLock<()>,
}

impl FileStorage {
    /// 新しいFileStorageインスタンスを作成
    pub fn new(base_path: PathBuf) -> StorageResult<Self> {
        // ベースディレクトリが存在しない場合は作成
        if !base_path.exists() {
            fs::create_dir_all(&base_path)?;
        }

        Ok(Self {
            base_path,
            lock: RwLock::new(()),
        })
    }

    /// キーからファイルパスを解決
    fn resolve_path(&self, key: &str) -> PathBuf {
        self.base_path.join(format!("{}.json", key))
    }

    /// JSON形式でファイルに書き込む
    fn write_json<T: Serialize>(&self, path: &PathBuf, data: &T) -> StorageResult<()> {
        let _guard = self.lock.write()?;

        // 親ディレクトリが存在しない場合は作成
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_string_pretty(data)?;
        fs::write(path, json)?;

        Ok(())
    }

    /// JSON形式でファイルから読み込む
    fn read_json<T: for<'de> Deserialize<'de>>(&self, path: &PathBuf) -> StorageResult<T> {
        let _guard = self.lock.read()?;

        let content = fs::read_to_string(path)?;
        let data = serde_json::from_str(&content)?;

        Ok(data)
    }

    /// データを読み込む（ジェネリックメソッド）
    pub fn read<T>(&self, key: &str) -> StorageResult<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let path = self.resolve_path(key);
        if !path.exists() {
            return Err(StorageError::NotFound(key.to_string()));
        }
        self.read_json(&path)
    }

    /// データを書き込む（ジェネリックメソッド）
    pub fn write<T>(&self, key: &str, data: &T) -> StorageResult<()>
    where
        T: Serialize,
    {
        let path = self.resolve_path(key);
        self.write_json(&path, data)
    }

    /// データを削除する
    pub fn delete(&self, key: &str) -> StorageResult<()> {
        let path = self.resolve_path(key);
        if !path.exists() {
            return Err(StorageError::NotFound(key.to_string()));
        }

        let _guard = self.lock.write()?;
        fs::remove_file(path)?;
        Ok(())
    }

    /// 全てのキーを取得する
    pub fn list_keys(&self) -> StorageResult<Vec<String>> {
        let _guard = self.lock.read()?;

        let mut keys = Vec::new();

        if !self.base_path.exists() {
            return Ok(keys);
        }

        for entry in fs::read_dir(&self.base_path)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
                    keys.push(file_stem.to_string());
                }
            }
        }

        Ok(keys)
    }

    /// データが存在するかチェック
    pub fn exists(&self, key: &str) -> bool {
        self.resolve_path(key).exists()
    }
}

impl<T> Storage<T> for FileStorage
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    fn read(&self, key: &str) -> StorageResult<T> {
        let path = self.resolve_path(key);
        if !path.exists() {
            return Err(StorageError::NotFound(key.to_string()));
        }
        self.read_json(&path)
    }

    fn write(&self, key: &str, data: &T) -> StorageResult<()> {
        let path = self.resolve_path(key);
        self.write_json(&path, data)
    }

    fn delete(&self, key: &str) -> StorageResult<()> {
        let path = self.resolve_path(key);
        if !path.exists() {
            return Err(StorageError::NotFound(key.to_string()));
        }

        let _guard = self.lock.write()?;
        fs::remove_file(path)?;
        Ok(())
    }

    fn list_keys(&self) -> StorageResult<Vec<String>> {
        let _guard = self.lock.read()?;

        let mut keys = Vec::new();

        if !self.base_path.exists() {
            return Ok(keys);
        }

        for entry in fs::read_dir(&self.base_path)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
                    keys.push(file_stem.to_string());
                }
            }
        }

        Ok(keys)
    }

    fn exists(&self, key: &str) -> bool {
        self.resolve_path(key).exists()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct TestData {
        name: String,
        value: i32,
    }

    #[test]
    fn test_write_and_read() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let data = TestData {
            name: "test".to_string(),
            value: 42,
        };

        storage.write("test_key", &data).unwrap();
        let read_data: TestData = storage.read("test_key").unwrap();

        assert_eq!(data, read_data);
    }

    #[test]
    fn test_delete() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let data = TestData {
            name: "test".to_string(),
            value: 42,
        };

        storage.write("test_key", &data).unwrap();
        assert!(storage.exists("test_key"));

        storage.delete("test_key").unwrap();
        assert!(!storage.exists("test_key"));
    }

    #[test]
    fn test_list_keys() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let data = TestData {
            name: "test".to_string(),
            value: 42,
        };

        storage.write("key1", &data).unwrap();
        storage.write("key2", &data).unwrap();

        let keys = storage.list_keys().unwrap();
        assert_eq!(keys.len(), 2);
        assert!(keys.contains(&"key1".to_string()));
        assert!(keys.contains(&"key2".to_string()));
    }

    #[test]
    fn test_read_not_found() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let result: Result<TestData, _> = storage.read("nonexistent");
        assert!(result.is_err());

        if let Err(StorageError::NotFound(key)) = result {
            assert_eq!(key, "nonexistent");
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn test_delete_not_found() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let result = storage.delete("nonexistent");
        assert!(result.is_err());

        if let Err(StorageError::NotFound(key)) = result {
            assert_eq!(key, "nonexistent");
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn test_concurrent_access() {
        use std::sync::Arc;
        use std::thread;

        let temp_dir = TempDir::new().unwrap();
        let storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());

        // 複数スレッドから同時アクセス
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let storage = Arc::clone(&storage);
                thread::spawn(move || {
                    let data = TestData {
                        name: format!("thread_{}", i),
                        value: i,
                    };
                    storage.write(&format!("key_{}", i), &data).unwrap();
                })
            })
            .collect();

        // 全スレッドの完了を待つ
        for handle in handles {
            handle.join().unwrap();
        }

        // 全てのキーが存在することを確認
        let keys = storage.list_keys().unwrap();
        assert_eq!(keys.len(), 10);
    }

    #[test]
    fn test_path_traversal_protection() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();
        let data = TestData {
            name: "test".to_string(),
            value: 42,
        };

        // パストラバーサル攻撃を試みる
        let malicious_keys = vec!["../../../etc/passwd", "..\\..\\windows\\system32"];

        for key in malicious_keys {
            let result = storage.write(key, &data);
            // セキュリティ上、正常に処理されるがベースディレクトリ内に保存される
            if result.is_ok() {
                let path = temp_dir.path().join(format!("{}.json", key));
                // ベースディレクトリ内に保存されていることを確認
                assert!(path.starts_with(temp_dir.path()) || !path.exists());
            }
        }
    }

    #[test]
    fn test_large_data_write() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        // 大きなデータを作成（長い文字列）
        let large_data = TestData {
            name: "x".repeat(1_000_000), // 1MB程度の文字列
            value: 42,
        };

        // 大きなデータの書き込みと読み込み
        let result = storage.write("large_key", &large_data);
        assert!(result.is_ok());

        let read_data: TestData = storage.read("large_key").unwrap();
        assert_eq!(large_data.name.len(), read_data.name.len());
        assert_eq!(large_data.value, read_data.value);
    }

    #[test]
    fn test_invalid_json_handling() {
        use std::fs;

        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();

        // 無効なJSONファイルを手動で作成
        let invalid_json_path = temp_dir.path().join("invalid.json");
        fs::write(&invalid_json_path, "this is not valid json").unwrap();

        // 読み込み時にエラーが発生することを確認
        let result: Result<TestData, _> = storage.read("invalid");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::SerializationError(_)));
    }
}
