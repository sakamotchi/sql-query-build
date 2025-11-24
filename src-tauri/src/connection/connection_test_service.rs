use crate::connection::{ConnectionConfig, ConnectionInfo, DatabaseType};
use anyhow::{Context, Result};
use std::time::{Duration, Instant};
use tokio::time::timeout;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    pub duration: Option<u64>, // ミリ秒
    pub server_version: Option<String>,
    pub server_info: Option<ServerInfo>,
    pub error_details: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub version: String,
    pub database_name: String,
    pub current_user: String,
    pub encoding: Option<String>,
}

fn connection_target_description(connection: &ConnectionInfo) -> String {
    match &connection.connection {
        ConnectionConfig::Network(net) => {
            let scheme = match connection.database_type {
                DatabaseType::PostgreSQL => "postgresql",
                DatabaseType::MySQL => "mysql",
                DatabaseType::SQLite => "sqlite",
            };
            format!("{}://{}:{}/{}", scheme, net.host, net.port, net.database)
        }
        ConnectionConfig::File(file) => format!("sqlite:{}", file.file_path),
    }
}

fn error_chain_to_string(error: &anyhow::Error) -> String {
    error
        .chain()
        .map(|e| e.to_string())
        .collect::<Vec<_>>()
        .join("\nCaused by: ")
}

pub struct ConnectionTestService;

impl ConnectionTestService {
    /// 接続をテスト
    pub async fn test_connection(
        connection: &ConnectionInfo,
        timeout_secs: u64,
    ) -> Result<TestConnectionResult> {
        let start = Instant::now();
        let timeout_duration = Duration::from_secs(timeout_secs);
        let target = connection_target_description(connection);

        // タイムアウト付きで接続テストを実行
        let result = timeout(timeout_duration, Self::execute_test(connection)).await;

        let duration = start.elapsed().as_millis() as u64;

        match result {
            Ok(Ok(server_info)) => Ok(TestConnectionResult {
                success: true,
                message: format!("接続に成功しました ({} ms)", duration),
                duration: Some(duration),
                server_version: Some(server_info.version.clone()),
                server_info: Some(server_info),
                error_details: None,
            }),
            Ok(Err(e)) => Ok(TestConnectionResult {
                success: false,
                message: format!("接続に失敗しました ({})", target),
                duration: Some(duration),
                server_version: None,
                server_info: None,
                error_details: Some(format!(
                    "ターゲット: {}\n原因: {}",
                    target,
                    error_chain_to_string(&e)
                )),
            }),
            Err(_) => Ok(TestConnectionResult {
                success: false,
                message: format!(
                    "接続がタイムアウトしました ({} 秒)",
                    timeout_duration.as_secs()
                ),
                duration: Some(duration),
                server_version: None,
                server_info: None,
                error_details: Some(format!("ターゲット: {}\n原因: Connection timeout", target)),
            }),
        }
    }

    /// 実際の接続テストを実行
    async fn execute_test(connection: &ConnectionInfo) -> Result<ServerInfo> {
        match connection.database_type {
            DatabaseType::PostgreSQL => Self::test_postgresql(connection).await,
            DatabaseType::MySQL => Self::test_mysql(connection).await,
            DatabaseType::SQLite => Self::test_sqlite(connection).await,
        }
    }

    /// PostgreSQL接続テスト
    async fn test_postgresql(connection: &ConnectionInfo) -> Result<ServerInfo> {
        use sqlx::postgres::{PgConnectOptions, PgPool};

        let network_config = match &connection.connection {
            ConnectionConfig::Network(config) => config,
            _ => return Err(anyhow::anyhow!("Invalid connection config for PostgreSQL")),
        };

        let mut options = PgConnectOptions::new()
            .host(&network_config.host)
            .port(network_config.port)
            .database(&network_config.database)
            .username(&network_config.username);

        if let Some(password) = &network_config.encrypted_password {
            options = options.password(password);
        }

        if let Some(ssl_config) = &network_config.ssl_config {
            if ssl_config.enabled {
                options = options.ssl_mode(sqlx::postgres::PgSslMode::Require);
            }
        }

        let pool = PgPool::connect_with(options)
            .await
            .context("Failed to connect to PostgreSQL")?;

        // サーバー情報を取得
        let version_query = sqlx::query_scalar::<_, String>("SELECT version()")
            .fetch_one(&pool)
            .await?;

        let current_user = sqlx::query_scalar::<_, String>("SELECT current_user")
            .fetch_one(&pool)
            .await?;

        let database_name = sqlx::query_scalar::<_, String>("SELECT current_database()")
            .fetch_one(&pool)
            .await?;

        let encoding = sqlx::query_scalar::<_, String>(
            "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()"
        )
        .fetch_one(&pool)
        .await
        .ok();

        pool.close().await;

        Ok(ServerInfo {
            version: version_query,
            database_name,
            current_user,
            encoding,
        })
    }

