use super::*;

#[test]
fn test_database_type_default_port() {
    assert_eq!(DatabaseType::PostgreSQL.default_port(), Some(5432));
    assert_eq!(DatabaseType::MySQL.default_port(), Some(3306));
    assert_eq!(DatabaseType::SQLite.default_port(), None);
}

#[test]
fn test_database_type_display_name() {
    assert_eq!(DatabaseType::PostgreSQL.display_name(), "PostgreSQL");
    assert_eq!(DatabaseType::MySQL.display_name(), "MySQL");
    assert_eq!(DatabaseType::SQLite.display_name(), "SQLite");
}

#[test]
fn test_database_type_is_file_based() {
    assert!(!DatabaseType::PostgreSQL.is_file_based());
    assert!(!DatabaseType::MySQL.is_file_based());
    assert!(DatabaseType::SQLite.is_file_based());
}

#[test]
fn test_environment_type_default_color() {
    assert_eq!(EnvironmentType::Development.default_color(), "blue");
    assert_eq!(EnvironmentType::Staging.default_color(), "orange");
    assert_eq!(EnvironmentType::Testing.default_color(), "purple");
    assert_eq!(EnvironmentType::Production.default_color(), "red");
}

#[test]
fn test_environment_type_is_production() {
    assert!(!EnvironmentType::Development.is_production());
    assert!(!EnvironmentType::Staging.is_production());
    assert!(!EnvironmentType::Testing.is_production());
    assert!(EnvironmentType::Production.is_production());
}

#[test]
fn test_environment_config_effective_color() {
    let mut config = EnvironmentConfig::default();
    assert_eq!(config.effective_color(), "blue");

    config.theme_color = Some("teal".to_string());
    assert_eq!(config.effective_color(), "teal");

    config.environment_type = EnvironmentType::Production;
    assert_eq!(config.effective_color(), "teal");

    config.theme_color = None;
    assert_eq!(config.effective_color(), "red");
}

#[test]
fn test_connection_info_builder_postgresql() {
    let result = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .environment(EnvironmentType::Development)
        .theme_color("teal")
        .build();

    assert!(result.is_ok());
    let info = result.unwrap();
    assert_eq!(info.name, "Test DB");
    assert_eq!(info.database_type, DatabaseType::PostgreSQL);
    assert_eq!(
        info.environment.environment_type,
        EnvironmentType::Development
    );
    assert_eq!(info.environment.theme_color, Some("teal".to_string()));
}

#[test]
fn test_connection_info_builder_sqlite() {
    let result = ConnectionInfoBuilder::new("Local DB", DatabaseType::SQLite)
        .file("/path/to/db.sqlite")
        .build();

    assert!(result.is_ok());
    let info = result.unwrap();
    assert_eq!(info.name, "Local DB");
    assert_eq!(info.database_type, DatabaseType::SQLite);
}

#[test]
fn test_connection_info_builder_without_config() {
    let result = ConnectionInfoBuilder::new("Invalid DB", DatabaseType::PostgreSQL).build();

    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        ConnectionError::InvalidConfig(_)
    ));
}

#[test]
fn test_connection_info_validation_empty_name() {
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "localhost".to_string(),
        port: 5432,
        database: "testdb".to_string(),
        username: "testuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let info = ConnectionInfo::new("".to_string(), DatabaseType::PostgreSQL, config);
    assert!(info.validate().is_err());
}

#[test]
fn test_connection_info_validation_invalid_network_config() {
    // Empty host
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "".to_string(),
        port: 5432,
        database: "testdb".to_string(),
        username: "testuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::PostgreSQL, config);
    assert!(matches!(
        info.validate().unwrap_err(),
        ConnectionError::InvalidHost
    ));

    // Zero port
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "localhost".to_string(),
        port: 0,
        database: "testdb".to_string(),
        username: "testuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::PostgreSQL, config);
    assert!(matches!(
        info.validate().unwrap_err(),
        ConnectionError::InvalidPort
    ));
}

#[test]
fn test_connection_string_postgresql() {
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "localhost".to_string(),
        port: 5432,
        database: "testdb".to_string(),
        username: "testuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::PostgreSQL, config);
    let conn_str = info.build_connection_string(Some("password123")).unwrap();
    assert_eq!(
        conn_str,
        "postgresql://testuser:password123@localhost:5432/testdb"
    );
}

#[test]
fn test_connection_string_mysql() {
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "db.example.com".to_string(),
        port: 3306,
        database: "mydb".to_string(),
        username: "myuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::MySQL, config);
    let conn_str = info.build_connection_string(Some("secret")).unwrap();
    assert_eq!(conn_str, "mysql://myuser:secret@db.example.com:3306/mydb");
}

