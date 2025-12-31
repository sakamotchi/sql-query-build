pub mod commands;
pub mod connection;
pub mod crypto;
pub mod database;
pub mod models;
pub mod services;
pub mod sql_generator;
pub mod storage;

use commands::query_history_commands::QueryHistoryState;
use connection::{ConnectionService, ConnectionStorage};
use crypto::{
    CredentialStorage, MasterKeyManager, ProviderSwitcher, SecurityConfigStorage,
    SecurityProviderManager,
};
use services::query_executor::{ConnectionPoolManager, QueryCancellationManager};
use services::query_storage::QueryStorage;
use services::WindowManager;
use std::sync::Arc;
use storage::{FileStorage, PathManager};
use tauri::State;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// ストレージにデータを書き込む
#[tauri::command]
async fn storage_write(
    key: String,
    data: serde_json::Value,
    storage: State<'_, FileStorage>,
) -> Result<(), String> {
    storage.write(&key, &data).map_err(|e| e.to_string())
}

/// ストレージからデータを読み込む
#[tauri::command]
async fn storage_read(
    key: String,
    storage: State<'_, FileStorage>,
) -> Result<serde_json::Value, String> {
    storage.read(&key).map_err(|e| e.to_string())
}

/// ストレージからデータを削除する
#[tauri::command]
async fn storage_delete(key: String, storage: State<'_, FileStorage>) -> Result<(), String> {
    storage.delete(&key).map_err(|e| e.to_string())
}

/// ストレージ内の全てのキーを取得する
#[tauri::command]
async fn storage_list_keys(storage: State<'_, FileStorage>) -> Result<Vec<String>, String> {
    storage.list_keys().map_err(|e| e.to_string())
}

/// データが存在するかチェック
#[tauri::command]
async fn storage_exists(key: String, storage: State<'_, FileStorage>) -> Result<bool, String> {
    Ok(storage.exists(&key))
}

// ===== マスターキー管理コマンド =====

/// マスターキーマネージャーの初期化チェック
#[tauri::command]
async fn is_master_key_initialized(manager: State<'_, MasterKeyManager>) -> Result<bool, String> {
    Ok(manager.is_initialized())
}

/// マスターキーを初期化
#[tauri::command]
async fn initialize_master_key(manager: State<'_, MasterKeyManager>) -> Result<(), String> {
    manager.initialize().await.map_err(|e| e.to_string())
}

/// マスターキーを削除（リセット）
#[tauri::command]
async fn delete_master_key(manager: State<'_, MasterKeyManager>) -> Result<(), String> {
    manager.delete_master_key().await.map_err(|e| e.to_string())
}

