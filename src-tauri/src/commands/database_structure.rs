use crate::connection::{ConnectionConfig, ConnectionService};
use crate::models::database_structure::*;
use crate::services::database_inspector::DatabaseInspectorFactory;
use serde::{Deserialize, Serialize};
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

/// データベース構造サマリーを取得（軽量）
#[tauri::command]
pub async fn get_database_structure_summary(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<DatabaseStructureSummary, String> {
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
    let schemas = inspector.get_table_summaries().await?;

    let database_name = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.database.clone(),
        ConnectionConfig::File(cfg) => cfg.file_path.clone(),
    };

    let database_type = match connection.database_type {
        crate::connection::DatabaseType::PostgreSQL => "postgresql",
        crate::connection::DatabaseType::MySQL => "mysql",
        crate::connection::DatabaseType::SQLite => "sqlite",
    }
    .to_string();

    Ok(DatabaseStructureSummary {
        connection_id,
        database_name,
        database_type,
        schemas,
        fetched_at: chrono::Utc::now().to_rfc3339(),
    })
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

/// テーブル存在チェック用のリクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableIdentifier {
    pub schema: String,
    pub table: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableValidationInfo {
    pub schema: String,
    pub table: String,
    pub exists: bool,
}

/// 複数テーブルの存在チェック
#[tauri::command]
pub async fn validate_query_tables(
    connection_id: String,
    tables: Vec<TableIdentifier>,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<TableValidationInfo>, String> {
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

    // すべてのスキーマとテーブルを取得
    let db_structure = inspector.get_database_structure().await?;

    // 各テーブルの存在をチェック
    let mut results = Vec::new();
    for table_id in tables {
        let exists = db_structure.schemas.iter().any(|schema| {
            schema.name == table_id.schema
                && schema.tables.iter().any(|t| t.name == table_id.table)
        });

        results.push(TableValidationInfo {
            schema: table_id.schema,
            table: table_id.table,
            exists,
        });
    }

    Ok(results)
}
