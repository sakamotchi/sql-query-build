use crate::models::saved_query::{
    SaveQueryRequest, SavedQuery, SavedQueryMetadata, SearchQueryRequest,
};
use crate::services::query_storage::QueryStorage;
use crate::utils::folder_validation::validate_folder_path;
use std::sync::Arc;
use tauri::State;

/// クエリIDのバリデーション
fn validate_query_id(id: &str) -> Result<(), String> {
    // パストラバーサル攻撃対策
    if id.contains("..") || id.contains("/") || id.contains("\\") {
        return Err("不正なクエリIDです".to_string());
    }

    // 長さチェック
    if id.is_empty() || id.len() > 100 {
        return Err("クエリIDは1〜100文字である必要があります".to_string());
    }

    // 許可された文字のみ（UUID形式）
    if !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("クエリIDに不正な文字が含まれています".to_string());
    }

    Ok(())
}

/// 保存リクエストのバリデーション
fn validate_save_request(request: &SaveQueryRequest) -> Result<(), String> {
    // クエリ名のチェック
    if request.name.is_empty() {
        return Err("クエリ名は必須です".to_string());
    }
    if request.name.len() > 200 {
        return Err("クエリ名は200文字以内で入力してください".to_string());
    }

    // 説明文のチェック
    if request.description.len() > 1000 {
        return Err("説明は1000文字以内で入力してください".to_string());
    }

    // タグのチェック
    if request.tags.len() > 20 {
        return Err("タグは20個までです".to_string());
    }
    for tag in &request.tags {
        if tag.len() > 50 {
            return Err("各タグは50文字以内で入力してください".to_string());
        }
    }

    // 接続IDのチェック
    if let Some(connection_id) = &request.connection_id {
        if connection_id.is_empty() {
            return Err("接続IDが指定されていません".to_string());
        }
    }

    // フォルダパスのチェック
    validate_folder_path(&request.folder_path)?;

    // IDが指定されている場合はバリデーション
    if let Some(ref id) = request.id {
        validate_query_id(id)?;
    }

    Ok(())
}

/// クエリを保存する
#[tauri::command]
pub async fn save_query(
    request: SaveQueryRequest,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<SavedQuery, String> {
    // バリデーション
    validate_save_request(&request)?;
    let query = SavedQuery {
        id: request.id.unwrap_or_default(),
        name: request.name,
        description: request.description,
        tags: request.tags,
        folder_path: request.folder_path,
        connection_id: request.connection_id,
        query: request.query,
        created_at: String::new(), // Service will set if empty
        updated_at: String::new(), // Service will set
    };

    storage.save_query(query)
}

/// クエリを読み込む
#[tauri::command]
pub async fn load_query(
    id: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<SavedQuery, String> {
    // IDバリデーション
    validate_query_id(&id)?;
    storage.load_query(&id)
}

/// クエリを削除する
#[tauri::command]
pub async fn delete_query(id: String, storage: State<'_, Arc<QueryStorage>>) -> Result<(), String> {
    // IDバリデーション
    validate_query_id(&id)?;
    storage.delete_query(&id)
}

/// 保存済みクエリの一覧を取得する
#[tauri::command]
pub async fn list_saved_queries(
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<Vec<SavedQueryMetadata>, String> {
    storage.list_queries()
}

/// フォルダ一覧を取得する
#[tauri::command]
pub async fn list_folders(
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<Vec<String>, String> {
    storage.list_folders()
}

/// クエリを指定フォルダに移動する
#[tauri::command]
pub async fn move_query(
    query_id: String,
    folder_path: Option<String>,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_query_id(&query_id)?;
    validate_folder_path(&folder_path)?;
    storage.move_query(&query_id, folder_path)
}

/// フォルダ名を変更する（配下のクエリも更新）
#[tauri::command]
pub async fn rename_folder(
    old_path: String,
    new_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_folder_path(&Some(old_path.clone()))?;
    validate_folder_path(&Some(new_path.clone()))?;

    let existing_folders = storage.list_folders()?;
    if existing_folders.contains(&new_path) && old_path != new_path {
        return Err(format!("フォルダが既に存在します: {}", new_path));
    }

    storage.rename_folder(&old_path, &new_path)
}

/// フォルダを削除する（空のフォルダのみ）
#[tauri::command]
pub async fn delete_folder(
    folder_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_folder_path(&Some(folder_path.clone()))?;
    storage.delete_folder(&folder_path)
}

/// クエリを検索する
#[tauri::command]
pub async fn search_saved_queries(
    request: SearchQueryRequest,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<Vec<SavedQueryMetadata>, String> {
    storage.search_queries(request)
}
