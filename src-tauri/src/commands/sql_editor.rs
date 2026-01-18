use crate::models::sql_editor_query::{
    SaveSqlEditorQueryRequest, SearchSqlEditorQueryRequest, SqlEditorQuery,
    SqlEditorQueryMetadata,
};
use crate::models::sql_editor_history::{
    AddSqlEditorHistoryRequest, SearchSqlEditorHistoryRequest, SqlEditorHistoryEntry,
};
use crate::services::sql_editor_history::SqlEditorHistoryService;
use crate::services::sql_editor_query_storage::SqlEditorQueryStorage;
use crate::storage::path_manager::PathManager;
use std::sync::Arc;
use tauri::State;

fn validate_query_id(id: &str) -> Result<(), String> {
    if id.contains("..") || id.contains('/') || id.contains('\\') {
        return Err("不正なクエリIDです".to_string());
    }

    if id.is_empty() || id.len() > 100 {
        return Err("クエリIDは1〜100文字である必要があります".to_string());
    }

    if !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("クエリIDに不正な文字が含まれています".to_string());
    }

    Ok(())
}

fn validate_save_request(request: &SaveSqlEditorQueryRequest) -> Result<(), String> {
    if request.name.trim().is_empty() {
        return Err("クエリ名は必須です".to_string());
    }
    if request.name.len() > 100 {
        return Err("クエリ名は100文字以内で入力してください".to_string());
    }

    if let Some(description) = &request.description {
        if description.len() > 500 {
            return Err("説明は500文字以内で入力してください".to_string());
        }
    }

    if request.connection_id.trim().is_empty() {
        return Err("接続IDが指定されていません".to_string());
    }

    if request.sql.trim().is_empty() {
        return Err("SQLが空です".to_string());
    }

    if let Some(ref id) = request.id {
        validate_query_id(id)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn save_sql_query(
    request: SaveSqlEditorQueryRequest,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<SqlEditorQuery, String> {
    validate_save_request(&request)?;

    let query = SqlEditorQuery {
        id: request.id.unwrap_or_default(),
        connection_id: request.connection_id,
        name: request.name,
        description: request.description.unwrap_or_default(),
        sql: request.sql,
        tags: request.tags,
        created_at: String::new(),
        updated_at: String::new(),
    };

    storage.save_query(query)
}

#[tauri::command]
pub async fn load_sql_query(
    id: String,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<SqlEditorQuery, String> {
    validate_query_id(&id)?;
    storage.load_query(&id)
}

#[tauri::command]
pub async fn list_sql_queries(
    connection_id: Option<String>,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<Vec<SqlEditorQueryMetadata>, String> {
    let mut queries = storage.list_queries()?;

    if let Some(connection_id) = connection_id {
        queries.retain(|q| q.connection_id == connection_id);
    }

    Ok(queries)
}

#[tauri::command]
pub async fn search_sql_queries(
    request: SearchSqlEditorQueryRequest,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<Vec<SqlEditorQueryMetadata>, String> {
    storage.search_queries(request)
}

#[tauri::command]
pub async fn delete_sql_query(
    id: String,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<(), String> {
    validate_query_id(&id)?;
    storage.delete_query(&id)
}

#[tauri::command]
pub async fn add_sql_editor_history(
    request: AddSqlEditorHistoryRequest,
    path_manager: State<'_, PathManager>,
) -> Result<SqlEditorHistoryEntry, String> {
    let service = SqlEditorHistoryService::new(&path_manager)?;
    service.add_history(request)
}

#[tauri::command]
pub async fn get_sql_editor_histories(
    request: SearchSqlEditorHistoryRequest,
    path_manager: State<'_, PathManager>,
) -> Result<Vec<SqlEditorHistoryEntry>, String> {
    let service = SqlEditorHistoryService::new(&path_manager)?;
    service.get_histories(request)
}

#[tauri::command]
pub async fn delete_sql_editor_history(
    connection_id: String,
    id: String,
    path_manager: State<'_, PathManager>,
) -> Result<(), String> {
    let service = SqlEditorHistoryService::new(&path_manager)?;
    service.delete_history(&connection_id, &id)
}
