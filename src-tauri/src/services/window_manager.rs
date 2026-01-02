use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use crate::models::window::{WindowCreateOptions, WindowInfo, WindowState, WindowType};
use crate::storage::window_state::WindowStateStorage;

/// ウィンドウ管理サービス
pub struct WindowManager {
    /// アクティブなウィンドウの状態
    windows: Mutex<HashMap<String, WindowState>>,
    /// ウィンドウ状態ストレージ
    storage: WindowStateStorage,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
            storage: WindowStateStorage::new(),
        }
    }

    /// 新しいウィンドウを作成
    pub fn create_window(
        &self,
        app_handle: &AppHandle,
        options: WindowCreateOptions,
    ) -> Result<WindowInfo, String> {
        let label = self.generate_window_label(&options.window_type, &options.connection_id);
        let environment = options.environment.clone();

        // 同じ接続のウィンドウが既に存在するかチェック
        if let Some(connection_id) = &options.connection_id {
            if let Some(existing) =
                self.find_window_by_connection(app_handle, connection_id, Some(&options.window_type))
            {
                // 既存のウィンドウにフォーカス
                if let Some(window) = app_handle.get_webview_window(&existing.label) {
                    let _ = window.set_focus();
                }
                return Ok(existing);
            }
        }

        // 以前の状態を復元
        let saved_state = if options.restore_state {
            self.storage.load_state(&label).ok()
        } else {
            None
        };

        // ウィンドウサイズと位置の決定
        let (width, height) = saved_state
            .as_ref()
            .map(|s| self.normalize_size(app_handle, s.width, s.height))
            .unwrap_or((options.width.unwrap_or(1200), options.height.unwrap_or(800)));

        // URLの決定
        let url = match options.window_type {
            WindowType::Launcher => WebviewUrl::App("index.html".into()),
            WindowType::QueryBuilder => {
                let path = match (&options.connection_id, environment.as_deref()) {
                    (Some(id), Some(env)) => {
                        format!("query-builder?connectionId={}&environment={}", id, env)
                    }
                    (Some(id), None) => format!("query-builder?connectionId={}", id),
                    (None, Some(env)) => format!("query-builder?environment={}", env),
                    (None, None) => "query-builder".to_string(),
                };
                WebviewUrl::App(path.into())
            }
            WindowType::MutationBuilder => {
                let path = match (&options.connection_id, environment.as_deref()) {
                    (Some(id), Some(env)) => {
                        format!("mutation-builder?connectionId={}&environment={}", id, env)
                    }
                    (Some(id), None) => format!("mutation-builder?connectionId={}", id),
                    (None, Some(env)) => format!("mutation-builder?environment={}", env),
                    (None, None) => "mutation-builder".to_string(),
                };
                WebviewUrl::App(path.into())
            }
            WindowType::Settings => WebviewUrl::App("settings".into()),
        };

        // ウィンドウを作成
        let mut builder = WebviewWindowBuilder::new(app_handle, &label, url)
            .title(&options.title)
            .inner_size(width as f64, height as f64)
            .min_inner_size(800.0, 600.0)
            .resizable(true)
            .decorations(true);

        // 保存された位置を復元
        if let Some(ref state) = saved_state {
            if let (Some(x), Some(y)) = (state.x, state.y) {
                builder = builder.position(x as f64, y as f64);
            }
            if state.maximized {
                builder = builder.maximized(true);
            }
        } else if options.center {
            builder = builder.center();
        }

        let window = builder
            .build()
            .map_err(|e| format!("Failed to create window: {}", e))?;

        let label_for_event = label.clone();
        let app_handle_for_event = app_handle.clone();
        window.on_window_event(move |event| {
            if matches!(event, WindowEvent::Destroyed) {
                let manager = app_handle_for_event.state::<WindowManager>();
                let _ = manager.delete_window_state(&label_for_event);
            }
        });

        // ウィンドウ状態を記録
        let mut window_state =
            WindowState::new(options.window_type.clone(), options.connection_id.clone());
        window_state.id = label.clone();
        self.windows
            .lock()
            .unwrap()
            .insert(label.clone(), window_state);

        // 初期状態を保存しておく（強制終了時でも復元できるように）
        let _ = self.save_window_state(app_handle, &label);

        Ok(WindowInfo {
            label,
            title: options.title,
            window_type: options.window_type,
            connection_id: options.connection_id,
            focused: true,
            visible: true,
        })
    }

    /// ウィンドウを閉じる
    pub fn close_window(&self, app_handle: &AppHandle, label: &str) -> Result<(), String> {
        // 状態を保存
        self.save_window_state(app_handle, label)?;

        // ウィンドウを閉じる
        if let Some(window) = app_handle.get_webview_window(label) {
            window
                .close()
                .map_err(|e| format!("Failed to close window: {}", e))?;
        }

        // 記録から削除
        self.windows.lock().unwrap().remove(label);

        Ok(())
    }

    /// すべてのウィンドウ情報を取得
    pub fn list_windows(&self, app_handle: &AppHandle) -> Vec<WindowInfo> {
        let windows = self.windows.lock().unwrap();
        windows
            .iter()
            .filter_map(|(label, state)| {
                app_handle
                    .get_webview_window(label)
                    .map(|window| WindowInfo {
                        label: label.clone(),
                        title: window.title().unwrap_or_default(),
                        window_type: state.window_type.clone(),
                        connection_id: state.connection_id.clone(),
                        focused: window.is_focused().unwrap_or(false),
                        visible: window.is_visible().unwrap_or(false),
                    })
            })
            .collect()
    }

    /// 接続IDでウィンドウを検索
    pub fn find_window_by_connection(
        &self,
        app_handle: &AppHandle,
        connection_id: &str,
        window_type: Option<&WindowType>,
    ) -> Option<WindowInfo> {
        let windows = self.windows.lock().unwrap();
        let mut fallback = None;

        for (label, state) in windows.iter() {
            if state.connection_id.as_deref() != Some(connection_id) {
                continue;
            }

            if let Some(expected_type) = window_type {
                if &state.window_type != expected_type {
                    continue;
                }
            } else if state.window_type != WindowType::QueryBuilder {
                fallback = Some((label, state));
                continue;
            }

            return app_handle
                .get_webview_window(label)
                .map(|window| WindowInfo {
                    label: label.clone(),
                    title: window.title().unwrap_or_default(),
                    window_type: state.window_type.clone(),
                    connection_id: state.connection_id.clone(),
                    focused: window.is_focused().unwrap_or(false),
                    visible: window.is_visible().unwrap_or(false),
                });
        }

        if let Some((label, state)) = fallback {
            return app_handle
                .get_webview_window(label)
                .map(|window| WindowInfo {
                    label: label.clone(),
                    title: window.title().unwrap_or_default(),
                    window_type: state.window_type.clone(),
                    connection_id: state.connection_id.clone(),
                    focused: window.is_focused().unwrap_or(false),
                    visible: window.is_visible().unwrap_or(false),
                });
        }

        None
    }

    /// ウィンドウにフォーカス
    pub fn focus_window(&self, app_handle: &AppHandle, label: &str) -> Result<(), String> {
        if let Some(window) = app_handle.get_webview_window(label) {
            window
                .set_focus()
                .map_err(|e| format!("Failed to focus window: {}", e))?;
            window.unminimize().ok();
        }
        Ok(())
    }

    /// ウィンドウタイトルを更新
    pub fn set_window_title(
        &self,
        app_handle: &AppHandle,
        label: &str,
        title: &str,
    ) -> Result<(), String> {
        if let Some(window) = app_handle.get_webview_window(label) {
            window
                .set_title(title)
                .map_err(|e| format!("Failed to set window title: {}", e))?;
        }
        Ok(())
    }

    /// ウィンドウ状態を保存
    pub fn save_window_state(&self, app_handle: &AppHandle, label: &str) -> Result<(), String> {
        let window = app_handle
            .get_webview_window(label)
            .ok_or("Window not found")?;

        let mut windows = self.windows.lock().unwrap();
        if let Some(state) = windows.get_mut(label) {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            // 現在の状態を取得
            if let Ok(position) = window.outer_position() {
                let logical: tauri::LogicalPosition<f64> = position.to_logical(scale_factor);
                state.x = Some(logical.x.round() as i32);
                state.y = Some(logical.y.round() as i32);
            }
            if let Ok(size) = window.inner_size() {
                let logical: tauri::LogicalSize<f64> = size.to_logical(scale_factor);
                state.width = logical.width.round() as u32;
                state.height = logical.height.round() as u32;
            }
            state.maximized = window.is_maximized().unwrap_or(false);
            state.minimized = window.is_minimized().unwrap_or(false);
            state.fullscreen = window.is_fullscreen().unwrap_or(false);
            state.updated_at = chrono::Utc::now().to_rfc3339();

            // ストレージに保存
            self.storage.save_state(label, state)?;
        }

        Ok(())
    }

    /// ウィンドウラベルを生成
    fn generate_window_label(
        &self,
        window_type: &WindowType,
        connection_id: &Option<String>,
    ) -> String {
        match window_type {
            WindowType::Launcher => "launcher".to_string(),
            WindowType::QueryBuilder => match connection_id {
                Some(id) => format!("query-builder-{}", id),
                None => format!("query-builder-{}", uuid::Uuid::new_v4()),
            },
            WindowType::MutationBuilder => match connection_id {
                Some(id) => format!("mutation-builder-{}", id),
                None => format!("mutation-builder-{}", uuid::Uuid::new_v4()),
            },
            WindowType::Settings => "settings".to_string(),
        }
    }

    /// すべてのウィンドウ状態を保存
    pub fn save_all_window_states(&self, app_handle: &AppHandle) -> Result<(), String> {
        let labels: Vec<String> = {
            let windows = self.windows.lock().unwrap();
            windows.keys().cloned().collect()
        };

        for label in labels {
            self.save_window_state(app_handle, &label)?;
        }
        Ok(())
    }

    /// 保存されたウィンドウ状態を復元
    pub fn restore_windows(&self, app_handle: &AppHandle) -> Result<Vec<WindowInfo>, String> {
        let saved_states = self.storage.load_all_states()?;
        let mut restored = Vec::new();

        for state in saved_states {
            // ランチャー以外のウィンドウを復元
            if state.window_type != WindowType::Launcher {
                let options = WindowCreateOptions {
                    title: self.generate_title(&state),
                    window_type: state.window_type.clone(),
                    connection_id: state.connection_id.clone(),
                    environment: None,
                    width: Some(state.width),
                    height: Some(state.height),
                    center: false,
                    restore_state: true,
                };

                if let Ok(info) = self.create_window(app_handle, options) {
                    restored.push(info);
                }
            }
        }

        Ok(restored)
    }

    /// 保存された状態を取得
    pub fn get_saved_states(&self) -> Result<Vec<WindowState>, String> {
        self.storage.load_all_states()
    }

    /// 保存された状態をクリア
    pub fn clear_saved_states(&self) -> Result<(), String> {
        self.storage.clear_all_states()
    }

    /// 指定ラベルの状態を削除
    pub fn delete_window_state(&self, label: &str) -> Result<(), String> {
        self.storage.delete_state(label)?;
        self.windows.lock().unwrap().remove(label);
        Ok(())
    }

    /// 保存サイズをスケール・画面サイズに合わせて補正
    fn normalize_size(&self, app_handle: &AppHandle, width: u32, height: u32) -> (u32, u32) {
        if let Ok(Some(monitor)) = app_handle.primary_monitor() {
            let scale = monitor.scale_factor();
            let logical_size: tauri::LogicalSize<f64> = monitor.size().to_logical(scale);
            let logical_width_limit = logical_size.width.round() as u32;
            let logical_height_limit = logical_size.height.round() as u32;

            let mut w = width;
            let mut h = height;

            let exceeds_screen = w > logical_width_limit || h > logical_height_limit;
            if exceeds_screen && scale > 0.0 {
                w = (w as f64 / scale).round() as u32;
                h = (h as f64 / scale).round() as u32;
            }

            w = w.min(logical_width_limit).max(1);
            h = h.min(logical_height_limit).max(1);
            return (w, h);
        }

        (width.max(1), height.max(1))
    }

    /// ウィンドウタイトルを生成
    fn generate_title(&self, state: &WindowState) -> String {
        match state.window_type {
            WindowType::Launcher => "SQL Query Builder".to_string(),
            WindowType::QueryBuilder => "SQL Query Builder".to_string(),
            WindowType::MutationBuilder => "データ変更".to_string(),
            WindowType::Settings => "設定 - SQL Query Builder".to_string(),
        }
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}
