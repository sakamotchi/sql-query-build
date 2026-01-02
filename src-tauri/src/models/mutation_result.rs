use serde::{Deserialize, Serialize};

/// データ変更クエリ実行結果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationResult {
    pub affected_rows: u64,
    pub execution_time_ms: u64,
}

/// データ変更クエリ実行リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationExecuteRequest {
    pub connection_id: String,
    pub sql: String,
    pub timeout_seconds: Option<u32>,
}
