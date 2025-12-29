use serde::{Deserialize, Serialize};

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

/// クエリ実行レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryExecuteResponse {
    /// クエリID（キャンセルトークン用）
    pub query_id: String,
    /// 実行結果
    pub result: QueryResult,
}

/// クエリエラー
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryError {
    /// エラーコード
    pub code: QueryErrorCode,
    /// エラーメッセージ（DB由来のオリジナル）
    pub message: String,
    /// 詳細情報（SQL位置など）
    pub details: Option<QueryErrorDetails>,
    /// DBネイティブのエラーコード（PostgreSQL: SQLSTATE等）
    pub native_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryErrorCode {
    // 接続関連
    ConnectionFailed,
    ConnectionTimeout,
    AuthenticationFailed,

    // クエリ実行関連
    QueryTimeout,
    QueryCancelled,

    // SQL構文関連
    SyntaxError,

    // 権限関連
    PermissionDenied,

    // オブジェクト関連
    TableNotFound,
    ColumnNotFound,
    SchemaNotFound,
    DatabaseNotFound,

    // 制約関連
    UniqueViolation,
    ForeignKeyViolation,
    CheckViolation,
    NotNullViolation,

    // データ関連
    DataTruncation,
    DivisionByZero,
    InvalidDataType,

    // その他
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryErrorDetails {
    /// エラー位置（行番号、1始まり）
    pub line: Option<u32>,
    /// エラー位置（列番号、1始まり）
    pub column: Option<u32>,
    /// エラー発生箇所のSQL抜粋
    pub sql_snippet: Option<String>,
    /// エラー発生箇所の文字位置（SQL全体での位置）
    pub position: Option<u32>,
    /// 問題のあるオブジェクト名（テーブル名、カラム名等）
    pub object_name: Option<String>,
    /// 追加のコンテキスト情報
    pub context: Option<String>,
}
