use crate::connection::ConnectionInfo;
use crate::models::mutation_result::MutationResult;
use crate::models::query_result::{
    QueryError, QueryErrorCode, QueryErrorDetails, QueryResult, QueryResultColumn, QueryResultRow,
    QueryValue,
};
use crate::services::query_executor::QueryExecutor;
use async_trait::async_trait;
use sqlx::postgres::{PgPool, PgRow};
use sqlx::{Column, Row, TypeInfo, ValueRef};
use std::time::{Duration, Instant};

pub struct PostgresExecutor {
    pool: PgPool,
}

impl PostgresExecutor {
    pub async fn new(
        connection: &ConnectionInfo,
        password: Option<&str>,
    ) -> Result<Self, QueryError> {
        let connection_string =
            connection
                .build_connection_string(password)
                .map_err(|e| QueryError {
                    code: QueryErrorCode::ConnectionFailed,
                    message: format!("Failed to build connection string: {}", e),
                    details: None,
                    native_code: None,
                })?;

        let pool = PgPool::connect(&connection_string)
            .await
            .map_err(|e| QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("Failed to connect: {}", e),
                details: None,
                native_code: None,
            })?;

        Ok(Self { pool })
    }

    fn map_error(err: sqlx::Error) -> QueryError {
        match &err {
            sqlx::Error::Database(db_err) => {
                // PostgreSQL SQLSTATE コードでマッピング
                let code = db_err.code().map(|c| c.to_string());
                let (error_code, position) = Self::parse_pg_error(db_err.as_ref(), code.as_deref());

                QueryError {
                    code: error_code,
                    message: db_err.message().to_string(),
                    details: Some(QueryErrorDetails {
                        line: None, // 行番号はフロントエンドで計算するか、別途解析が必要
                        column: None,
                        sql_snippet: None,
                        position,
                        object_name: Self::extract_object_name(db_err.as_ref()),
                        context: db_err.constraint().map(|s| s.to_string()),
                    }),
                    native_code: code,
                }
            }
            sqlx::Error::RowNotFound => QueryError {
                code: QueryErrorCode::Unknown,
                message: "Row not found".to_string(),
                details: None,
                native_code: None,
            },
            sqlx::Error::TypeNotFound { type_name } => QueryError {
                code: QueryErrorCode::Unknown,
                message: format!("Type not found: {}", type_name),
                details: None,
                native_code: None,
            },
            sqlx::Error::ColumnNotFound(col) => QueryError {
                code: QueryErrorCode::ColumnNotFound,
                message: format!("Column not found: {}", col),
                details: Some(QueryErrorDetails {
                    object_name: Some(col.clone()),
                    line: None,
                    column: None,
                    sql_snippet: None,
                    position: None,
                    context: None,
                }),
                native_code: None,
            },
            sqlx::Error::Io(io_err) => QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("IO error: {}", io_err),
                details: None,
                native_code: None,
            },
            _ => QueryError {
                code: QueryErrorCode::Unknown,
                message: err.to_string(),
                details: None,
                native_code: None,
            },
        }
    }

    fn parse_pg_error(
        db_err: &dyn sqlx::error::DatabaseError,
        code: Option<&str>,
    ) -> (QueryErrorCode, Option<u32>) {
        let position = Self::extract_position(db_err.message());

        let error_code = match code {
            // Syntax Error Class (42xxx)
            Some(c) if c.starts_with("42601") => QueryErrorCode::SyntaxError,
            Some(c) if c.starts_with("42P01") => QueryErrorCode::TableNotFound,
            Some(c) if c.starts_with("42703") => QueryErrorCode::ColumnNotFound,
            Some(c) if c.starts_with("42501") => QueryErrorCode::PermissionDenied,
            Some(c) if c.starts_with("3D000") => QueryErrorCode::DatabaseNotFound,
            Some(c) if c.starts_with("3F000") => QueryErrorCode::SchemaNotFound,

            // Integrity Constraint Violation (23xxx)
            Some(c) if c.starts_with("23505") => QueryErrorCode::UniqueViolation,
            Some(c) if c.starts_with("23503") => QueryErrorCode::ForeignKeyViolation,
            Some(c) if c.starts_with("23514") => QueryErrorCode::CheckViolation,
            Some(c) if c.starts_with("23502") => QueryErrorCode::NotNullViolation,

            // Data Exception (22xxx)
            Some(c) if c.starts_with("22001") => QueryErrorCode::DataTruncation,
            Some(c) if c.starts_with("22012") => QueryErrorCode::DivisionByZero,
            Some(c) if c.starts_with("22P02") => QueryErrorCode::InvalidDataType,

            // Authentication (28xxx)
            Some(c) if c.starts_with("28") => QueryErrorCode::AuthenticationFailed,

            _ => QueryErrorCode::Unknown,
        };

        (error_code, position)
    }

    /// エラーメッセージから位置情報を抽出
    fn extract_position(message: &str) -> Option<u32> {
        // PostgreSQLは "at character N" という形式で位置を返すことがあるが、
        // sqlxのDatabaseErrorは別途offsetを持っている場合もある。
        // ここでは簡易的にメッセージ解析を行う。
        let pattern = "at character ";
        if let Some(pos) = message.find(pattern) {
            let start = pos + pattern.len();
            let end = message[start..]
                .find(|c: char| !c.is_ascii_digit())
                .unwrap_or(message.len() - start);
            message[start..start + end].parse().ok()
        } else {
            None
        }
    }

    /// エラーからオブジェクト名を抽出
    fn extract_object_name(_db_err: &dyn sqlx::error::DatabaseError) -> Option<String> {
        // テーブル名やカラム名をエラー詳細から取得
        // sqlx 0.7系では table(), column() などが利用可能か確認が必要
        // TODO: sqlxのAPI仕様を確認して実装
        None
    }

    fn convert_row(row: &PgRow, columns: &[QueryResultColumn]) -> QueryResultRow {
        let values = columns
            .iter()
            .enumerate()
            .map(|(i, _col)| {
                // sqlxのAnyRow/PgRowから汎用的に値を取得するのは少し工夫が必要
                // ここではtry_get_rawを使ってValueRefを取得し、そこから型判定する
                // または、column type infoを使って適切な型として取得する

                let raw_val = row.try_get_raw(i).ok();

                if let Some(val) = raw_val {
                    if val.is_null() {
                        return QueryValue::Null;
                    }

                    // 型情報に基づいて変換
                    // 注意: これは簡易的な実装です。厳密な型マッピングが必要な場合は拡張が必要です。
                    let type_info = val.type_info();
                    match type_info.name() {
                        "BOOL" => row
                            .try_get::<bool, _>(i)
                            .ok()
                            .map(QueryValue::Bool)
                            .unwrap_or(QueryValue::Null),
                        "INT2" | "INT4" | "INT8" => row
                            .try_get::<i64, _>(i)
                            .ok()
                            .map(QueryValue::Int)
                            .unwrap_or(QueryValue::Null),
                        "FLOAT4" | "FLOAT8" => row
                            .try_get::<f64, _>(i)
                            .ok()
                            .map(QueryValue::Float)
                            .unwrap_or(QueryValue::Null),
                        "TEXT" | "VARCHAR" | "CHAR" | "BPCHAR" | "NAME" => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or(QueryValue::Null),
                        "BYTEA" => row
                            .try_get::<Vec<u8>, _>(i)
                            .ok()
                            .map(QueryValue::Bytes)
                            .unwrap_or(QueryValue::Null),
                        "UUID" => row
                            .try_get::<uuid::Uuid, _>(i)
                            .ok()
                            .map(|u| QueryValue::String(u.to_string()))
                            .unwrap_or(QueryValue::Null),
                        "DATE" => row
                            .try_get::<chrono::NaiveDate, _>(i)
                            .ok()
                            .map(|d| QueryValue::String(d.to_string()))
                            .unwrap_or(QueryValue::Null),
                        "TIME" => row
                            .try_get::<chrono::NaiveTime, _>(i)
                            .ok()
                            .map(|t| QueryValue::String(t.to_string()))
                            .unwrap_or(QueryValue::Null),
                        "TIMESTAMP" => row
                            .try_get::<chrono::NaiveDateTime, _>(i)
                            .ok()
                            .map(|t| QueryValue::String(t.to_string()))
                            .unwrap_or(QueryValue::Null),
                        "TIMESTAMPTZ" => row
                            .try_get::<chrono::DateTime<chrono::Utc>, _>(i)
                            .ok()
                            .map(|t| QueryValue::String(t.to_string()))
                            .unwrap_or(QueryValue::Null),
                        _ => {
                            // 未対応の型は文字列として取得を試みる
                            row.try_get::<String, _>(i)
                                .ok()
                                .map(QueryValue::String)
                                .unwrap_or(QueryValue::Null)
                        }
                    }
                } else {
                    QueryValue::Null
                }
            })
            .collect();

        QueryResultRow { values }
    }
}

