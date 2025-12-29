# 設計書: クエリ実行基盤（Rust）

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Nuxt)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           query-builder.ts store                     │    │
│  │             executeQuery()                           │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │ invoke("execute_query", {...})
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Commands                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              execute_query                           │    │
│  │        commands/query.rs                             │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Query Executor Service                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           QueryExecutorService                       │    │
│  │     - ConnectionPool管理                             │    │
│  │     - Executor選択                                   │    │
│  │     - タイムアウト/キャンセル管理                      │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    QueryExecutor Trait                       │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │ PostgresExecutor│  MysqlExecutor  │ SqliteExecutor  │    │
│  │   (sqlx::Pg)    │   (sqlx::MySql) │  (sqlx::Sqlite) │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## データ構造

### QueryResult（実行結果）

```rust
/// クエリ実行結果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    /// カラム情報
    pub columns: Vec<QueryResultColumn>,
    /// 行データ
    pub rows: Vec<QueryResultRow>,
    /// 取得行数
    pub row_count: usize,
    /// 実行時間（ミリ秒）
    pub execution_time_ms: u64,
    /// 警告メッセージ（ある場合）
    pub warnings: Vec<String>,
}

/// カラム情報
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResultColumn {
    /// カラム名
    pub name: String,
    /// データ型
    pub data_type: String,
    /// NULL許容
    pub nullable: bool,
}

/// 行データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResultRow {
    /// 値の配列（カラム順）
    pub values: Vec<QueryValue>,
}

/// 値の型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum QueryValue {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    String(String),
    Bytes(Vec<u8>),
    // 日付・時刻は文字列でシリアライズ
}
```

### QueryExecuteRequest（実行リクエスト）

```rust
/// クエリ実行リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryExecuteRequest {
    /// 接続ID
    pub connection_id: String,
    /// 実行するSQL
    pub sql: String,
    /// タイムアウト（秒、オプション）
    pub timeout_seconds: Option<u32>,
}
```

### QueryError（エラー型）

```rust
/// クエリエラー
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryError {
    /// エラーコード
    pub code: QueryErrorCode,
    /// エラーメッセージ
    pub message: String,
    /// 詳細情報（SQL位置など）
    pub details: Option<QueryErrorDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryErrorCode {
    ConnectionFailed,
    QueryTimeout,
    QueryCancelled,
    SyntaxError,
    PermissionDenied,
    TableNotFound,
    ColumnNotFound,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryErrorDetails {
    /// エラー位置（行）
    pub line: Option<u32>,
    /// エラー位置（列）
    pub column: Option<u32>,
    /// エラー発生箇所のSQL
    pub sql_snippet: Option<String>,
}
```

## トレイト設計

### QueryExecutor トレイト

```rust
use async_trait::async_trait;

/// クエリ実行トレイト
#[async_trait]
pub trait QueryExecutor: Send + Sync {
    /// SQLを実行して結果を取得
    async fn execute(&self, sql: &str) -> Result<QueryResult, QueryError>;

    /// SQLを実行（タイムアウト付き）
    async fn execute_with_timeout(
        &self,
        sql: &str,
        timeout: Duration
    ) -> Result<QueryResult, QueryError>;

    /// 接続をクローズ
    async fn close(&self) -> Result<(), QueryError>;
}
```

### QueryExecutorFactory

```rust
/// Executorファクトリ
pub struct QueryExecutorFactory;

impl QueryExecutorFactory {
    pub async fn create(
        connection: &ConnectionInfo,
        password: Option<&str>
    ) -> Result<Box<dyn QueryExecutor>, QueryError> {
        match connection.database_type {
            DatabaseType::PostgreSQL => {
                Ok(Box::new(PostgresExecutor::new(connection, password).await?))
            }
            DatabaseType::MySQL => {
                Ok(Box::new(MysqlExecutor::new(connection, password).await?))
            }
            DatabaseType::SQLite => {
                Ok(Box::new(SqliteExecutor::new(connection).await?))
            }
        }
    }
}
```

## 接続プール管理

### ConnectionPoolManager

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// 接続プールマネージャー
pub struct ConnectionPoolManager {
    /// 接続ID -> Executor のマップ
    pools: RwLock<HashMap<String, Arc<dyn QueryExecutor>>>,
    /// アイドルタイムアウト
    idle_timeout: Duration,
}