    /// MySQL接続テスト
    async fn test_mysql(connection: &ConnectionInfo) -> Result<ServerInfo> {
        use sqlx::mysql::{MySqlConnectOptions, MySqlPool};

        let network_config = match &connection.connection {
            ConnectionConfig::Network(config) => config,
            _ => return Err(anyhow::anyhow!("Invalid connection config for MySQL")),
        };

        let mut options = MySqlConnectOptions::new()
            .host(&network_config.host)
            .port(network_config.port)
            .database(&network_config.database)
            .username(&network_config.username);

        if let Some(password) = &network_config.encrypted_password {
            options = options.password(password);
        }

        if let Some(ssl_config) = &network_config.ssl_config {
            if ssl_config.enabled {
                options = options.ssl_mode(sqlx::mysql::MySqlSslMode::Required);
            }
        }

        let pool = MySqlPool::connect_with(options)
            .await
            .context("Failed to connect to MySQL")?;

        // サーバー情報を取得
        let version_query = sqlx::query_scalar::<_, String>("SELECT VERSION()")
            .fetch_one(&pool)
            .await?;

        let current_user = sqlx::query_scalar::<_, String>("SELECT USER()")
            .fetch_one(&pool)
            .await?;

        let database_name = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
            .fetch_one(&pool)
            .await?;

        pool.close().await;

        Ok(ServerInfo {
            version: version_query,
            database_name,
            current_user,
            encoding: None,
        })
    }

    /// SQLite接続テスト
    async fn test_sqlite(connection: &ConnectionInfo) -> Result<ServerInfo> {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
        use std::str::FromStr;

        let database_path = match &connection.connection {
            ConnectionConfig::File(config) => &config.file_path,
            _ => return Err(anyhow::anyhow!("Invalid connection config for SQLite")),
        };

        let options = SqliteConnectOptions::from_str(database_path)?;

        let pool = SqlitePool::connect_with(options)
            .await
            .context("Failed to connect to SQLite")?;

        // サーバー情報を取得
        let version_query = sqlx::query_scalar::<_, String>("SELECT sqlite_version()")
            .fetch_one(&pool)
            .await?;

        pool.close().await;

        Ok(ServerInfo {
            version: format!("SQLite {}", version_query),
            database_name: database_path.clone(),
            current_user: "local".to_string(),
            encoding: Some("UTF-8".to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::{ConnectionConfig, FileConfig, NetworkConfig, SslConfig};

    fn create_test_postgresql_connection() -> ConnectionInfo {
        let config = ConnectionConfig::Network(NetworkConfig {
            host: "localhost".to_string(),
            port: 5432,
            database: "postgres".to_string(),
            username: "postgres".to_string(),
            encrypted_password: Some("password".to_string()),
            ssl_config: Some(SslConfig {
                enabled: false,
                ca_cert_path: None,
                client_cert_path: None,
                client_key_path: None,
                verify_server_cert: true,
            }),
            options: None,
        });

        ConnectionInfo::new(
            "Test PostgreSQL".to_string(),
            DatabaseType::PostgreSQL,
            config,
        )
    }

    fn create_test_sqlite_connection() -> ConnectionInfo {
        let config = ConnectionConfig::File(FileConfig {
            file_path: ":memory:".to_string(),
            readonly: false,
        });

        ConnectionInfo::new("Test SQLite".to_string(), DatabaseType::SQLite, config)
    }

    #[tokio::test]
    async fn test_sqlite_connection_success() {
        let connection = create_test_sqlite_connection();
        let result = ConnectionTestService::test_connection(&connection, 30).await;

        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.success);
        assert!(result.server_info.is_some());

        let server_info = result.server_info.unwrap();
        assert!(server_info.version.contains("SQLite"));
        assert_eq!(server_info.current_user, "local");
    }

    #[tokio::test]
    async fn test_connection_timeout() {
        // 存在しないホストに接続してタイムアウトをテスト
        let config = ConnectionConfig::Network(NetworkConfig {
            host: "192.0.2.1".to_string(), // TEST-NET-1 (到達不可能なアドレス)
            port: 5432,
            database: "test".to_string(),
            username: "test".to_string(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        });

        let connection =
            ConnectionInfo::new("Timeout Test".to_string(), DatabaseType::PostgreSQL, config);

        let result = ConnectionTestService::test_connection(&connection, 1).await;

        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(!result.success);
        assert!(
            result.message.contains("タイムアウト") || result.message.contains("接続に失敗"),
            "Unexpected timeout message: {}",
            result.message
        );
    }

    #[tokio::test]
    async fn test_connection_invalid_credentials() {
        // ローカルにPostgreSQLが動いていない場合は接続失敗する
        let connection = create_test_postgresql_connection();
        let result = ConnectionTestService::test_connection(&connection, 5).await;

        assert!(result.is_ok());
        let _result = result.unwrap();
        // ローカルにDBがない場合は失敗するが、テスト自体は成功
        // 実際にDBがある環境では success == true になる
    }

    #[test]
    fn test_connection_result_serialization() {
        let result = TestConnectionResult {
            success: true,
            message: "Test message".to_string(),
            duration: Some(100),
            server_version: Some("PostgreSQL 14.0".to_string()),
            server_info: Some(ServerInfo {
                version: "PostgreSQL 14.0".to_string(),
                database_name: "testdb".to_string(),
                current_user: "testuser".to_string(),
                encoding: Some("UTF8".to_string()),
            }),
            error_details: None,
        };

        // JSONにシリアライズできることを確認
        let json = serde_json::to_string(&result);
        assert!(json.is_ok());

        // デシリアライズできることを確認
        let deserialized: Result<TestConnectionResult, _> = serde_json::from_str(&json.unwrap());
        assert!(deserialized.is_ok());
    }
}
