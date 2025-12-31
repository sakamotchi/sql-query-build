use std::collections::HashMap;
use tauri::State;

use crate::{
    connection::{ConnectionConfig, ConnectionService, DatabaseType},
    models::{database_structure::Column, join_suggestion::JoinSuggestion},
    services::{
        database_inspector::DatabaseInspectorFactory, join_suggestion_engine::JoinSuggestionEngine,
    },
};

/// JOIN提案を取得するTauriコマンド
#[tauri::command]
pub async fn get_join_suggestions(
    connection_id: String,
    from_table: String,
    to_table: String,
    schema: Option<String>,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<JoinSuggestion>, String> {
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

    // 外部キー情報は取得失敗時も継続する（カラム名ベース提案用）
    let foreign_keys = match inspector.get_all_foreign_keys(schema.as_deref()).await {
        Ok(keys) => keys,
        Err(err) => {
            eprintln!("Failed to fetch foreign keys: {}", err);
            Vec::new()
        }
    };

    let schema_name = match schema {
        Some(s) => s,
        None => match connection.database_type {
            DatabaseType::PostgreSQL => "public".to_string(),
            DatabaseType::MySQL => match &connection.connection {
                ConnectionConfig::Network(cfg) => cfg.database.clone(),
                _ => return Err("Schema is required for MySQL connection".to_string()),
            },
            DatabaseType::SQLite => "main".to_string(),
        },
    };

    // 提案に必要なテーブルのカラムのみ取得
    let mut table_columns: HashMap<String, Vec<Column>> = HashMap::new();
    for table_name in [&from_table, &to_table] {
        let columns = inspector
            .get_columns(&schema_name, table_name.as_str())
            .await?;
        table_columns.insert(table_name.clone(), columns);
    }

    let engine = JoinSuggestionEngine::new(foreign_keys, table_columns);
    Ok(engine.suggest_joins(&from_table, &to_table))
}
