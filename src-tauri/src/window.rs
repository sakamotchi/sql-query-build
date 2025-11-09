use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
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

    if parts.len() >= 3 {
        Ok(parts[2].to_string())
    } else {
        Err("Invalid window label format".to_string())
    }
}

/// クエリビルダー用ウィンドウを開く
#[tauri::command]
pub async fn open_query_builder_window(
    app: AppHandle,
    config: WindowConfig,
) -> Result<(), String> {
    let label = format!("window-{}-{}", config.connection_id, config.environment);

    if let Some(existing) = app.get_webview_window(&label) {
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(
            format!(
                "query-builder?connectionId={}&environment={}",
                config.connection_id,
                config.environment
            )
            .into(),
        ),
    )
    .title(format!("{} - SQLエディタ", config.connection_name))
    .inner_size(1280.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
