use super::error::ConnectionError;
use super::types::{
    ConnectionConfig, ConnectionInfo, DatabaseType, EnvironmentConfig, EnvironmentType, FileConfig,
    NetworkConfig,
};

/// 接続情報ビルダー
pub struct ConnectionInfoBuilder {
    name: String,
    database_type: DatabaseType,
    connection: Option<ConnectionConfig>,
    environment: EnvironmentConfig,
}

impl ConnectionInfoBuilder {
    pub fn new(name: impl Into<String>, database_type: DatabaseType) -> Self {
        Self {
            name: name.into(),
            database_type,
            connection: None,
            environment: EnvironmentConfig::default(),
        }
    }

    pub fn network(
        mut self,
        host: impl Into<String>,
        port: u16,
        database: impl Into<String>,
        username: impl Into<String>,
    ) -> Self {
        self.connection = Some(ConnectionConfig::Network(NetworkConfig {
            host: host.into(),
            port,
            database: database.into(),
            username: username.into(),
            encrypted_password: None,
            ssl_config: None,
            options: None,
        }));
        self
    }

    pub fn file(mut self, file_path: impl Into<String>) -> Self {
        self.connection = Some(ConnectionConfig::File(FileConfig {
            file_path: file_path.into(),
            readonly: false,
        }));
        self
    }

    pub fn environment(mut self, env_type: EnvironmentType) -> Self {
        self.environment.environment_type = env_type;
        self
    }

    pub fn theme_color(mut self, color: impl Into<String>) -> Self {
        self.environment.theme_color = Some(color.into());
        self
    }

    pub fn build(self) -> Result<ConnectionInfo, ConnectionError> {
        let connection = self
            .connection
            .ok_or_else(|| ConnectionError::InvalidConfig("接続設定が未設定です".to_string()))?;

        let mut info = ConnectionInfo::new(self.name, self.database_type, connection);
        info.environment = self.environment;
        info.validate()?;

        Ok(info)
    }
}
