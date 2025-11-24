use super::{ConnectionConfig, ConnectionInfo, DatabaseType, EnvironmentType, NetworkConfig};
use serde::{Deserialize, Serialize};

/// フロントエンド互換の接続情報（フラットな構造）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontendConnection {
    pub id: String,
    pub name: String,
    pub environment: String,
    pub theme_color: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub save_password: bool,
    pub db_type: String,
    pub ssl: bool,
    pub ssh_tunnel: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh_host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh_port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh_username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh_password: Option<String>,
    pub timeout: u32,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<String>,
}

impl From<ConnectionInfo> for FrontendConnection {
    fn from(conn: ConnectionInfo) -> Self {
        let (host, port, database, username, password, ssl) = match conn.connection {
            ConnectionConfig::Network(ref network) => (
                network.host.clone(),
                network.port,
                network.database.clone(),
                network.username.clone(),
                network.encrypted_password.clone().unwrap_or_default(),
                network
                    .ssl_config
                    .as_ref()
                    .map(|s| s.enabled)
                    .unwrap_or(false),
            ),
            ConnectionConfig::File(ref file) => (
                String::new(),
                0,
                file.file_path.clone(),
                String::new(),
                String::new(),
                false,
            ),
        };

        let environment = match conn.environment.environment_type {
            EnvironmentType::Development => "development",
            EnvironmentType::Testing => "test",
            EnvironmentType::Staging => "staging",
            EnvironmentType::Production => "production",
        }
        .to_string();

        let db_type = match conn.database_type {
            DatabaseType::PostgreSQL => "postgresql",
            DatabaseType::MySQL => "mysql",
            DatabaseType::SQLite => "sqlite",
        }
        .to_string();

        Self {
            id: conn.id,
            name: conn.name,
            environment,
            theme_color: conn.environment.effective_color(),
            host,
            port,
            database,
            username,
            password,
            save_password: true, // デフォルト
            db_type,
            ssl,
            ssh_tunnel: false, // TODO: SSH設定に対応
            ssh_host: None,
            ssh_port: None,
            ssh_username: None,
            ssh_password: None,
            timeout: 30, // デフォルト
            created_at: conn.metadata.created_at.to_rfc3339(),
            updated_at: conn.metadata.updated_at.to_rfc3339(),
            last_used_at: conn.metadata.last_connected_at.map(|dt| dt.to_rfc3339()),
        }
    }
}

impl TryFrom<FrontendConnection> for ConnectionInfo {
    type Error = String;

    fn try_from(frontend: FrontendConnection) -> Result<Self, Self::Error> {
        use chrono::DateTime;

        let database_type = match frontend.db_type.as_str() {
            "postgresql" => DatabaseType::PostgreSQL,
            "mysql" => DatabaseType::MySQL,
            "sqlite" => DatabaseType::SQLite,
            _ => return Err(format!("Invalid database type: {}", frontend.db_type)),
        };

        let environment_type = match frontend.environment.as_str() {
            "development" => EnvironmentType::Development,
            "test" => EnvironmentType::Testing,
            "staging" => EnvironmentType::Staging,
            "production" => EnvironmentType::Production,
            _ => return Err(format!("Invalid environment: {}", frontend.environment)),
        };

        let connection = if database_type.is_file_based() {
            ConnectionConfig::File(super::FileConfig {
                file_path: frontend.database,
                readonly: false,
            })
        } else {
            ConnectionConfig::Network(NetworkConfig {
                host: frontend.host,
                port: frontend.port,
                database: frontend.database,
                username: frontend.username,
                encrypted_password: if frontend.save_password && !frontend.password.is_empty() {
                    Some(frontend.password)
                } else {
                    None
                },
                ssl_config: if frontend.ssl {
                    Some(super::SslConfig {
                        enabled: true,
                        ..Default::default()
                    })
                } else {
                    None
                },
                options: None,
            })
        };

        let created_at = DateTime::parse_from_rfc3339(&frontend.created_at)
            .map_err(|e| format!("Invalid created_at: {}", e))?
            .with_timezone(&chrono::Utc);

        let updated_at = DateTime::parse_from_rfc3339(&frontend.updated_at)
            .map_err(|e| format!("Invalid updated_at: {}", e))?
            .with_timezone(&chrono::Utc);

        let last_connected_at = frontend
            .last_used_at
            .map(|s| DateTime::parse_from_rfc3339(&s).map(|dt| dt.with_timezone(&chrono::Utc)))
            .transpose()
            .map_err(|e| format!("Invalid last_used_at: {}", e))?;

        Ok(ConnectionInfo {
            id: frontend.id,
            name: frontend.name,
            database_type,
            connection,
            environment: super::EnvironmentConfig {
                environment_type,
                theme_color: Some(frontend.theme_color),
                theme_variant: super::ThemeVariant::Light,
            },
            metadata: super::ConnectionMetadata {
                created_at,
                updated_at,
                last_connected_at,
                connection_count: 0,
                tags: Vec::new(),
                note: None,
                is_favorite: false,
            },
        })
    }
}
