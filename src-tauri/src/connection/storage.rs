use crate::connection::{ConnectionCollection, ConnectionError, ConnectionInfo};
use crate::storage::FileStorage;
use std::sync::{Arc, RwLock};

/// 接続情報のストレージ管理
pub struct ConnectionStorage {
    file_storage: Arc<FileStorage>,
    cache: Arc<RwLock<Option<ConnectionCollection>>>,
    storage_key: String,
}

impl ConnectionStorage {
    /// 新しいConnectionStorageインスタンスを作成
    pub fn new(file_storage: Arc<FileStorage>) -> Self {
        Self {
            file_storage,
            cache: Arc::new(RwLock::new(None)),
            storage_key: "connections".to_string(),
        }
    }

    /// すべての接続情報を取得
    pub fn get_all(&self) -> Result<Vec<ConnectionInfo>, ConnectionError> {
        let collection = self.load_collection()?;
        Ok(collection.connections.clone())
    }

    /// IDで接続情報を取得
    pub fn get_by_id(&self, id: &str) -> Result<Option<ConnectionInfo>, ConnectionError> {
        let collection = self.load_collection()?;
        Ok(collection.get(id).cloned())
    }

    /// 接続情報を作成
    pub fn create(&self, connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        let mut collection = self.load_collection()?;

        // バリデーション
        connection.validate()?;

        // 追加
        collection.add(connection.clone())?;

        // 保存
        self.save_collection(&collection)?;

        Ok(connection)
    }

    /// 接続情報を更新
    pub fn update(&self, connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        let mut collection = self.load_collection()?;

        // バリデーション
        connection.validate()?;

        // 更新
        collection.update(&connection.id, connection.clone())?;

        // 保存
        self.save_collection(&collection)?;

        Ok(connection)
    }

    /// 接続情報を削除
    pub fn delete(&self, id: &str) -> Result<(), ConnectionError> {
        let mut collection = self.load_collection()?;

        // 削除
        collection.remove(id)?;

        // 保存
        self.save_collection(&collection)?;

        Ok(())
    }

    /// 最終使用日時を更新
    pub fn update_last_used(&self, id: &str) -> Result<(), ConnectionError> {
        let mut collection = self.load_collection()?;

        // 接続情報を取得して更新
        if let Some(conn) = collection.get_mut(id) {
            conn.metadata.record_connection();

            // 保存
            self.save_collection(&collection)?;

            Ok(())
        } else {
            Err(ConnectionError::NotFound)
        }
    }

    /// コレクションをロード（キャッシュを使用）
    fn load_collection(&self) -> Result<ConnectionCollection, ConnectionError> {
        // キャッシュをチェック
        {
            let cache = self.cache.read().map_err(|_| {
                ConnectionError::StorageError("Failed to acquire read lock".to_string())
            })?;

            if let Some(collection) = cache.as_ref() {
                return Ok(collection.clone());
            }
        }

        // キャッシュにない場合はファイルから読み込み
        let collection = match self
            .file_storage
            .read::<ConnectionCollection>(&self.storage_key)
        {
            Ok(collection) => collection,
            Err(crate::storage::StorageError::NotFound(_)) => {
                // ファイルが存在しない場合は新規作成
                ConnectionCollection::new()
            }
            Err(e) => {
                return Err(ConnectionError::StorageError(e.to_string()));
            }
        };

        // キャッシュに保存
        {
            let mut cache = self.cache.write().map_err(|_| {
                ConnectionError::StorageError("Failed to acquire write lock".to_string())
            })?;
            *cache = Some(collection.clone());
        }

        Ok(collection)
    }

    /// コレクションを保存
    fn save_collection(&self, collection: &ConnectionCollection) -> Result<(), ConnectionError> {
        // ファイルに保存
        self.file_storage
            .write(&self.storage_key, collection)
            .map_err(|e| ConnectionError::StorageError(e.to_string()))?;

        // キャッシュを更新
        let mut cache = self.cache.write().map_err(|_| {
            ConnectionError::StorageError("Failed to acquire write lock".to_string())
        })?;
        *cache = Some(collection.clone());

        Ok(())
    }

