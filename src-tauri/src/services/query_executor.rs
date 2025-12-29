use crate::connection::ConnectionInfo;
use crate::connection::DatabaseType;
use crate::models::query_result::{QueryError, QueryErrorCode, QueryResult};
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

use crate::database::{MysqlExecutor, PostgresExecutor, SqliteExecutor};

/// クエリ実行トレイト
#[async_trait]
pub trait QueryExecutor: Send + Sync {
    /// SQLを実行して結果を取得
    async fn execute(&self, sql: &str) -> Result<QueryResult, QueryError>;

    /// SQLを実行（タイムアウト付き）
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
                native_code: None,
            })?
    }

    /// 接続をクローズ
    async fn close(&self) -> Result<(), QueryError>;
}

/// Executorファクトリ
pub struct QueryExecutorFactory;

impl QueryExecutorFactory {
    pub async fn create(
        connection: &ConnectionInfo,
        password: Option<&str>,
    ) -> Result<Box<dyn QueryExecutor>, QueryError> {
        match connection.database_type {
            DatabaseType::PostgreSQL => {
                Ok(Box::new(PostgresExecutor::new(connection, password).await?))
            }
            DatabaseType::MySQL => Ok(Box::new(MysqlExecutor::new(connection, password).await?)),
            DatabaseType::SQLite => Ok(Box::new(SqliteExecutor::new(connection).await?)),
        }
    }
}

/// 接続プールマネージャー
pub struct ConnectionPoolManager {
    /// 接続ID -> Executor のマップ
    pools: RwLock<HashMap<String, Arc<dyn QueryExecutor>>>,
    // idle_timeout: Duration, // 将来的に使用
}

impl ConnectionPoolManager {
    pub fn new() -> Self {
        Self {
            pools: RwLock::new(HashMap::new()),
            // idle_timeout: Duration::from_secs(300),
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
        let executor: Arc<dyn QueryExecutor> = Arc::from(executor);

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
