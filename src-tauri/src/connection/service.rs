use std::sync::Arc;
use crate::connection::{ConnectionInfo, ConnectionError, ConnectionConfig};
use crate::connection::storage::ConnectionStorage;
use crate::crypto::{AesGcmEncryptor, Encryptor, MasterKeyManager};

/// 接続情報のビジネスロジックを管理するサービス
pub struct ConnectionService {
    storage: Arc<ConnectionStorage>,
    master_key_manager: Arc<MasterKeyManager>,
}

impl ConnectionService {
    /// 新しいConnectionServiceインスタンスを作成
    pub fn new(storage: Arc<ConnectionStorage>, master_key_manager: Arc<MasterKeyManager>) -> Self {
        Self {
            storage,
            master_key_manager,
        }
    }

    /// すべての接続情報を取得（パスワードは暗号化されたまま）
    pub fn get_all(&self) -> Result<Vec<ConnectionInfo>, ConnectionError> {
        let connections = self.storage.get_all()?;
        Ok(connections)
    }

    /// IDで接続情報を取得
    /// include_password_decrypted: trueの場合、パスワードを復号化して返す
    pub async fn get_by_id(
        &self,
        id: &str,
        include_password_decrypted: bool,
    ) -> Result<Option<ConnectionInfo>, ConnectionError> {
        let connection = self.storage.get_by_id(id)?;

        if let Some(mut conn) = connection {
            if include_password_decrypted {
                // パスワードを復号化
                conn = self.decrypt_password(conn).await?;
            }
            Ok(Some(conn))
        } else {
            Ok(None)
        }
    }

    /// 接続情報を作成
    pub async fn create(&self, connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        // バリデーション
        connection.validate()?;

        // パスワードを暗号化
        let encrypted_connection = self.encrypt_password(connection).await?;

        // ストレージに保存
        self.storage.create(encrypted_connection)
    }

    /// 接続情報を更新
    pub async fn update(&self, connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        // バリデーション
        connection.validate()?;

        // パスワードを暗号化
        let encrypted_connection = self.encrypt_password(connection).await?;

        // ストレージに保存
        self.storage.update(encrypted_connection)
    }

    /// 接続情報を削除
    pub fn delete(&self, id: &str) -> Result<(), ConnectionError> {
        self.storage.delete(id)
    }

    /// 最終使用日時を更新
    pub fn mark_as_used(&self, id: &str) -> Result<(), ConnectionError> {
        self.storage.update_last_used(id)
    }

    /// パスワードを暗号化
    async fn encrypt_password(&self, mut connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        // ネットワーク接続の場合のみパスワードを暗号化
        if let ConnectionConfig::Network(ref mut network_config) = connection.connection {
            if let Some(ref password) = network_config.encrypted_password {
                // マスターキーが初期化されているか確認
                if !self.master_key_manager.is_initialized() {
                    self.master_key_manager
                        .initialize()
                        .await
                        .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;
                }

                // マスターキーを取得
                let master_key = self.master_key_manager
                    .get_master_key()
                    .await
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                // 暗号化サービスを作成
                let encryptor = AesGcmEncryptor::new();

                // パスワードを暗号化
                let encrypted = encryptor
                    .encrypt(password.as_bytes(), &master_key)
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                // Base64エンコードして保存
                let encrypted_base64 = encrypted
                    .to_base64()
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                network_config.encrypted_password = Some(encrypted_base64);
            }
        }

        Ok(connection)
    }

