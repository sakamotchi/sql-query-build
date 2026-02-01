use serde::{Deserialize, Serialize};

/// SQLエディタの実行履歴エントリ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String,
    pub execution_time_ms: u64,
    pub status: ExecutionStatus,
    pub row_count: Option<u64>,
    pub error_message: Option<String>,
}

/// 実行ステータス
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Success,
    Error,
}

/// 履歴追加リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSqlEditorHistoryRequest {
    pub connection_id: String,
    pub sql: String,
    pub status: ExecutionStatus,
    pub execution_time_ms: u64,
    pub row_count: Option<u64>,
    pub error_message: Option<String>,
}

/// 履歴検索リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSqlEditorHistoryRequest {
    pub connection_id: Option<String>,
    pub keyword: Option<String>,
    pub success_only: Option<bool>,
    pub limit: Option<usize>,
}
