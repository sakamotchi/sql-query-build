use serde::{Deserialize, Serialize};

/// SQLエディタ用の保存クエリ（完全版）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorQuery {
    pub id: String,
    pub connection_id: String,
    pub name: String,
    pub description: String,
    pub sql: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// SQLエディタ用の保存クエリメタデータ（一覧表示用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorQueryMetadata {
    pub id: String,
    pub connection_id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// SQLエディタ用のクエリ保存リクエスト
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSqlEditorQueryRequest {
    pub id: Option<String>,
    pub connection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub sql: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
}

/// SQLエディタ用の検索リクエスト
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSqlEditorQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,
}
