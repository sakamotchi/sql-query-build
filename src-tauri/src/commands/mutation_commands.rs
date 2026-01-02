use crate::connection::{ConnectionConfig, ConnectionService, DatabaseType};
use crate::models::mutation_result::{MutationExecuteRequest, MutationResult};
use crate::query::mutation::{generate_insert_sql as build_insert_sql, InsertQueryModel};
use crate::services::query_executor::ConnectionPoolManager;
use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};
use crate::sql_generator::Dialect;
use std::time::Duration;
use tauri::{command, State};

/// INSERT SQLを生成
#[command]
pub async fn generate_insert_sql(
    query: InsertQueryModel,
    connection_id: String,
    smart_quote: bool,
    connection_service: State<'_, ConnectionService>,
) -> Result<String, String> {
    let connection = connection_service
        .get_by_id(&connection_id, false)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let dialect: Box<dyn Dialect> = match connection.database_type {
        DatabaseType::PostgreSQL => Box::new(PostgresDialect),
        DatabaseType::MySQL => Box::new(MysqlDialect),
        DatabaseType::SQLite => Box::new(SqliteDialect),
    };

    build_insert_sql(&query, dialect.as_ref(), smart_quote)
}

/// INSERT/UPDATE/DELETEを実行
#[command]
pub async fn execute_mutation(
    request: MutationExecuteRequest,
    connection_service: State<'_, ConnectionService>,
    pool_manager: State<'_, ConnectionPoolManager>,
) -> Result<MutationResult, String> {
    let connection = connection_service
        .get_by_id(&request.connection_id, true)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection not found: {}", request.connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(config) => config.encrypted_password.clone(),
        _ => None,
    };

    let executor = pool_manager
        .get_or_create(&request.connection_id, &connection, password.as_deref())
        .await
        .map_err(|e| e.message)?;

    let timeout = Duration::from_secs(request.timeout_seconds.unwrap_or(30) as u64);

    match executor.execute_mutation_with_timeout(&request.sql, timeout).await {
        Ok(result) => Ok(result),
        Err(e) => Err(serde_json::to_string(&e).unwrap_or(e.message)),
    }
}
