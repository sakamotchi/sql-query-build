use tauri::{command, AppHandle, Manager, State, WebviewWindow};

use crate::connection::{ConnectionService, EnvironmentType};
use crate::models::window::{WindowCreateOptions, WindowInfo, WindowState, WindowType};
use crate::services::window_manager::WindowManager;

/// クエリビルダーウィンドウを開く
#[command]
pub async fn open_query_builder_window(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    connection_id: String,
    connection_name: String,
    environment: String,
) -> Result<WindowInfo, String> {
    let title = format!(
        "{} [{}] - SQL Query Builder",
        connection_name,
        get_environment_label(&environment)
    );

    let options = WindowCreateOptions {
        title,
        window_type: WindowType::QueryBuilder,
        connection_id: Some(connection_id),
        environment: Some(environment),
        width: Some(1400),
        height: Some(900),
        center: true,
        restore_state: true,
    };

    window_manager.create_window(&app_handle, options)
}

/// 設定ウィンドウを開く
#[command]
pub async fn open_settings_window(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
) -> Result<WindowInfo, String> {
    let options = WindowCreateOptions {
        title: "設定 - SQL Query Builder".to_string(),
        window_type: WindowType::Settings,
        connection_id: None,
        environment: None,
        width: Some(800),
        height: Some(600),
        center: true,
        restore_state: false,
    };

    window_manager.create_window(&app_handle, options)
}

/// ウィンドウを閉じる
#[command]
pub async fn close_window(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    label: String,
) -> Result<(), String> {
    window_manager.close_window(&app_handle, &label)
}

/// ウィンドウにフォーカス
#[command]
pub async fn focus_window(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    label: String,
) -> Result<(), String> {
    window_manager.focus_window(&app_handle, &label)
}

/// すべてのウィンドウを取得
#[command]
pub async fn list_windows(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
) -> Result<Vec<WindowInfo>, String> {
    Ok(window_manager.list_windows(&app_handle))
}

/// 接続IDでウィンドウを検索
#[command]
pub async fn find_window_by_connection(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    connection_id: String,
) -> Result<Option<WindowInfo>, String> {
    Ok(window_manager.find_window_by_connection(&app_handle, &connection_id))
}

/// ウィンドウタイトルを更新
#[command]
pub async fn set_window_title(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    label: String,
    title: String,
) -> Result<(), String> {
    window_manager.set_window_title(&app_handle, &label, &title)
}

/// 現在のウィンドウ情報を取得
#[command]
pub async fn get_current_window_info(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
    label: String,
) -> Result<Option<WindowInfo>, String> {
    let windows = window_manager.list_windows(&app_handle);
    Ok(windows.into_iter().find(|w| w.label == label))
}

/// ウィンドウ状態を復元
#[command]
pub async fn restore_windows(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
) -> Result<Vec<WindowInfo>, String> {
    window_manager.restore_windows(&app_handle)
}

/// すべてのウィンドウ状態を保存
#[command]
pub async fn save_all_window_states(
    app_handle: AppHandle,
    window_manager: State<'_, WindowManager>,
) -> Result<(), String> {
    window_manager.save_all_window_states(&app_handle)
}

/// 保存されたウィンドウ状態を取得
#[command]
pub async fn get_saved_window_states(
    window_manager: State<'_, WindowManager>,
) -> Result<Vec<WindowState>, String> {
    window_manager.get_saved_states()
}

/// 保存されたウィンドウ状態をクリア
#[command]
pub async fn clear_window_states(window_manager: State<'_, WindowManager>) -> Result<(), String> {
    window_manager.clear_saved_states()
}

/// 指定ウィンドウの状態を削除
#[command]
pub async fn delete_window_state(
    window_manager: State<'_, WindowManager>,
    label: String,
) -> Result<(), String> {
    window_manager.delete_window_state(&label)
}

/// 現在のウィンドウに紐づく環境名を取得
#[command]
pub async fn get_window_environment(
    window: WebviewWindow,
    window_manager: State<'_, WindowManager>,
    connection_service: State<'_, ConnectionService>,
) -> Result<String, String> {
    let label = window.label().to_string();
    let app_handle = window.app_handle();

    let connection_id = window_manager
        .list_windows(&app_handle)
        .into_iter()
        .find(|w| w.label == label)
        .and_then(|w| w.connection_id)
        .ok_or_else(|| "Connection not found".to_string())?;

    let connection = connection_service
        .get_by_id(&connection_id, false)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Connection not found".to_string())?;

    Ok(environment_type_key(connection.environment.environment_type).to_string())
}

/// 環境ラベルを取得
fn get_environment_label(environment: &str) -> &str {
    match environment {
        "development" => "開発環境",
        "test" => "テスト環境",
        "testing" => "テスト環境",
        "staging" => "ステージング",
        "production" => "本番環境",
        _ => environment,
    }
}

fn environment_type_key(env_type: EnvironmentType) -> &'static str {
    match env_type {
        EnvironmentType::Development => "development",
        EnvironmentType::Testing => "test",
        EnvironmentType::Staging => "staging",
        EnvironmentType::Production => "production",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_environment_label() {
        assert_eq!(get_environment_label("development"), "開発環境");
        assert_eq!(get_environment_label("test"), "テスト環境");
        assert_eq!(get_environment_label("testing"), "テスト環境");
        assert_eq!(get_environment_label("staging"), "ステージング");
        assert_eq!(get_environment_label("production"), "本番環境");
        assert_eq!(get_environment_label("unknown"), "unknown");
    }
}