    /// キャッシュをクリア
    pub fn clear_cache(&self) -> Result<(), ConnectionError> {
        let mut cache = self.cache.write().map_err(|_| {
            ConnectionError::StorageError("Failed to acquire write lock".to_string())
        })?;
        *cache = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::{ConnectionConfig, DatabaseType, NetworkConfig};
    use tempfile::TempDir;

    fn create_test_storage() -> (ConnectionStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let file_storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
        let storage = ConnectionStorage::new(file_storage);
        (storage, temp_dir)
    }

    fn create_test_connection(name: &str) -> ConnectionInfo {
        let config = ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: "testuser".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        });

        ConnectionInfo::new(name.to_string(), DatabaseType::PostgreSQL, config)
    }

    #[test]
    fn test_create_connection() {
        let (storage, _temp) = create_test_storage();

        let connection = create_test_connection("Test DB");
        let result = storage.create(connection.clone()).unwrap();

        assert_eq!(result.id, connection.id);
        assert_eq!(result.name, "Test DB");
    }

    #[test]
    fn test_get_all_connections() {
        let (storage, _temp) = create_test_storage();

        // 初期状態では空
        let connections = storage.get_all().unwrap();
        assert_eq!(connections.len(), 0);

        // 接続を追加
        let conn1 = create_test_connection("DB1");
        let conn2 = create_test_connection("DB2");
        storage.create(conn1).unwrap();
        storage.create(conn2).unwrap();

        // 2件取得できることを確認
        let connections = storage.get_all().unwrap();
        assert_eq!(connections.len(), 2);
    }

    #[test]
    fn test_get_by_id() {
        let (storage, _temp) = create_test_storage();

        let connection = create_test_connection("Test DB");
        let created = storage.create(connection).unwrap();

        // IDで取得
        let found = storage.get_by_id(&created.id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Test DB");

        // 存在しないID
        let not_found = storage.get_by_id("nonexistent").unwrap();
        assert!(not_found.is_none());
    }

    #[test]
    fn test_update_connection() {
        let (storage, _temp) = create_test_storage();

        let mut connection = create_test_connection("Test DB");
        let created = storage.create(connection.clone()).unwrap();

        // 名前を変更
        connection.id = created.id.clone();
        connection.name = "Updated DB".to_string();

        let updated = storage.update(connection).unwrap();
        assert_eq!(updated.name, "Updated DB");

        // 取得して確認
        let found = storage.get_by_id(&created.id).unwrap().unwrap();
        assert_eq!(found.name, "Updated DB");
    }

    #[test]
    fn test_delete_connection() {
        let (storage, _temp) = create_test_storage();

        let connection = create_test_connection("Test DB");
        let created = storage.create(connection).unwrap();

        // 削除
        storage.delete(&created.id).unwrap();

        // 取得できないことを確認
        let found = storage.get_by_id(&created.id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_update_last_used() {
        let (storage, _temp) = create_test_storage();

        let connection = create_test_connection("Test DB");
        let created = storage.create(connection).unwrap();

        // 最初はNone
        let found = storage.get_by_id(&created.id).unwrap().unwrap();
        assert!(found.metadata.last_connected_at.is_none());
        assert_eq!(found.metadata.connection_count, 0);

        // 最終使用日時を更新
        storage.update_last_used(&created.id).unwrap();

        // 更新されていることを確認
        let found = storage.get_by_id(&created.id).unwrap().unwrap();
        assert!(found.metadata.last_connected_at.is_some());
        assert_eq!(found.metadata.connection_count, 1);
    }

    #[test]
    fn test_cache_functionality() {
        let (storage, _temp) = create_test_storage();

        let connection = create_test_connection("Test DB");
        storage.create(connection).unwrap();

        // 最初の読み込み（ファイルから）
        let connections1 = storage.get_all().unwrap();

        // 2回目の読み込み（キャッシュから）
        let connections2 = storage.get_all().unwrap();

        assert_eq!(connections1.len(), connections2.len());

        // キャッシュをクリア
        storage.clear_cache().unwrap();

        // 3回目の読み込み（ファイルから）
        let connections3 = storage.get_all().unwrap();
        assert_eq!(connections1.len(), connections3.len());
    }
}
