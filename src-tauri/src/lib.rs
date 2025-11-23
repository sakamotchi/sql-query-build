pub mod crypto;
pub mod storage;
pub mod connection;
pub mod commands;
pub mod models;
pub mod services;

use crypto::MasterKeyManager;
use storage::{FileStorage, PathManager};
use connection::{ConnectionStorage, ConnectionService};
use services::WindowManager;
use tauri::State;
use std::sync::Arc;

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
    storage
        .write(&key, &data)
        .map_err(|e| e.to_string())
}

/// ストレージからデータを読み込む
#[tauri::command]
async fn storage_read(
    key: String,
    storage: State<'_, FileStorage>,
) -> Result<serde_json::Value, String> {
    storage
        .read(&key)
        .map_err(|e| e.to_string())
}

/// ストレージからデータを削除する
#[tauri::command]
async fn storage_delete(
    key: String,
    storage: State<'_, FileStorage>,
) -> Result<(), String> {
    storage
        .delete(&key)
        .map_err(|e| e.to_string())
}

/// ストレージ内の全てのキーを取得する
#[tauri::command]
async fn storage_list_keys(
    storage: State<'_, FileStorage>,
) -> Result<Vec<String>, String> {
    storage
        .list_keys()
        .map_err(|e| e.to_string())
}

/// データが存在するかチェック
#[tauri::command]
async fn storage_exists(
    key: String,
    storage: State<'_, FileStorage>,
) -> Result<bool, String> {
    Ok(storage.exists(&key))
}

// ===== マスターキー管理コマンド =====

/// マスターキーマネージャーの初期化チェック
#[tauri::command]
async fn is_master_key_initialized(
    manager: State<'_, MasterKeyManager>,
) -> Result<bool, String> {
    Ok(manager.is_initialized())
}

/// マスターキーを初期化
#[tauri::command]
async fn initialize_master_key(
    manager: State<'_, MasterKeyManager>,
) -> Result<(), String> {
    manager
        .initialize()
        .await
        .map_err(|e| e.to_string())
}

/// マスターキーを削除（リセット）
#[tauri::command]
async fn delete_master_key(
    manager: State<'_, MasterKeyManager>,
) -> Result<(), String> {
    manager
        .delete_master_key()
        .await
        .map_err(|e| e.to_string())
}

/// マスターキーを再生成
#[tauri::command]
async fn regenerate_master_key(
    manager: State<'_, MasterKeyManager>,
) -> Result<(), String> {
    manager
        .regenerate()
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // PathManagerを初期化
    let path_manager = PathManager::new()
        .expect("Failed to initialize PathManager");

    // 必要なディレクトリを初期化
    path_manager.initialize_directories()
        .expect("Failed to initialize directories");

    // FileStorageを初期化（接続情報用のストレージ）
    let file_storage_1 = FileStorage::new(path_manager.data_dir())
        .expect("Failed to initialize FileStorage");
    let file_storage_2 = FileStorage::new(path_manager.data_dir())
        .expect("Failed to initialize FileStorage");

    // MasterKeyManagerを初期化
    let master_key_manager_1 = MasterKeyManager::new();
    let master_key_manager_2 = MasterKeyManager::new();

    // ConnectionStorageを初期化
    let connection_storage = Arc::new(ConnectionStorage::new(Arc::new(file_storage_1)));

    // ConnectionServiceを初期化
    let connection_service = ConnectionService::new(
        Arc::clone(&connection_storage),
        Arc::new(master_key_manager_1)
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WindowManager::new())
        .manage(file_storage_2)
        .manage(master_key_manager_2)
        .manage(connection_service)
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