impl ConnectionPoolManager {
    pub fn new() -> Self {
        Self {
            pools: RwLock::new(HashMap::new()),
            idle_timeout: Duration::from_secs(300), // 5分
        }
    }

    /// Executorを取得または作成
    pub async fn get_or_create(
        &self,
        connection_id: &str,
        connection: &ConnectionInfo,
        password: Option<&str>,
    ) -> Result<Arc<dyn QueryExecutor>, QueryError> {
        // 既存のプールをチェック
        {
            let pools = self.pools.read().await;
            if let Some(executor) = pools.get(connection_id) {
                return Ok(Arc::clone(executor));
            }
        }

        // 新規作成
        let executor = QueryExecutorFactory::create(connection, password).await?;
        let executor = Arc::new(executor);

        {
            let mut pools = self.pools.write().await;
            pools.insert(connection_id.to_string(), Arc::clone(&executor));
        }

        Ok(executor)
    }

    /// 接続を削除
    pub async fn remove(&self, connection_id: &str) {
        let mut pools = self.pools.write().await;
        if let Some(executor) = pools.remove(connection_id) {
            let _ = executor.close().await;
        }
    }
}
```

## キャンセル機能

### QueryCancellationToken

```rust
use tokio_util::sync::CancellationToken;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// クエリキャンセル管理
pub struct QueryCancellationManager {
    tokens: RwLock<HashMap<String, CancellationToken>>,
}

impl QueryCancellationManager {
    pub fn new() -> Self {
        Self {
            tokens: RwLock::new(HashMap::new()),
        }
    }

    /// 新しいキャンセルトークンを作成
    pub async fn create_token(&self) -> (String, CancellationToken) {
        let query_id = Uuid::new_v4().to_string();
        let token = CancellationToken::new();

        {
            let mut tokens = self.tokens.write().await;
            tokens.insert(query_id.clone(), token.clone());
        }

        (query_id, token)
    }

    /// クエリをキャンセル
    pub async fn cancel(&self, query_id: &str) -> bool {
        let tokens = self.tokens.read().await;
        if let Some(token) = tokens.get(query_id) {
            token.cancel();
            true
        } else {
            false
        }
    }

