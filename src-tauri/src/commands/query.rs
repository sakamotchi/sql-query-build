use crate::connection::{ConnectionConfig, ConnectionService, DatabaseType};
use crate::models::query::QueryModel;
use crate::models::query_result::{
    QueryError, QueryErrorCode, QueryExecuteRequest, QueryExecuteResponse,
};
use crate::services::query_executor::{ConnectionPoolManager, QueryCancellationManager};
use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};
use crate::sql_generator::{Dialect, SqlBuilder};
use std::time::Duration;
use tauri::{command, State};

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

/// クエリを実行
#[command]
pub async fn execute_query(
    request: QueryExecuteRequest,
    connection_service: State<'_, ConnectionService>,
    pool_manager: State<'_, ConnectionPoolManager>,
    cancellation_manager: State<'_, QueryCancellationManager>,
) -> Result<QueryExecuteResponse, String> {
    // 接続情報を取得
    let connection = connection_service
        .get_by_id(&request.connection_id, true)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection not found: {}", request.connection_id))?;

    // パスワードを取得
    let password = match &connection.connection {
        ConnectionConfig::Network(config) => config.encrypted_password.clone(),
        _ => None,
    };

    // Executorを取得
    let executor = pool_manager
        .get_or_create(&request.connection_id, &connection, password.as_deref())
        .await
        .map_err(|e| e.message)?;

    // キャンセルトークンを作成
    let (query_id, cancel_token) = cancellation_manager.create_token().await;

    // タイムアウト設定
    let timeout = Duration::from_secs(request.timeout_seconds.unwrap_or(30) as u64);

    // クエリ実行
    let result = tokio::select! {
        result = executor.execute_with_timeout(&request.sql, timeout) => result,
        _ = cancel_token.cancelled() => {
            Err(QueryError {
                code: QueryErrorCode::QueryCancelled,
                message: "Query was cancelled".to_string(),
                details: None,
                native_code: None,
            })
        }
    };

    // トークンをクリーンアップ
    cancellation_manager.remove(&query_id).await;

    match result {
        Ok(query_result) => Ok(QueryExecuteResponse {
            query_id,
            result: query_result,
        }),
        Err(e) => Err(serde_json::to_string(&e).unwrap_or(e.message)),
    }
}

/// クエリをキャンセル
#[command]
pub async fn cancel_query(
    query_id: String,
    cancellation_manager: State<'_, QueryCancellationManager>,
) -> Result<bool, String> {
    Ok(cancellation_manager.cancel(&query_id).await)
}
