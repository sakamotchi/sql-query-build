use crate::connection::storage::ConnectionStorage;
use crate::connection::{ConnectionConfig, ConnectionError, ConnectionInfo};
use crate::crypto::{decrypt_string, CredentialStorage, MasterKeyManager};
use std::sync::Arc;

/// 接続情報のビジネスロジックを管理するサービス
pub struct ConnectionService {
    storage: Arc<ConnectionStorage>,
    credential_storage: Arc<CredentialStorage>,
    master_key_manager: Arc<MasterKeyManager>,
}

impl ConnectionService {
    /// 新しいConnectionServiceインスタンスを作成
    pub fn new(
        storage: Arc<ConnectionStorage>,
        credential_storage: Arc<CredentialStorage>,
        master_key_manager: Arc<MasterKeyManager>,
    ) -> Self {
        Self {
            storage,
            credential_storage,
            master_key_manager,
        }
    }

    /// すべての接続情報を取得（パスワードは含めない）
    pub fn get_all(&self) -> Result<Vec<ConnectionInfo>, ConnectionError> {
        let mut connections = self.storage.get_all()?;
        connections
            .iter_mut()
            .for_each(Self::strip_password_field);
        Ok(connections)
    }

    /// IDで接続情報を取得
    /// include_password_decrypted: trueの場合、パスワードを復号化して返す
    pub async fn get_by_id(
        &self,
        id: &str,
        include_password_decrypted: bool,
    ) -> Result<Option<ConnectionInfo>, ConnectionError> {
        let mut connection = match self.storage.get_by_id(id)? {
            Some(conn) => conn,
            None => return Ok(None),
        };

        let legacy_password = Self::take_password_field(&mut connection);
        let mut password: Option<String> = None;

        if include_password_decrypted {
            password = self
                .credential_storage
                .get_password(&connection.id)
                .await
                .map_err(|e| ConnectionError::StorageError(e.to_string()))?;

            if password.is_none() {
                if let Some(encrypted) = legacy_password {
                    if let Ok(decrypted) = self.decrypt_legacy_password(&encrypted).await {
                        // 取得できた場合は新ストレージに保存を試みる（失敗しても致命的ではない）
                        let _ = self
                            .credential_storage
                            .save(&connection.id, Some(&decrypted), None, None)
                            .await;
                        password = Some(decrypted);
                    }
                }
            }
        }

        if let Some(pwd) = password {
            Self::apply_password(&mut connection, &pwd);
        }

        Ok(Some(connection))
    }

    /// 接続情報を作成
    pub async fn create(
        &self,
        connection: ConnectionInfo,
    ) -> Result<ConnectionInfo, ConnectionError> {
        let mut connection = connection;
        connection.validate()?;

        let password = Self::take_password_field(&mut connection);
        let saved = self.storage.create(connection)?;

        if let Some(pwd) = password {
            self.credential_storage
                .save(&saved.id, Some(&pwd), None, None)
                .await
                .map_err(|e| ConnectionError::StorageError(e.to_string()))?;
        }

        Ok(saved)
    }

    /// 接続情報を更新
    pub async fn update(
        &self,
        connection: ConnectionInfo,
    ) -> Result<ConnectionInfo, ConnectionError> {
        let mut connection = connection;
        connection.validate()?;

        let password = Self::take_password_field(&mut connection);
        let updated = self.storage.update(connection)?;

        if let Some(pwd) = password {
            self.credential_storage
                .save(&updated.id, Some(&pwd), None, None)
                .await
                .map_err(|e| ConnectionError::StorageError(e.to_string()))?;
        }

        Ok(updated)
    }

    /// 接続情報を削除
    pub async fn delete(&self, id: &str) -> Result<(), ConnectionError> {
        let _ = self.credential_storage.delete(id).await;
        self.storage.delete(id)
    }

    /// 最終使用日時を更新
    pub fn mark_as_used(&self, id: &str) -> Result<(), ConnectionError> {
        self.storage.update_last_used(id)
    }

    /// 接続情報からパスワードを取り除き、取り出した値を返す
    fn take_password_field(connection: &mut ConnectionInfo) -> Option<String> {
        if let ConnectionConfig::Network(ref mut network_config) = connection.connection {
            let value = network_config.encrypted_password.take();
            return value.and_then(|p| if p.is_empty() { None } else { Some(p) });
        }
        None
    }

