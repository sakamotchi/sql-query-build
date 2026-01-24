use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub connection_id: Option<String>,
    pub query: serde_json::Value, // QueryModel is complex, keeping as Value for storage simplicity or could import QueryModel if available
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQueryMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub connection_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryRequest {
    pub id: Option<String>, // If present, update existing
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub connection_id: Option<String>,
    pub query: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,
}
