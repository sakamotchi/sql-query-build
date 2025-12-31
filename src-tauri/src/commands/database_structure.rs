use crate::connection::{ConnectionConfig, ConnectionService};
use crate::models::database_structure::*;
use crate::services::database_inspector::DatabaseInspectorFactory;
use tauri::State;

/// データベース構造を取得
#[tauri::command]
pub async fn get_database_structure(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<DatabaseStructure, String> {
    // 接続情報を取得（パスワード含む）
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    // パスワードを抽出
    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    // インスペクターを作成
    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;

    // 構造を取得
    let mut structure = inspector.get_database_structure().await?;
    structure.connection_id = connection_id;

    Ok(structure)
}

/// スキーマ一覧のみ取得
#[tauri::command]
pub async fn get_schemas(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<Schema>, String> {
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    inspector.get_schemas().await
}

/// テーブル一覧のみ取得
#[tauri::command]
pub async fn get_tables(
    connection_id: String,
    schema: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<Table>, String> {
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    inspector.get_tables(&schema).await
}

/// カラム一覧のみ取得
#[tauri::command]
pub async fn get_columns(
    connection_id: String,
    schema: String,
    table: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<Column>, String> {
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    inspector.get_columns(&schema, &table).await
}
