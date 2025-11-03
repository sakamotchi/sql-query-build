use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::collections::HashMap;

use super::error::ConnectionError;

/// データベース接続情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    /// 一意識別子
    pub id: String,

    /// 接続名（ユーザーが設定する表示名）
    pub name: String,

    /// データベース種別
    pub database_type: DatabaseType,

    /// 接続設定
    pub connection: ConnectionConfig,

    /// 環境設定
    pub environment: EnvironmentConfig,

    /// メタデータ
    pub metadata: ConnectionMetadata,
}

impl ConnectionInfo {
    /// 新しい接続情報を作成
    pub fn new(name: String, database_type: DatabaseType, connection: ConnectionConfig) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            database_type,
            connection,
            environment: EnvironmentConfig::default(),
            metadata: ConnectionMetadata::new(),
        }
    }

    /// 接続文字列を生成
    pub fn build_connection_string(&self, password: Option<&str>) -> Result<String, ConnectionError> {
        match &self.connection {
            ConnectionConfig::Network(config) => {
                config.to_connection_string(&self.database_type, password)
            }
            ConnectionConfig::File(config) => {
                config.to_connection_string()
            }
        }
    }

    /// 接続情報をバリデート
    pub fn validate(&self) -> Result<(), ConnectionError> {
        // 名前のバリデーション
        if self.name.trim().is_empty() {
            return Err(ConnectionError::InvalidName("接続名は必須です".to_string()));
        }

        // 接続設定のバリデーション
        self.connection.validate(&self.database_type)?;

        Ok(())
    }
}

/// サポートするデータベース種別
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    PostgreSQL,
    MySQL,
    SQLite,
    // 将来の拡張
    // MariaDB,
    // Oracle,
    // SqlServer,
}

impl DatabaseType {
    /// デフォルトポート番号を取得
    pub fn default_port(&self) -> Option<u16> {
        match self {
            Self::PostgreSQL => Some(5432),
            Self::MySQL => Some(3306),
            Self::SQLite => None,
        }
    }

    /// 表示名を取得
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::PostgreSQL => "PostgreSQL",
            Self::MySQL => "MySQL",
            Self::SQLite => "SQLite",
        }
    }

    /// ファイルベースのデータベースかチェック
    pub fn is_file_based(&self) -> bool {
        matches!(self, Self::SQLite)
    }
}

/// 接続設定（ネットワーク/ファイル）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ConnectionConfig {
    /// ネットワーク経由の接続（PostgreSQL、MySQL等）
    Network(NetworkConfig),

    /// ファイルベースの接続（SQLite等）
    File(FileConfig),
}

impl ConnectionConfig {
    fn validate(&self, db_type: &DatabaseType) -> Result<(), ConnectionError> {
        match (self, db_type.is_file_based()) {
            (ConnectionConfig::Network(config), false) => config.validate(),
            (ConnectionConfig::File(config), true) => config.validate(),
            _ => Err(ConnectionError::InvalidConfig(
                "データベース種別と接続設定が一致しません".to_string(),
            )),
        }
    }
}

/// ネットワーク接続設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// ホスト名またはIPアドレス
    pub host: String,

    /// ポート番号
    pub port: u16,

    /// データベース名
    pub database: String,

    /// ユーザー名
    pub username: String,

    /// 暗号化されたパスワード（Base64エンコードされたEncryptedData）
    pub encrypted_password: Option<String>,

    /// SSL/TLS設定
    pub ssl_config: Option<SslConfig>,

    /// 追加のオプション（接続文字列パラメータ）
    pub options: Option<HashMap<String, String>>,
}

impl NetworkConfig {
    fn validate(&self) -> Result<(), ConnectionError> {
        if self.host.trim().is_empty() {
            return Err(ConnectionError::InvalidHost);
        }

        if self.port == 0 {
            return Err(ConnectionError::InvalidPort);
        }

        if self.database.trim().is_empty() {
            return Err(ConnectionError::InvalidDatabase);
        }

        if self.username.trim().is_empty() {
            return Err(ConnectionError::InvalidUsername);
        }

        Ok(())
    }