    /// パスワードを復号化
    async fn decrypt_password(&self, mut connection: ConnectionInfo) -> Result<ConnectionInfo, ConnectionError> {
        // ネットワーク接続の場合のみパスワードを復号化
        if let ConnectionConfig::Network(ref mut network_config) = connection.connection {
            if let Some(ref encrypted_password) = network_config.encrypted_password {
                // マスターキーが初期化されているか確認
                if !self.master_key_manager.is_initialized() {
                    return Err(ConnectionError::EncryptionError(
                        "Master key is not initialized".to_string()
                    ));
                }

                // マスターキーを取得
                let master_key = self.master_key_manager
                    .get_master_key()
                    .await
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                // 暗号化サービスを作成
                let encryptor = AesGcmEncryptor::new();

                // Base64デコードしてEncryptedDataにデシリアライズ
                let encrypted_data = crate::crypto::types::EncryptedData::from_base64(encrypted_password)
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                // 復号化
                let decrypted = encryptor
                    .decrypt(&encrypted_data, &master_key)
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                // 文字列に変換
                let password = String::from_utf8(decrypted)
                    .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

                network_config.encrypted_password = Some(password);
            }
        }

        Ok(connection)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use crate::storage::FileStorage;
    use crate::connection::{DatabaseType, ConnectionConfig, NetworkConfig};

    fn create_test_service() -> (ConnectionService, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let file_storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
        let storage = Arc::new(ConnectionStorage::new(file_storage));
        let master_key_manager = Arc::new(MasterKeyManager::new());
        let service = ConnectionService::new(storage, master_key_manager);
        (service, temp_dir)
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

        ConnectionInfo::new(
            name.to_string(),
            DatabaseType::PostgreSQL,
            config,
        )
    }

    #[tokio::test]
    async fn test_create_connection() {
        let (service, _temp) = create_test_service();

        let connection = create_test_connection("Test DB");
        let result = service.create(connection.clone()).await.unwrap();

        assert_eq!(result.id, connection.id);
        assert_eq!(result.name, "Test DB");
    }

    #[tokio::test]
    async fn test_get_all_connections() {
        let (service, _temp) = create_test_service();

        // 初期状態では空
        let connections = service.get_all().unwrap();
        assert_eq!(connections.len(), 0);

        // 接続を追加
        let conn1 = create_test_connection("DB1");
        let conn2 = create_test_connection("DB2");
        service.create(conn1).await.unwrap();
        service.create(conn2).await.unwrap();

        // 2件取得できることを確認
        let connections = service.get_all().unwrap();
        assert_eq!(connections.len(), 2);
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let (service, _temp) = create_test_service();

        let connection = create_test_connection("Test DB");
        let created = service.create(connection).await.unwrap();

        // IDで取得
        let found = service.get_by_id(&created.id, false).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Test DB");

        // 存在しないID
        let not_found = service.get_by_id("nonexistent", false).await.unwrap();
        assert!(not_found.is_none());
    }

    #[tokio::test]
    async fn test_update_connection() {
        let (service, _temp) = create_test_service();

        let mut connection = create_test_connection("Test DB");
        let created = service.create(connection.clone()).await.unwrap();

        // 名前を変更
        connection.id = created.id.clone();
        connection.name = "Updated DB".to_string();

        let updated = service.update(connection).await.unwrap();
        assert_eq!(updated.name, "Updated DB");

        // 取得して確認
        let found = service.get_by_id(&created.id, false).await.unwrap().unwrap();
        assert_eq!(found.name, "Updated DB");
    }

    #[tokio::test]
    async fn test_delete_connection() {
        let (service, _temp) = create_test_service();

        let connection = create_test_connection("Test DB");
        let created = service.create(connection).await.unwrap();

        // 削除
        service.delete(&created.id).unwrap();

        // 取得できないことを確認
        let found = service.get_by_id(&created.id, false).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_mark_as_used() {
        let (service, _temp) = create_test_service();

        let connection = create_test_connection("Test DB");
        let created = service.create(connection).await.unwrap();

        // 最初はNone
        let found = service.get_by_id(&created.id, false).await.unwrap().unwrap();
        assert!(found.metadata.last_connected_at.is_none());
        assert_eq!(found.metadata.connection_count, 0);

        // 最終使用日時を更新
        service.mark_as_used(&created.id).unwrap();

        // 更新されていることを確認
        let found = service.get_by_id(&created.id, false).await.unwrap().unwrap();
        assert!(found.metadata.last_connected_at.is_some());
        assert_eq!(found.metadata.connection_count, 1);
    }
}
