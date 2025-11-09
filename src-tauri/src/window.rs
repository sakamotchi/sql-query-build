use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub connection_id: String,
    pub environment: String,
    pub connection_name: String,
}

/// ウィンドウラベルから環境名を取得
#[tauri::command]
pub fn get_window_environment(window: WebviewWindow) -> Result<String, String> {
    let label = window.label();
    let parts: Vec<&str> = label.split('-').collect();

    parts
        .last()
        .map(|env| env.to_string())
        .ok_or_else(|| "Invalid window label format".to_string())
}

/// クエリビルダー用ウィンドウを開く
#[tauri::command]
pub async fn open_query_builder_window(
    app: AppHandle,
    config: WindowConfig,
) -> Result<(), String> {
    let label = format!("window-{}-{}", config.connection_id, config.environment);

    if let Some(existing_window) = app.get_webview_window(&label) {
        existing_window
            .set_focus()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(
            format!(
                "query-builder?connectionId={}&environment={}&connectionName={}",
                config.connection_id,
                config.environment,
                urlencoding::encode(&config.connection_name)
            )
            .into(),
        ),
    )
    .title(&format!("{} - SQLエディタ", config.connection_name))
    .inner_size(1280.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