#[test]
fn test_connection_string_sqlite() {
    let config = ConnectionConfig::File(FileConfig {
        file_path: "/path/to/db.sqlite".to_string(),
        readonly: false,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::SQLite, config);
    let conn_str = info.build_connection_string(None).unwrap();
    assert_eq!(conn_str, "file:/path/to/db.sqlite");
}

#[test]
fn test_connection_string_sqlite_readonly() {
    let config = ConnectionConfig::File(FileConfig {
        file_path: "/path/to/db.sqlite".to_string(),
        readonly: true,
    });

    let info = ConnectionInfo::new("Test".to_string(), DatabaseType::SQLite, config);
    let conn_str = info.build_connection_string(None).unwrap();
    assert_eq!(conn_str, "file:/path/to/db.sqlite?mode=ro");
}

#[test]
fn test_connection_collection_add() {
    let mut collection = ConnectionCollection::new();

    let info = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    assert!(collection.add(info).is_ok());
    assert_eq!(collection.connections.len(), 1);
}

#[test]
fn test_connection_collection_duplicate_name() {
    let mut collection = ConnectionCollection::new();

    let info1 = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    let info2 = ConnectionInfoBuilder::new("Test DB", DatabaseType::MySQL)
        .network("localhost", 3306, "testdb", "testuser")
        .build()
        .unwrap();

    assert!(collection.add(info1).is_ok());
    assert!(matches!(
        collection.add(info2).unwrap_err(),
        ConnectionError::DuplicateName
    ));
}

#[test]
fn test_connection_collection_get() {
    let mut collection = ConnectionCollection::new();

    let info = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    let id = info.id.clone();
    collection.add(info).unwrap();

    assert!(collection.get(&id).is_some());
    assert!(collection.get("nonexistent").is_none());
}

#[test]
fn test_connection_collection_update() {
    let mut collection = ConnectionCollection::new();

    let mut info = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    let id = info.id.clone();
    collection.add(info.clone()).unwrap();

    info.name = "Updated DB".to_string();
    assert!(collection.update(&id, info).is_ok());
    assert_eq!(collection.get(&id).unwrap().name, "Updated DB");
}

#[test]
fn test_connection_collection_remove() {
    let mut collection = ConnectionCollection::new();

    let info = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    let id = info.id.clone();
    collection.add(info).unwrap();

    let removed = collection.remove(&id);
    assert!(removed.is_ok());
    assert_eq!(collection.connections.len(), 0);

    assert!(matches!(
        collection.remove(&id).unwrap_err(),
        ConnectionError::NotFound
    ));
}

#[test]
fn test_connection_collection_find_by_tag() {
    let mut collection = ConnectionCollection::new();

    let mut info1 = ConnectionInfoBuilder::new("DB1", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();
    info1.metadata.tags.push("production".to_string());

    let mut info2 = ConnectionInfoBuilder::new("DB2", DatabaseType::MySQL)
        .network("localhost", 3306, "testdb", "testuser")
        .build()
        .unwrap();
    info2.metadata.tags.push("development".to_string());

    collection.add(info1).unwrap();
    collection.add(info2).unwrap();

    let results = collection.find_by_tag("production");
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "DB1");
}

#[test]
fn test_connection_collection_find_by_environment() {
    let mut collection = ConnectionCollection::new();

    let info1 = ConnectionInfoBuilder::new("DB1", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .environment(EnvironmentType::Production)
        .build()
        .unwrap();

    let info2 = ConnectionInfoBuilder::new("DB2", DatabaseType::MySQL)
        .network("localhost", 3306, "testdb", "testuser")
        .environment(EnvironmentType::Development)
        .build()
        .unwrap();

    collection.add(info1).unwrap();
    collection.add(info2).unwrap();

    let results = collection.find_by_environment(EnvironmentType::Production);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "DB1");
}

#[test]
fn test_connection_collection_favorites() {
    let mut collection = ConnectionCollection::new();

    let mut info1 = ConnectionInfoBuilder::new("DB1", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();
    info1.metadata.is_favorite = true;

    let info2 = ConnectionInfoBuilder::new("DB2", DatabaseType::MySQL)
        .network("localhost", 3306, "testdb", "testuser")
        .build()
        .unwrap();

    collection.add(info1).unwrap();
    collection.add(info2).unwrap();

    let favorites = collection.favorites();
    assert_eq!(favorites.len(), 1);
    assert_eq!(favorites[0].name, "DB1");
}

#[test]
fn test_connection_metadata_record_connection() {
    let config = ConnectionConfig::Network(NetworkConfig {
        host: "localhost".to_string(),
        port: 5432,
        database: "testdb".to_string(),
        username: "testuser".to_string(),
        encrypted_password: None,
        ssl_config: None,
        options: None,
    });

    let mut info = ConnectionInfo::new("Test".to_string(), DatabaseType::PostgreSQL, config);

    assert_eq!(info.metadata.connection_count, 0);
    assert!(info.metadata.last_connected_at.is_none());

    info.metadata.record_connection();

    assert_eq!(info.metadata.connection_count, 1);
    assert!(info.metadata.last_connected_at.is_some());
}

#[test]
fn test_json_serialization() {
    let info = ConnectionInfoBuilder::new("Test DB", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .environment(EnvironmentType::Production)
        .theme_color("red")
        .build()
        .unwrap();

    let json = serde_json::to_string(&info).unwrap();
    let deserialized: ConnectionInfo = serde_json::from_str(&json).unwrap();

    assert_eq!(info.name, deserialized.name);
    assert_eq!(info.database_type, deserialized.database_type);
    assert_eq!(
        info.environment.environment_type,
        deserialized.environment.environment_type
    );
}

#[test]
fn test_collection_json_serialization() {
    let mut collection = ConnectionCollection::new();

    let info1 = ConnectionInfoBuilder::new("DB1", DatabaseType::PostgreSQL)
        .network("localhost", 5432, "testdb", "testuser")
        .build()
        .unwrap();

    let info2 = ConnectionInfoBuilder::new("DB2", DatabaseType::SQLite)
        .file("/path/to/db.sqlite")
        .build()
        .unwrap();

    collection.add(info1).unwrap();
    collection.add(info2).unwrap();

    let json = serde_json::to_string(&collection).unwrap();
    let deserialized: ConnectionCollection = serde_json::from_str(&json).unwrap();

    assert_eq!(collection.version, deserialized.version);
    assert_eq!(collection.connections.len(), deserialized.connections.len());
}