#[async_trait]
impl QueryExecutor for PostgresExecutor {
    async fn execute(&self, sql: &str) -> Result<QueryResult, QueryError> {
        let start = std::time::Instant::now();

        let rows = sqlx::query(sql)
            .fetch_all(&self.pool)
            .await
            .map_err(Self::map_error)?;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        // カラム情報を取得
        let columns = if let Some(first_row) = rows.first() {
            first_row
                .columns()
                .iter()
                .map(|col| QueryResultColumn {
                    name: col.name().to_string(),
                    data_type: col.type_info().name().to_string(),
                    nullable: true, // PgRowからは正確なnullable取得が難しいためtrue
                })
                .collect()
        } else {
            // 行がない場合、Describeを実行してカラム情報を取得するのが理想だが、
            // ここでは簡易的に空にする（またはsqlx::query(sql).describe()を使う必要がある）
            // 必要であれば後で実装追加
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

    async fn execute_mutation(&self, sql: &str) -> Result<MutationResult, QueryError> {
        let start = Instant::now();
        let result = sqlx::query(sql)
            .execute(&self.pool)
            .await
            .map_err(Self::map_error)?;

        Ok(MutationResult {
            affected_rows: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
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
                native_code: None,
            })?
    }

    async fn close(&self) -> Result<(), QueryError> {
        self.pool.close().await;
        Ok(())
    }
}
