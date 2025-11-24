use sql_query_build_lib::connection::{
    ConnectionCollection, ConnectionConfig, ConnectionInfo, DatabaseType, NetworkConfig,
};
use sql_query_build_lib::crypto::encryption::{AesGcmEncryptor, Encryptor};
use sql_query_build_lib::crypto::master_key::{keychain::tests::MockKeychain, MasterKeyManager};
use sql_query_build_lib::storage::FileStorage;
use std::sync::Arc;
use tempfile::TempDir;

/// 統合テスト: 完全な接続情報の保存・読み込みサイクル
#[tokio::test]
async fn test_full_connection_save_load_cycle() {
    // セットアップ
    let temp_dir = TempDir::new().unwrap();
    let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();
    let encryptor = AesGcmEncryptor::new();
    let key_manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

    // マスターキー初期化
    key_manager.initialize().await.unwrap();
    let master_key = key_manager.get_master_key().await.unwrap();

    // 接続情報作成
    let connection = ConnectionInfo::new(
        "Integration Test DB".to_string(),
        DatabaseType::PostgreSQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: "testuser".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    // パスワードを暗号化
    let password = "my_secret_password";
    let encrypted_password = encryptor.encrypt(password.as_bytes(), &master_key).unwrap();
    let encrypted_password_base64 = encrypted_password.to_base64().unwrap();

    let mut connection_with_password = connection.clone();
    if let ConnectionConfig::Network(ref mut config) = connection_with_password.connection {
        config.encrypted_password = Some(encrypted_password_base64);
    }

    // 保存
    storage
        .write("test_connection", &connection_with_password)
        .unwrap();

    // 読み込み
    let loaded: ConnectionInfo = storage.read("test_connection").unwrap();

    // 検証
    assert_eq!(loaded.name, "Integration Test DB");
    assert_eq!(loaded.database_type, DatabaseType::PostgreSQL);

    // パスワードを復号化
    if let ConnectionConfig::Network(ref config) = loaded.connection {
        use sql_query_build_lib::crypto::types::EncryptedData;

        let encrypted_data =
            EncryptedData::from_base64(config.encrypted_password.as_ref().unwrap()).unwrap();

        let decrypted = encryptor.decrypt(&encrypted_data, &master_key).unwrap();
        let decrypted_password = String::from_utf8(decrypted).unwrap();

        assert_eq!(decrypted_password, password);
    } else {
        panic!("Expected Network config");
    }
}

/// 統合テスト: 複数の接続情報をコレクションとして保存・読み込み
#[tokio::test]
async fn test_connection_collection_persistence() {
    let temp_dir = TempDir::new().unwrap();
    let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();
    let encryptor = AesGcmEncryptor::new();
    let key_manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

    // マスターキー初期化
    key_manager.initialize().await.unwrap();
    let master_key = key_manager.get_master_key().await.unwrap();

    // 複数の接続情報を作成
    let mut collection = ConnectionCollection::new();

    // PostgreSQL接続
    let pg_connection = ConnectionInfo::new(
        "PostgreSQL DB".to_string(),
        DatabaseType::PostgreSQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "postgres".to_string(),
            username: "postgres".to_string(),
            encrypted_password: Some(
                encryptor
                    .encrypt(b"pg_password", &master_key)
                    .unwrap()
                    .to_base64()
                    .unwrap(),
            ),
            ssl_config: None,
            options: None,
        }),
    );

    // MySQL接続
    let mysql_connection = ConnectionInfo::new(
        "MySQL DB".to_string(),
        DatabaseType::MySQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 3306,
            database: "mysql".to_string(),
            username: "root".to_string(),
            encrypted_password: Some(
                encryptor
                    .encrypt(b"mysql_password", &master_key)
                    .unwrap()
                    .to_base64()
                    .unwrap(),
            ),
            ssl_config: None,
            options: None,
        }),
    );

    collection.add(pg_connection).unwrap();
    collection.add(mysql_connection).unwrap();

    // コレクションを保存
    storage.write("connections", &collection).unwrap();

    // コレクションを読み込み
    let loaded_collection: ConnectionCollection = storage.read("connections").unwrap();

    // 検証
    assert_eq!(loaded_collection.connections.len(), 2);
    assert_eq!(loaded_collection.version, collection.version);

    // 各接続のパスワードを復号化して検証
    for conn in &loaded_collection.connections {
        if let ConnectionConfig::Network(ref config) = conn.connection {
            if let Some(ref encrypted_password) = config.encrypted_password {
                use sql_query_build_lib::crypto::types::EncryptedData;

                let encrypted_data = EncryptedData::from_base64(encrypted_password).unwrap();
                let decrypted = encryptor.decrypt(&encrypted_data, &master_key).unwrap();

                match conn.database_type {
                    DatabaseType::PostgreSQL => {
                        assert_eq!(decrypted, b"pg_password");
                    }
                    DatabaseType::MySQL => {
                        assert_eq!(decrypted, b"mysql_password");
                    }
                    _ => panic!("Unexpected database type"),
                }
            }
        }
    }
}