    /// 接続情報へ平文パスワードを適用
    fn apply_password(connection: &mut ConnectionInfo, password: &str) {
        if let ConnectionConfig::Network(ref mut network_config) = connection.connection {
            network_config.encrypted_password = Some(password.to_string());
        }
    }

    /// 接続情報からパスワードを除去
    fn strip_password_field(connection: &mut ConnectionInfo) {
        if let ConnectionConfig::Network(ref mut network_config) = connection.connection {
            network_config.encrypted_password = None;
        }
    }

    /// 旧形式の暗号化パスワードを復号化（MasterKeyManager利用）
    async fn decrypt_legacy_password(&self, encrypted_password: &str) -> Result<String, ConnectionError> {
        if !self.master_key_manager.is_initialized() {
            return Err(ConnectionError::EncryptionError(
                "Master key is not initialized".to_string(),
            ));
        }

        let master_key = self
            .master_key_manager
            .get_master_key()
            .await
            .map_err(|e| ConnectionError::EncryptionError(e.to_string()))?;

        decrypt_string(encrypted_password, &master_key)
            .map_err(|e| ConnectionError::EncryptionError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::{ConnectionConfig, DatabaseType, NetworkConfig};
    use crate::crypto::{CredentialStorage, SecurityConfigStorage, SecurityProviderManager};
    use crate::storage::FileStorage;
    use std::sync::Arc;
    use tempfile::TempDir;

    async fn create_test_service() -> (ConnectionService, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("data");
        let settings_dir = temp_dir.path().join("settings");

        let data_storage = Arc::new(FileStorage::new(data_dir).unwrap());
        let provider_storage = Arc::new(FileStorage::new(settings_dir.clone()).unwrap());
        let config_storage = Arc::new(SecurityConfigStorage::new(settings_dir));
        let provider_manager = Arc::new(
            SecurityProviderManager::new(config_storage, Arc::clone(&provider_storage))
                .await
                .unwrap(),
        );

        let credential_storage =
            Arc::new(CredentialStorage::new(Arc::clone(&data_storage), provider_manager));
        let storage = Arc::new(ConnectionStorage::new(Arc::clone(&data_storage)));
        let master_key_manager = Arc::new(MasterKeyManager::new());
        let service =
            ConnectionService::new(storage, credential_storage, master_key_manager);
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

        ConnectionInfo::new(name.to_string(), DatabaseType::PostgreSQL, config)
    }

    #[tokio::test]
    async fn test_create_connection() {
        let (service, _temp) = create_test_service().await;

        let connection = create_test_connection("Test DB");
        let result = service.create(connection.clone()).await.unwrap();

        assert_eq!(result.id, connection.id);
        assert_eq!(result.name, "Test DB");
    }

    #[tokio::test]
    async fn test_get_all_connections() {
        let (service, _temp) = create_test_service().await;

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
        let (service, _temp) = create_test_service().await;

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
        let (service, _temp) = create_test_service().await;

        let mut connection = create_test_connection("Test DB");
        let created = service.create(connection.clone()).await.unwrap();

        // 名前を変更
        connection.id = created.id.clone();
        connection.name = "Updated DB".to_string();

        let updated = service.update(connection).await.unwrap();
        assert_eq!(updated.name, "Updated DB");

        // 取得して確認
        let found = service
            .get_by_id(&created.id, false)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(found.name, "Updated DB");
    }

    #[tokio::test]
    async fn test_delete_connection() {
        let (service, _temp) = create_test_service().await;

        let connection = create_test_connection("Test DB");
        let created = service.create(connection).await.unwrap();

        // 削除
        service.delete(&created.id).await.unwrap();

        // 取得できないことを確認
        let found = service.get_by_id(&created.id, false).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_mark_as_used() {
        let (service, _temp) = create_test_service().await;

        let connection = create_test_connection("Test DB");
        let created = service.create(connection).await.unwrap();

        // 最初はNone
        let found = service
            .get_by_id(&created.id, false)
            .await
            .unwrap()
            .unwrap();
        assert!(found.metadata.last_connected_at.is_none());
        assert_eq!(found.metadata.connection_count, 0);

        // 最終使用日時を更新
        service.mark_as_used(&created.id).unwrap();

        // 更新されていることを確認
        let found = service
            .get_by_id(&created.id, false)
            .await
            .unwrap()
            .unwrap();
        assert!(found.metadata.last_connected_at.is_some());
        assert_eq!(found.metadata.connection_count, 1);
    }
}
