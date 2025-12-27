use async_trait::async_trait;
use crate::models::database_structure::*;
use crate::connection::ConnectionInfo;

/// データベース構造取得のトレイト
#[async_trait]
pub trait DatabaseInspector: Send + Sync {
    /// スキーマ一覧を取得
    async fn get_schemas(&self) -> Result<Vec<Schema>, String>;

    /// テーブル一覧を取得
    async fn get_tables(&self, schema: &str) -> Result<Vec<Table>, String>;

    /// ビュー一覧を取得
    async fn get_views(&self, schema: &str) -> Result<Vec<View>, String>;

    /// カラム一覧を取得
    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<Column>, String>;

    /// インデックス一覧を取得
    async fn get_indexes(&self, schema: &str, table: &str) -> Result<Vec<Index>, String>;

    /// 外部キー一覧を取得
    async fn get_foreign_keys(&self, schema: &str, table: &str) -> Result<Vec<ForeignKey>, String>;

    /// 外部キー参照を取得
    async fn get_foreign_key_references(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ForeignKeyReference>, String>;

    /// データベース構造全体を取得
    async fn get_database_structure(&self) -> Result<DatabaseStructure, String>;
}

/// インスペクターファクトリ
pub struct DatabaseInspectorFactory;

impl DatabaseInspectorFactory {
    pub async fn create(connection: &ConnectionInfo, password: Option<&str>) -> Result<Box<dyn DatabaseInspector>, String> {
        match connection.database_type {
            crate::connection::DatabaseType::PostgreSQL => {
                use crate::database::postgresql_inspector::PostgresqlInspector;
                Ok(Box::new(PostgresqlInspector::new(connection, password).await?))
            }
            crate::connection::DatabaseType::MySQL => {
                use crate::database::mysql_inspector::MysqlInspector;
                Ok(Box::new(MysqlInspector::new(connection, password).await?))
            }
            crate::connection::DatabaseType::SQLite => {
                use crate::database::sqlite_inspector::SqliteInspector;
                Ok(Box::new(SqliteInspector::new(connection).await?))
            }
        }
    }
}