    fn to_connection_string(
        &self,
        db_type: &DatabaseType,
        password: Option<&str>,
    ) -> Result<String, ConnectionError> {
        let pwd = password.unwrap_or("");

        let base = match db_type {
            DatabaseType::PostgreSQL => {
                format!(
                    "postgresql://{}:{}@{}:{}/{}",
                    self.username, pwd, self.host, self.port, self.database
                )
            }
            DatabaseType::MySQL => {
                format!(
                    "mysql://{}:{}@{}:{}/{}",
                    self.username, pwd, self.host, self.port, self.database
                )
            }
            _ => {
                return Err(ConnectionError::InvalidConfig(
                    "ネットワーク接続はこのデータベース種別には使用できません".to_string(),
                ))
            }
        };

        // SSL設定やオプションを追加
        let mut connection_string = base;
        if let Some(ssl) = &self.ssl_config {
            if ssl.enabled {
                connection_string.push_str("?sslmode=require");
            }
        }

        Ok(connection_string)
    }
}

/// SSL/TLS設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SslConfig {
    /// SSL/TLS有効化
    pub enabled: bool,

    /// CA証明書パス
    pub ca_cert_path: Option<String>,

    /// クライアント証明書パス
    pub client_cert_path: Option<String>,

    /// クライアント秘密鍵パス
    pub client_key_path: Option<String>,

    /// サーバー証明書の検証を行うか
    pub verify_server_cert: bool,
}

impl Default for SslConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            verify_server_cert: true,
        }
    }
}

/// ファイルベース接続設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileConfig {
    /// ファイルパス
    pub file_path: String,

    /// 読み取り専用モード
    pub readonly: bool,
}

impl FileConfig {
    fn validate(&self) -> Result<(), ConnectionError> {
        if self.file_path.trim().is_empty() {
            return Err(ConnectionError::InvalidFilePath);
        }

        Ok(())
    }

    fn to_connection_string(&self) -> Result<String, ConnectionError> {
        let mut connection_string = format!("file:{}", self.file_path);

        if self.readonly {
            connection_string.push_str("?mode=ro");
        }

        Ok(connection_string)
    }
}

/// 環境設定（テーマ・色）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentConfig {
    /// 環境種別
    pub environment_type: EnvironmentType,

    /// カスタムテーマカラー（Vuetifyカラー名またはHEXコード）
    pub theme_color: Option<String>,

    /// テーマの明るさ
    pub theme_variant: ThemeVariant,
}

impl Default for EnvironmentConfig {
    fn default() -> Self {
        Self {
            environment_type: EnvironmentType::Development,
            theme_color: None,
            theme_variant: ThemeVariant::Light,
        }
    }
}

impl EnvironmentConfig {
    /// 環境に応じたデフォルトカラーを取得
    pub fn default_color(&self) -> &'static str {
        self.environment_type.default_color()
    }

    /// 実際に使用する色を取得（カスタム色 or デフォルト）
    pub fn effective_color(&self) -> String {
        self.theme_color
            .clone()
            .unwrap_or_else(|| self.default_color().to_string())
    }
}

/// 環境種別
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentType {
    Development,
    Staging,
    Testing,
    Production,
}

impl EnvironmentType {
    /// 環境のデフォルトカラーを取得
    pub fn default_color(&self) -> &'static str {
        match self {
            Self::Development => "blue",
            Self::Staging => "orange",
            Self::Testing => "purple",
            Self::Production => "red",
        }
    }

    /// 環境の表示名を取得
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Development => "開発環境",
            Self::Staging => "ステージング環境",
            Self::Testing => "テスト環境",
            Self::Production => "本番環境",
        }
    }

    /// 本番環境かチェック
    pub fn is_production(&self) -> bool {
        matches!(self, Self::Production)
    }
}

/// テーマの明るさ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeVariant {
    Light,
    Dark,
}

/// 接続情報のメタデータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionMetadata {
    /// 作成日時
    pub created_at: DateTime<Utc>,

    /// 最終更新日時
    pub updated_at: DateTime<Utc>,

    /// 最終接続日時
    pub last_connected_at: Option<DateTime<Utc>>,

    /// 接続回数
    pub connection_count: u64,

    /// タグ（分類・検索用）
    pub tags: Vec<String>,

    /// メモ
    pub note: Option<String>,

    /// お気に入りフラグ
    pub is_favorite: bool,
}

impl ConnectionMetadata {
    fn new() -> Self {
        let now = Utc::now();
        Self {
            created_at: now,
            updated_at: now,
            last_connected_at: None,
            connection_count: 0,
            tags: Vec::new(),
            note: None,
            is_favorite: false,
        }
    }

    /// 接続成功時に呼び出す
    pub fn record_connection(&mut self) {
        self.last_connected_at = Some(Utc::now());
        self.connection_count += 1;
    }

    /// 更新時刻を更新
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}
