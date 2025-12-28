use tauri::{command, State};
use crate::models::query::QueryModel;
use crate::sql_generator::{SqlBuilder, Dialect};
use crate::sql_generator::dialects::{PostgresDialect, MysqlDialect, SqliteDialect};
use crate::connection::{ConnectionService, DatabaseType};

/// SQLを生成
#[command]
pub async fn generate_sql(
    query: QueryModel,
    connection_service: State<'_, ConnectionService>,
) -> Result<String, String> {
    // 接続情報から方言を取得
    let connection = connection_service
        .get_by_id(&query.connection_id, false)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection not found: {}", query.connection_id))?;

    let dialect: Box<dyn Dialect> = match connection.database_type {
        DatabaseType::PostgreSQL => Box::new(PostgresDialect),
        DatabaseType::MySQL => Box::new(MysqlDialect),
        DatabaseType::SQLite => Box::new(SqliteDialect),
    };

    let builder = SqlBuilder::new(dialect.as_ref());
    builder.build(&query)
}

/// SQLを生成（フォーマット指定）
#[command]
pub async fn generate_sql_formatted(
    query: QueryModel,
    pretty: bool,
    smart_quote: bool,
    connection_service: State<'_, ConnectionService>,
) -> Result<String, String> {
    let connection = connection_service
        .get_by_id(&query.connection_id, false)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection not found: {}", query.connection_id))?;

    let dialect: Box<dyn Dialect> = match connection.database_type {
        DatabaseType::PostgreSQL => Box::new(PostgresDialect),
        DatabaseType::MySQL => Box::new(MysqlDialect),
        DatabaseType::SQLite => Box::new(SqliteDialect),
    };

    let mut builder = SqlBuilder::new(dialect.as_ref());
    if !pretty {
        builder = builder.compact();
    }
    builder = builder.smart_quote(smart_quote);

    builder.build(&query)
}
