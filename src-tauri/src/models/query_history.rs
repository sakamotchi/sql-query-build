use serde::{Deserialize, Serialize};

/// クエリ履歴
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistory {
    pub id: String,
    pub connection_id: String,
    pub query: serde_json::Value, // SerializableQueryStateを保存
    pub sql: String,
    pub executed_at: String, // ISO 8601形式
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// クエリ履歴のメタデータ（一覧表示用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryMetadata {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String,
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
}

impl From<&QueryHistory> for QueryHistoryMetadata {
    fn from(history: &QueryHistory) -> Self {
        QueryHistoryMetadata {
            id: history.id.clone(),
            connection_id: history.connection_id.clone(),
            sql: history.sql.clone(),
            executed_at: history.executed_at.clone(),
            success: history.success,
            result_count: history.result_count,
            execution_time_ms: history.execution_time_ms,
        }
    }
}

/// 履歴追加リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddHistoryRequest {
    pub connection_id: String,
    pub query: serde_json::Value,
    pub sql: String,
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// 履歴検索リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHistoryRequest {
    pub keyword: Option<String>,
    pub connection_id: Option<String>,
    pub success_only: Option<bool>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub limit: Option<usize>,
}

/// 履歴コレクション（ファイル保存用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryCollection {
    pub histories: Vec<QueryHistory>,
}