/// 統合テスト: マスターキー再生成時の処理
#[tokio::test]
async fn test_master_key_regeneration_flow() {
    let key_manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

    // 初期化
    key_manager.initialize().await.unwrap();
    let original_key = key_manager.get_master_key().await.unwrap();

    // 元のキーでデータを暗号化
    let encryptor = AesGcmEncryptor::new();
    let plaintext = b"important data";
    let encrypted = encryptor.encrypt(plaintext, &original_key).unwrap();

    // マスターキーを再生成
    key_manager.regenerate().await.unwrap();
    let new_key = key_manager.get_master_key().await.unwrap();

    // キーが変更されたことを確認
    assert_ne!(original_key, new_key);

    // 古いキーで暗号化されたデータは新しいキーでは復号化できない
    let result = encryptor.decrypt(&encrypted, &new_key);
    assert!(result.is_err());

    // 新しいキーで暗号化されたデータは正しく復号化できる
    let new_encrypted = encryptor.encrypt(plaintext, &new_key).unwrap();
    let decrypted = encryptor.decrypt(&new_encrypted, &new_key).unwrap();
    assert_eq!(plaintext, decrypted.as_slice());
}

/// 統合テスト: ストレージとマスターキーマネージャーの並行アクセス
#[tokio::test]
async fn test_concurrent_storage_and_crypto_operations() {
    use tokio::task;

    let temp_dir = TempDir::new().unwrap();
    let storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
    let key_manager = Arc::new(MasterKeyManager::with_keychain(Arc::new(
        MockKeychain::new(),
    )));
    let encryptor = Arc::new(AesGcmEncryptor::new());

    // マスターキー初期化
    key_manager.initialize().await.unwrap();

    // 複数のタスクを並行実行
    let mut handles = vec![];

    for i in 0..10 {
        let storage = Arc::clone(&storage);
        let key_manager = Arc::clone(&key_manager);
        let encryptor = Arc::clone(&encryptor);

        let handle = task::spawn(async move {
            let master_key = key_manager.get_master_key().await.unwrap();

            let connection = ConnectionInfo::new(
                format!("DB {}", i),
                DatabaseType::PostgreSQL,
                ConnectionConfig::Network(NetworkConfig {
                    host: "localhost".to_string(),
                    port: 5432,
                    database: format!("db{}", i),
                    username: format!("user{}", i),
                    encrypted_password: Some(
                        encryptor
                            .encrypt(format!("password{}", i).as_bytes(), &master_key)
                            .unwrap()
                            .to_base64()
                            .unwrap(),
                    ),
                    ssl_config: None,
                    options: None,
                }),
            );

            storage.write(&format!("conn_{}", i), &connection).unwrap();
        });

        handles.push(handle);
    }

    // 全タスクの完了を待つ
    for handle in handles {
        handle.await.unwrap();
    }

    // 全てのキーが存在することを確認
    let keys = storage.list_keys().unwrap();
    assert_eq!(keys.len(), 10);
}

/// 統合テスト: エラーハンドリングの統合確認
#[tokio::test]
async fn test_error_handling_integration() {
    let temp_dir = TempDir::new().unwrap();
    let storage = FileStorage::new(temp_dir.path().to_path_buf()).unwrap();
    let key_manager = MasterKeyManager::with_keychain(Arc::new(MockKeychain::new()));

    // マスターキーが未初期化の状態で取得を試みる
    let result = key_manager.get_master_key().await;
    assert!(result.is_err());

    // 存在しないキーの読み込み
    let result: Result<ConnectionInfo, _> = storage.read("nonexistent");
    assert!(result.is_err());

    // マスターキーを初期化
    key_manager.initialize().await.unwrap();

    // 二重初期化のエラー
    let result = key_manager.initialize().await;
    assert!(result.is_err());
}