/// マスターキーを再生成
#[tauri::command]
async fn regenerate_master_key(manager: State<'_, MasterKeyManager>) -> Result<(), String> {
    manager.regenerate().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // PathManagerを初期化
    let path_manager = PathManager::new().expect("Failed to initialize PathManager");

    // 必要なディレクトリを初期化
    path_manager
        .initialize_directories()
        .expect("Failed to initialize directories");

    // FileStorageを初期化（接続情報用のストレージ）
    let data_storage = Arc::new(
        FileStorage::new(path_manager.data_dir()).expect("Failed to initialize FileStorage"),
    );
    let saved_queries_storage = Arc::new(
        FileStorage::new(path_manager.saved_queries_dir())
            .expect("Failed to initialize saved queries FileStorage"),
    );
    let file_storage_for_commands =
        FileStorage::new(path_manager.data_dir()).expect("Failed to initialize FileStorage");
    let security_storage = Arc::new(
        FileStorage::new(path_manager.settings_dir())
            .expect("Failed to initialize security FileStorage"),
    );

    // セキュリティプロバイダー設定ストレージとマネージャーを初期化
    let security_config_storage =
        Arc::new(SecurityConfigStorage::new(Arc::clone(&security_storage)));
    let security_provider_manager = Arc::new(
        tauri::async_runtime::block_on(SecurityProviderManager::new(
            Arc::clone(&security_config_storage),
            Arc::clone(&security_storage),
        ))
        .expect("Failed to initialize SecurityProviderManager"),
    );

    // CredentialStorageを初期化
    let credential_storage = Arc::new(CredentialStorage::new(
        Arc::clone(&data_storage),
        Arc::clone(&security_provider_manager),
    ));

    // ProviderSwitcherを初期化
    let provider_switcher = Arc::new(ProviderSwitcher::new(
        Arc::clone(&security_provider_manager),
        Arc::clone(&credential_storage),
        Arc::clone(&security_config_storage),
    ));

    // MasterKeyManagerを初期化
    let master_key_manager_service = Arc::new(MasterKeyManager::new());
    let master_key_manager_commands = MasterKeyManager::new();

    // ConnectionStorageを初期化
    let connection_storage = Arc::new(ConnectionStorage::new(Arc::clone(&data_storage)));

    // ConnectionServiceを初期化
    let connection_service = ConnectionService::new(
        Arc::clone(&connection_storage),
        Arc::clone(&credential_storage),
        Arc::clone(&master_key_manager_service),
    );

    // QueryExecutor関連のマネージャーを初期化
    let connection_pool_manager = ConnectionPoolManager::new();
    let query_cancellation_manager = QueryCancellationManager::new();

    // QueryStorageを初期化
    let query_storage = Arc::new(QueryStorage::new(Arc::clone(&saved_queries_storage)));

    // QueryHistoryStateを初期化
    let query_history_state = QueryHistoryState::default();
    // PathManagerをStateとして管理するために再作成（ProjectDirsがCloneできないため）
    let path_manager_managed = PathManager::new().expect("Failed to initialize PathManager");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WindowManager::new())
        .manage(file_storage_for_commands)
        .manage(master_key_manager_commands)
        .manage(connection_service)
        .manage(connection_pool_manager)
        .manage(query_cancellation_manager)
        .manage(query_storage)
        .manage(query_history_state)
        .manage(path_manager_managed)
        .manage(Arc::clone(&security_config_storage))
        .manage(security_provider_manager)
        .manage(Arc::clone(&provider_switcher))
        .invoke_handler(tauri::generate_handler![
            greet,
            storage_write,
            storage_read,
            storage_delete,
            storage_list_keys,
            storage_exists,
            is_master_key_initialized,
            initialize_master_key,
            delete_master_key,
            regenerate_master_key,
            connection::commands::get_connections,
            connection::commands::get_connection,
            connection::commands::create_connection,
            connection::commands::update_connection,
            connection::commands::delete_connection,
            connection::commands::mark_connection_used,
            connection::commands::test_connection,
            commands::database_structure::get_database_structure,
            commands::database_structure::get_schemas,
            commands::database_structure::get_tables,
            commands::database_structure::get_columns,
            commands::join_suggestions::get_join_suggestions,
            commands::query::generate_sql,
            commands::query::generate_sql_formatted,
            commands::query::execute_query,
            commands::query::cancel_query,
            commands::security::get_security_provider_info,
            commands::security::get_available_providers,
            commands::security::get_security_config,
            commands::security::change_security_provider,
            commands::security::initialize_master_password,
            commands::security::verify_master_password,
            commands::security::change_master_password,
            commands::security::unlock_with_master_password,
            commands::security::check_password_strength,
            commands::security::switch_security_provider,
            commands::security::reset_security_config,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::reset_settings,
            commands::settings::get_security_settings,
            commands::settings::set_security_provider,
            commands::settings::set_security_level,
            commands::window::get_window_environment,
            commands::window::open_query_builder_window,
            commands::window::open_settings_window,
            commands::window::close_window,
            commands::window::focus_window,
            commands::window::list_windows,
            commands::window::find_window_by_connection,
            commands::window::set_window_title,
            commands::window::get_current_window_info,
            commands::window::restore_windows,
            commands::window::save_all_window_states,
            commands::window::get_saved_window_states,
            commands::window::clear_window_states,
            commands::window::delete_window_state,
            commands::query_analyzer::analyze_query,
            commands::safety::get_safety_settings,
            commands::safety::update_environment_safety,
            commands::safety::reset_safety_settings,
            commands::query_storage_commands::save_query,
            commands::query_storage_commands::load_query,
            commands::query_storage_commands::delete_query,
            commands::query_storage_commands::list_saved_queries,
            commands::query_storage_commands::search_saved_queries,
            commands::query_history_commands::add_query_history,
            commands::query_history_commands::load_query_history,
            commands::query_history_commands::delete_query_history,
            commands::query_history_commands::list_query_histories,
            commands::query_history_commands::search_query_histories,
            commands::query_history_commands::clear_old_query_histories,
            commands::query_history_commands::clear_all_query_histories,
            commands::export_commands::export_query_result,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_returns_greeting_message() {
        let name = "World";
        let result = greet(name);
        assert_eq!(result, "Hello, World! You've been greeted from Rust!");
    }

    #[test]
    fn test_greet_with_empty_name() {
        let name = "";
        let result = greet(name);
        assert_eq!(result, "Hello, ! You've been greeted from Rust!");
    }

    #[test]
    fn test_greet_with_special_characters() {
        let name = "テスト";
        let result = greet(name);
        assert_eq!(result, "Hello, テスト! You've been greeted from Rust!");
    }
}
