use crate::connection::{ConnectionConfig, ConnectionInfo, DatabaseType, NetworkConfig, FileConfig};

#[test]
fn test_inspector_factory_requires_valid_connection_type() {
    // PostgreSQLの場合はNetworkConfigが必要
    let pg_conn = ConnectionInfo::new(
        "Test PostgreSQL".to_string(),
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

    // 型チェックが通ることを確認（実際の接続は行わない）
    assert_eq!(pg_conn.database_type, DatabaseType::PostgreSQL);
    if let ConnectionConfig::Network(cfg) = &pg_conn.connection {
        assert_eq!(cfg.database, "testdb");
    } else {
        panic!("Expected Network config for PostgreSQL");
    }

    // MySQLの場合もNetworkConfigが必要
    let mysql_conn = ConnectionInfo::new(
        "Test MySQL".to_string(),
        DatabaseType::MySQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 3306,
            database: "testdb".to_string(),
            username: "testuser".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    assert_eq!(mysql_conn.database_type, DatabaseType::MySQL);
    if let ConnectionConfig::Network(cfg) = &mysql_conn.connection {
        assert_eq!(cfg.database, "testdb");
    } else {
        panic!("Expected Network config for MySQL");
    }

    // SQLiteの場合はFileConfigが必要
    let sqlite_conn = ConnectionInfo::new(
        "Test SQLite".to_string(),
        DatabaseType::SQLite,
        ConnectionConfig::File(FileConfig {
            file_path: "/tmp/test.db".to_string(),
            readonly: false,
        }),
    );

    assert_eq!(sqlite_conn.database_type, DatabaseType::SQLite);
    if let ConnectionConfig::File(cfg) = &sqlite_conn.connection {
        assert_eq!(cfg.file_path, "/tmp/test.db");
    } else {
        panic!("Expected File config for SQLite");
    }
}

#[test]
fn test_connection_info_for_postgresql() {
    let conn = ConnectionInfo::new(
        "PostgreSQL DB".to_string(),
        DatabaseType::PostgreSQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "pg.example.com".to_string(),
            port: 5432,
            database: "production_db".to_string(),
            username: "pguser".to_string(),
            encrypted_password: Some("encrypted_password_here".to_string()),
            ssl_config: None,
            options: None,
        }),
    );

    assert_eq!(conn.name, "PostgreSQL DB");
    assert_eq!(conn.database_type, DatabaseType::PostgreSQL);

    if let ConnectionConfig::Network(cfg) = &conn.connection {
        assert_eq!(cfg.host, "pg.example.com");
        assert_eq!(cfg.port, 5432);
        assert_eq!(cfg.database, "production_db");
        assert_eq!(cfg.username, "pguser");
        assert!(cfg.encrypted_password.is_some());
    } else {
        panic!("Expected Network config");
    }
}

#[test]
fn test_connection_info_for_mysql() {
    let conn = ConnectionInfo::new(
        "MySQL DB".to_string(),
        DatabaseType::MySQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "mysql.example.com".to_string(),
            port: 3306,
            database: "app_database".to_string(),
            username: "mysqluser".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    assert_eq!(conn.name, "MySQL DB");
    assert_eq!(conn.database_type, DatabaseType::MySQL);

    if let ConnectionConfig::Network(cfg) = &conn.connection {
        assert_eq!(cfg.host, "mysql.example.com");
        assert_eq!(cfg.port, 3306);
        assert_eq!(cfg.database, "app_database");
    } else {
        panic!("Expected Network config");
    }
}

#[test]
fn test_connection_info_for_sqlite() {
    let conn = ConnectionInfo::new(
        "SQLite DB".to_string(),
        DatabaseType::SQLite,
        ConnectionConfig::File(FileConfig {
            file_path: "/var/data/app.db".to_string(),
            readonly: true,
        }),
    );

    assert_eq!(conn.name, "SQLite DB");
    assert_eq!(conn.database_type, DatabaseType::SQLite);

    if let ConnectionConfig::File(cfg) = &conn.connection {
        assert_eq!(cfg.file_path, "/var/data/app.db");
        assert!(cfg.readonly);
    } else {
        panic!("Expected File config");
    }
}

#[test]
fn test_database_type_matching() {
    // PostgreSQL
    let pg_type = DatabaseType::PostgreSQL;
    assert!(matches!(pg_type, DatabaseType::PostgreSQL));
    assert!(!pg_type.is_file_based());

    // MySQL
    let mysql_type = DatabaseType::MySQL;
    assert!(matches!(mysql_type, DatabaseType::MySQL));
    assert!(!mysql_type.is_file_based());

    // SQLite
    let sqlite_type = DatabaseType::SQLite;
    assert!(matches!(sqlite_type, DatabaseType::SQLite));
    assert!(sqlite_type.is_file_based());
}

#[test]
fn test_connection_string_building() {
    // PostgreSQL connection string
    let pg_conn = ConnectionInfo::new(
        "Test".to_string(),
        DatabaseType::PostgreSQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: "user".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    let conn_str = pg_conn.build_connection_string(Some("password")).unwrap();
    assert!(conn_str.contains("postgresql://"));
    assert!(conn_str.contains("localhost:5432"));
    assert!(conn_str.contains("testdb"));

    // MySQL connection string
    let mysql_conn = ConnectionInfo::new(
        "Test".to_string(),
        DatabaseType::MySQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 3306,
            database: "testdb".to_string(),
            username: "user".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    let conn_str = mysql_conn.build_connection_string(Some("password")).unwrap();
    assert!(conn_str.contains("mysql://"));
    assert!(conn_str.contains("localhost:3306"));

    // SQLite connection string
    let sqlite_conn = ConnectionInfo::new(
        "Test".to_string(),
        DatabaseType::SQLite,
        ConnectionConfig::File(FileConfig {
            file_path: "/tmp/test.db".to_string(),
            readonly: false,
        }),
    );

    let conn_str = sqlite_conn.build_connection_string(None).unwrap();
    assert!(conn_str.contains("file:/tmp/test.db"));
}

#[test]
fn test_password_handling() {
    let conn_with_password = ConnectionInfo::new(
        "Secure DB".to_string(),
        DatabaseType::PostgreSQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "securedb".to_string(),
            username: "admin".to_string(),
            encrypted_password: Some("encrypted_pass_123".to_string()),
            ssl_config: None,
            options: None,
        }),
    );

    if let ConnectionConfig::Network(cfg) = &conn_with_password.connection {
        assert!(cfg.encrypted_password.is_some());
        assert_eq!(cfg.encrypted_password.as_ref().unwrap(), "encrypted_pass_123");
    }

    let conn_without_password = ConnectionInfo::new(
        "Open DB".to_string(),
        DatabaseType::MySQL,
        ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 3306,
            database: "opendb".to_string(),
            username: "guest".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }),
    );

    if let ConnectionConfig::Network(cfg) = &conn_without_password.connection {
        assert!(cfg.encrypted_password.is_none());
    }
}
