use crate::connection::ConnectionInfo;
use crate::models::query_result::{
    QueryError, QueryErrorCode, QueryResult, QueryResultColumn, QueryResultRow, QueryValue,
};
use crate::services::query_executor::QueryExecutor;
use async_trait::async_trait;
use sqlx::sqlite::{SqlitePool, SqliteRow};
use sqlx::{Column, Row, TypeInfo, ValueRef};
use std::time::Duration;

pub struct SqliteExecutor {
    pool: SqlitePool,
}

impl SqliteExecutor {
    pub async fn new(connection: &ConnectionInfo) -> Result<Self, QueryError> {
        // SQLite has no password
        let connection_string =
            connection
                .build_connection_string(None)
                .map_err(|e| QueryError {
                    code: QueryErrorCode::ConnectionFailed,
                    message: format!("Failed to build connection string: {}", e),
                    details: None,
                })?;

        let pool = SqlitePool::connect(&connection_string)
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

    fn convert_row(row: &SqliteRow, columns: &[QueryResultColumn]) -> QueryResultRow {
        let values = columns
            .iter()
            .enumerate()
            .map(|(i, _col)| {
                let raw_val = row.try_get_raw(i).ok();

                if let Some(val) = raw_val {
                    if val.is_null() {
                        return QueryValue::Null;
                    }

                    let type_info = val.type_info();
                    match type_info.name() {
                        "BOOLEAN" => row
                            .try_get::<bool, _>(i)
                            .ok()
                            .map(QueryValue::Bool)
                            .unwrap_or(QueryValue::Null),
                        "INTEGER" | "INT" | "BIGINT" => row
                            .try_get::<i64, _>(i)
                            .ok()
                            .map(QueryValue::Int)
                            .unwrap_or(QueryValue::Null),
                        "REAL" | "FLOAT" | "DOUBLE" => row
                            .try_get::<f64, _>(i)
                            .ok()
                            .map(QueryValue::Float)
                            .unwrap_or(QueryValue::Null),
                        "TEXT" | "VARCHAR" => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or(QueryValue::Null),
                        "BLOB" => row
                            .try_get::<Vec<u8>, _>(i)
                            .ok()
                            .map(QueryValue::Bytes)
                            .unwrap_or(QueryValue::Null),
                        _ => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or(QueryValue::Null),
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
impl QueryExecutor for SqliteExecutor {
    async fn execute(&self, sql: &str) -> Result<QueryResult, QueryError> {
        let start = std::time::Instant::now();

        let rows = sqlx::query(sql)
            .fetch_all(&self.pool)
            .await
            .map_err(Self::map_error)?;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        let columns = if let Some(first_row) = rows.first() {
            first_row
                .columns()
                .iter()
                .map(|col| QueryResultColumn {
                    name: col.name().to_string(),
                    data_type: col.type_info().name().to_string(),
                    nullable: true,
                })
                .collect()
        } else {
            vec![]
        };

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
