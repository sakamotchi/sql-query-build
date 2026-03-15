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

    /// SQL文をセミコロンで分割（簡易的な実装）
    /// TODO: 文字列リテラル内のセミコロンを考慮した高度な分割が必要な場合は改善
    fn split_sql_statements(sql: &str) -> Vec<String> {
        sql.split(';')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
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
                        "INT2" => row
                            .try_get::<i16, _>(i)
                            .ok()
                            .map(|v| QueryValue::Int(v as i64))
                            .unwrap_or(QueryValue::Null),
                        "INT4" => row
                            .try_get::<i32, _>(i)
                            .ok()
                            .map(|v| QueryValue::Int(v as i64))
                            .unwrap_or(QueryValue::Null),
                        "INT8" => row
                            .try_get::<i64, _>(i)
                            .ok()
                            .map(QueryValue::Int)
                            .unwrap_or(QueryValue::Null),
                        "FLOAT4" | "FLOAT8" => row
                            .try_get::<f64, _>(i)
                            .ok()
                            .map(QueryValue::Float)
                            .unwrap_or(QueryValue::Null),
                        "NUMERIC" => row
                            .try_get::<bigdecimal::BigDecimal, _>(i)
                            .ok()
                            .map(|v| QueryValue::String(v.to_string()))
                            .unwrap_or(QueryValue::Null),
                        "MONEY" => {
                            // MONEY はバイナリプロトコルで 8 バイト big-endian i64（1/100 通貨単位）
                            // try_get::<String> は失敗するため raw bytes からデコードする
                            if let Ok(bytes) = val.as_bytes() {
                                if bytes.len() == 8 {
                                    let cents = i64::from_be_bytes([
                                        bytes[0], bytes[1], bytes[2], bytes[3],
                                        bytes[4], bytes[5], bytes[6], bytes[7],
                                    ]);
                                    let is_negative = cents < 0;
                                    let abs_cents = cents.unsigned_abs();
                                    let dollars = abs_cents / 100;
                                    let remaining_cents = abs_cents % 100;
                                    let sign = if is_negative { "-" } else { "" };
                                    QueryValue::String(format!(
                                        "{}{}.{:02}",
                                        sign, dollars, remaining_cents
                                    ))
                                } else {
                                    QueryValue::Null
                                }
                            } else {
                                QueryValue::Null
                            }
                        }
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
                        "JSON" | "JSONB" => row
                            .try_get::<serde_json::Value, _>(i)
                            .ok()
                            .map(|v| QueryValue::String(v.to_string()))
                            .or_else(|| {
                                row.try_get::<String, _>(i).ok().map(QueryValue::String)
                            })
                            .unwrap_or(QueryValue::Null),
                        "INET" | "CIDR" => {
                            if let Ok(bytes) = val.as_bytes() {
                                if bytes.len() >= 8 && bytes[3] == 4 {
                                    // IPv4: [family, bits, is_cidr, nb=4, b0, b1, b2, b3]
                                    let addr = format!(
                                        "{}.{}.{}.{}",
                                        bytes[4], bytes[5], bytes[6], bytes[7]
                                    );
                                    let bits = bytes[1];
                                    let is_cidr_flag = bytes[2] != 0;
                                    if is_cidr_flag || bits < 32 {
                                        QueryValue::String(format!("{}/{}", addr, bits))
                                    } else {
                                        QueryValue::String(addr)
                                    }
                                } else if bytes.len() >= 20 && bytes[3] == 16 {
                                    // IPv6: [family, bits, is_cidr, nb=16, 16 addr bytes]
                                    let groups: Vec<String> = (0..8)
                                        .map(|j| {
                                            format!(
                                                "{:x}",
                                                u16::from_be_bytes([
                                                    bytes[4 + j * 2],
                                                    bytes[4 + j * 2 + 1]
                                                ])
                                            )
                                        })
                                        .collect();
                                    let addr = groups.join(":");
                                    let bits = bytes[1];
                                    let is_cidr_flag = bytes[2] != 0;
                                    if is_cidr_flag || bits < 128 {
                                        QueryValue::String(format!("{}/{}", addr, bits))
                                    } else {
                                        QueryValue::String(addr)
                                    }
                                } else {
                                    QueryValue::String("[inet]".to_string())
                                }
                            } else {
                                QueryValue::Null
                            }
                        }
                        "MACADDR" | "MACADDR8" => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or(QueryValue::Null),
                        "INTERVAL" => {
                            row.try_get::<sqlx::postgres::types::PgInterval, _>(i)
                                .ok()
                                .map(|v| {
                                    let mut parts: Vec<String> = Vec::new();
                                    if v.months != 0 {
                                        let years = v.months / 12;
                                        let months = v.months % 12;
                                        if years != 0 {
                                            parts.push(format!("{} years", years));
                                        }
                                        if months != 0 {
                                            parts.push(format!("{} months", months));
                                        }
                                    }
                                    if v.days != 0 {
                                        parts.push(format!("{} days", v.days));
                                    }
                                    if v.microseconds != 0 {
                                        let total_secs = v.microseconds / 1_000_000;
                                        let micros = v.microseconds.abs() % 1_000_000;
                                        let hours = total_secs / 3600;
                                        let mins = (total_secs % 3600) / 60;
                                        let secs = total_secs % 60;
                                        if micros != 0 {
                                            parts.push(format!(
                                                "{:02}:{:02}:{:02}.{:06}",
                                                hours, mins, secs, micros
                                            ));
                                        } else {
                                            parts.push(format!(
                                                "{:02}:{:02}:{:02}",
                                                hours, mins, secs
                                            ));
                                        }
                                    }
                                    QueryValue::String(if parts.is_empty() {
                                        "00:00:00".to_string()
                                    } else {
                                        parts.join(" ")
                                    })
                                })
                                .unwrap_or(QueryValue::Null)
                        }
                        "XML" | "BIT" | "VARBIT" | "TSVECTOR" | "TSQUERY" => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or(QueryValue::Null),
                        "OID" => {
                            if let Ok(bytes) = val.as_bytes() {
                                if bytes.len() == 4 {
                                    let v = u32::from_be_bytes([
                                        bytes[0], bytes[1], bytes[2], bytes[3],
                                    ]);
                                    QueryValue::Int(v as i64)
                                } else {
                                    QueryValue::Null
                                }
                            } else {
                                QueryValue::Null
                            }
                        }
                        "POINT" | "LINE" | "LSEG" | "BOX" | "PATH" | "POLYGON" | "CIRCLE" => row
                            .try_get::<String, _>(i)
                            .ok()
                            .map(QueryValue::String)
                            .unwrap_or_else(|| {
                                QueryValue::String("[geometry]".to_string())
                            }),
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

        // セミコロンで分割して複数のSQL文を順次実行
        // 最後の文の結果を返す（SET文などは結果を返さないため）
        let statements = Self::split_sql_statements(sql);

        let mut last_result = QueryResult {
            columns: vec![],
            rows: vec![],
            row_count: 0,
            execution_time_ms: 0,
            warnings: vec![],
        };

        for statement in statements.iter() {
            let trimmed = statement.trim();
            if trimmed.is_empty() {
                continue;
            }

            // SET文かどうかを判定
            let is_set_statement = trimmed.to_uppercase().starts_with("SET ");

            if is_set_statement {
                // SET文は結果を返さないため、executeで実行
                sqlx::query(trimmed)
                    .execute(&self.pool)
                    .await
                    .map_err(Self::map_error)?;
            } else {
                // SELECT文など、結果を返すクエリ
                let rows = sqlx::query(trimmed)
                    .fetch_all(&self.pool)
                    .await
                    .map_err(Self::map_error)?;

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
                    vec![]
                };

                // 行データを変換
                let result_rows: Vec<QueryResultRow> = rows
                    .iter()
                    .map(|row| Self::convert_row(row, &columns))
                    .collect();

                last_result = QueryResult {
                    columns,
                    rows: result_rows,
                    row_count: rows.len(),
                    execution_time_ms: 0, // 後で設定
                    warnings: vec![],
                };
            }
        }

        last_result.execution_time_ms = start.elapsed().as_millis() as u64;
        Ok(last_result)
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
