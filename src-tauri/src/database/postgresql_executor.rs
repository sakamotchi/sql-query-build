use crate::connection::ConnectionInfo;
use crate::models::query_result::{
    QueryError, QueryErrorCode, QueryResult, QueryResultColumn, QueryResultRow, QueryValue,
};
use crate::services::query_executor::QueryExecutor;
use async_trait::async_trait;
use sqlx::postgres::{PgPool, PgRow};
use sqlx::{Column, Row, TypeInfo, ValueRef};
use std::time::Duration;

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

    fn map_error(err: sqlx::Error) -> QueryError {
        match err {
            sqlx::Error::RowNotFound => QueryError {
                code: QueryErrorCode::Unknown,
                message: "Row not found".to_string(),
                details: None,
            },
            sqlx::Error::TypeNotFound { type_name } => QueryError {
                code: QueryErrorCode::Unknown,
                message: format!("Type not found: {}", type_name),
                details: None,
            },
            sqlx::Error::ColumnNotFound(col) => QueryError {
                code: QueryErrorCode::ColumnNotFound,
                message: format!("Column not found: {}", col),
                details: None,
            },
            sqlx::Error::Database(db_err) => QueryError {
                code: QueryErrorCode::Unknown,
                message: db_err.message().to_string(),
                details: None,
            },
            _ => QueryError {
                code: QueryErrorCode::Unknown,
                message: err.to_string(),
                details: None,
            },
        }
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
                        // 日付型などもStringとして扱う
                        "DATE" | "TIME" | "TIMESTAMP" | "TIMESTAMPTZ" => {
                            // sqlx::types::time系が必要だが、単純にStringキャストを試みる
                            // あるいはDisplay実装に頼る
                            // ここでは簡易的に文字列として取得（実装依存）
                            // sqlxで文字列として取得できない場合はエラーになるため、一旦単純なString取得を試みる
                            row.try_get::<String, _>(i)
                                .ok()
                                .map(QueryValue::String)
                                .unwrap_or_else(|| {
                                    // 文字列取得できない場合はデバッグ表示などを返すかNullにする
                                    QueryValue::String(format!("{:?}", val.as_str().unwrap_or("?")))
                                })
                        }
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