    /// トークンを削除
    pub async fn remove(&self, query_id: &str) {
        let mut tokens = self.tokens.write().await;
        tokens.remove(query_id);
    }
}
```

## Tauriコマンド

### execute_query コマンド

```rust
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
    let password = connection_service
        .get_password(&request.connection_id)
        .await
        .map_err(|e| e.to_string())?;

    // Executorを取得
    let executor = pool_manager
        .get_or_create(
            &request.connection_id,
            &connection,
            password.as_deref(),
        )
        .await
        .map_err(|e| e.message)?;

    // キャンセルトークンを作成
    let (query_id, cancel_token) = cancellation_manager.create_token().await;

    // タイムアウト設定
    let timeout = Duration::from_secs(
        request.timeout_seconds.unwrap_or(30) as u64
    );

    // クエリ実行
    let result = tokio::select! {
        result = executor.execute_with_timeout(&request.sql, timeout) => result,
        _ = cancel_token.cancelled() => {
            Err(QueryError {
                code: QueryErrorCode::QueryCancelled,
                message: "Query was cancelled".to_string(),
                details: None,
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
```

## PostgresExecutor 実装

```rust
use sqlx::postgres::PgPool;
use sqlx::{Column, Row, TypeInfo};

pub struct PostgresExecutor {
    pool: PgPool,
}

impl PostgresExecutor {
    pub async fn new(
        connection: &ConnectionInfo,
        password: Option<&str>
    ) -> Result<Self, QueryError> {
        let connection_string = connection
            .build_connection_string(password)
            .map_err(|e| QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("Failed to build connection string: {}", e),
                details: None,
            })?;

        let pool = PgPool::connect(&connection_string)
            .await
            .map_err(|e| QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("Failed to connect: {}", e),
                details: None,
            })?;

        Ok(Self { pool })
    }
}

#[async_trait]
impl QueryExecutor for PostgresExecutor {
    async fn execute(&self, sql: &str) -> Result<QueryResult, QueryError> {
        let start = std::time::Instant::now();

        let rows = sqlx::query(sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| Self::map_error(e))?;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        // カラム情報を取得
        let columns = if let Some(first_row) = rows.first() {
            first_row.columns()
                .iter()
                .map(|col| QueryResultColumn {
                    name: col.name().to_string(),
                    data_type: col.type_info().name().to_string(),
                    nullable: true, // PgRowからは取得困難なのでtrue
                })
                .collect()
        } else {
            vec![]
        };

        // 行データを変換
        let result_rows: Vec<QueryResultRow> = rows
            .iter()
            .map(|row| Self::convert_row(row, &columns))
            .collect();

        Ok(QueryResult {
            columns,
            rows: result_rows,
            row_count: rows.len(),
            execution_time_ms,
            warnings: vec![],
        })
    }

    async fn execute_with_timeout(
        &self,
        sql: &str,
        timeout: Duration,
    ) -> Result<QueryResult, QueryError> {
        tokio::time::timeout(timeout, self.execute(sql))
            .await
            .map_err(|_| QueryError {
                code: QueryErrorCode::QueryTimeout,
                message: format!("Query timed out after {:?}", timeout),
                details: None,
            })?
    }

    async fn close(&self) -> Result<(), QueryError> {
        self.pool.close().await;
        Ok(())
    }
}
```

## ファイル構成

```
src-tauri/src/
├── models/
│   ├── mod.rs              # query_result追加
│   ├── query.rs            # 既存
│   └── query_result.rs     # 新規: QueryResult, QueryError等
├── services/
│   ├── mod.rs              # query_executor追加
│   ├── database_inspector.rs
│   └── query_executor.rs   # 新規: トレイト, ファクトリ
├── database/
│   ├── mod.rs              # executor追加
│   ├── postgresql_inspector.rs
│   ├── postgresql_executor.rs  # 新規
│   ├── mysql_inspector.rs
│   ├── mysql_executor.rs       # 新規
│   ├── sqlite_inspector.rs
│   └── sqlite_executor.rs      # 新規
├── commands/
│   ├── query.rs            # execute_query, cancel_query追加
│   └── ...
└── lib.rs                  # マネージャー登録、コマンド登録
```

## テストコード

### ユニットテスト

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_result_serialization() {
        let result = QueryResult {
            columns: vec![
                QueryResultColumn {
                    name: "id".to_string(),
                    data_type: "INT4".to_string(),
                    nullable: false,
                },
            ],
            rows: vec![
                QueryResultRow {
                    values: vec![QueryValue::Int(1)],
                },
            ],
            row_count: 1,
            execution_time_ms: 10,
            warnings: vec![],
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"name\":\"id\""));
        assert!(json.contains("\"rowCount\":1"));
    }

    #[test]
    fn test_query_error_codes() {
        let error = QueryError {
            code: QueryErrorCode::SyntaxError,
            message: "Syntax error at line 1".to_string(),
            details: Some(QueryErrorDetails {
                line: Some(1),
                column: Some(10),
                sql_snippet: Some("SELEC * FROM".to_string()),
            }),
        };

        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("syntax_error"));
    }
}
```

### 統合テスト（実際のDB接続が必要）

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    // 注: 実際のDBが必要なため、CI環境では条件付き実行
    #[tokio::test]
    #[ignore = "requires database connection"]
    async fn test_postgres_executor_simple_query() {
        // テスト用の接続情報
        let connection = ConnectionInfo {
            // ... テスト用設定
        };

        let executor = PostgresExecutor::new(&connection, Some("password"))
            .await
            .unwrap();

        let result = executor.execute("SELECT 1 as num").await.unwrap();

        assert_eq!(result.row_count, 1);
        assert_eq!(result.columns.len(), 1);
        assert_eq!(result.columns[0].name, "num");
    }

    #[tokio::test]
    #[ignore = "requires database connection"]
    async fn test_query_timeout() {
        let connection = ConnectionInfo {
            // ... テスト用設定
        };

        let executor = PostgresExecutor::new(&connection, Some("password"))
            .await
            .unwrap();

        // pg_sleep(5)を1秒タイムアウトで実行
        let result = executor
            .execute_with_timeout(
                "SELECT pg_sleep(5)",
                Duration::from_secs(1)
            )
            .await;

        assert!(matches!(
            result,
            Err(QueryError { code: QueryErrorCode::QueryTimeout, .. })
        ));
    }
}
```

## 依存クレート

追加が必要なクレートはなし（既存のsqlx, tokio, serdeで対応可能）。

```toml
# Cargo.toml - 既存の依存関係で対応
[dependencies]
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "mysql", "sqlite"] }
tokio = { version = "1", features = ["full"] }
tokio-util = "0.7"  # CancellationToken用（新規追加）
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.0", features = ["v4"] }
```
