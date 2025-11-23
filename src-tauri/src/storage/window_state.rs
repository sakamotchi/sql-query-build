use std::fs;
use std::path::PathBuf;

use crate::models::window::WindowState;

const WINDOW_STATE_FILE: &str = "window_states.json";

/// ウィンドウ状態ストレージ
pub struct WindowStateStorage {
    storage_path: PathBuf,
}

impl WindowStateStorage {
    pub fn new() -> Self {
        let storage_path = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("sql-query-builder")
            .join(WINDOW_STATE_FILE);

        Self { storage_path }
    }

    /// ウィンドウ状態を保存
    pub fn save_state(&self, label: &str, state: &WindowState) -> Result<(), String> {
        let mut states = self.load_all_states().unwrap_or_default();

        // 同じラベルの状態を更新または追加
        if let Some(existing) = states.iter_mut().find(|s| s.id == label) {
            *existing = state.clone();
        } else {
            states.push(state.clone());
        }

        self.save_all_states(&states)
    }

    /// ウィンドウ状態を読み込み
    pub fn load_state(&self, label: &str) -> Result<WindowState, String> {
        let states = self.load_all_states()?;
        states
            .into_iter()
            .find(|s| s.id == label)
            .ok_or_else(|| "Window state not found".to_string())
    }

    /// すべてのウィンドウ状態を読み込み
    pub fn load_all_states(&self) -> Result<Vec<WindowState>, String> {
        if !self.storage_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read window states: {}", e))?;

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse window states: {}", e))
    }

    /// すべてのウィンドウ状態を保存
    fn save_all_states(&self, states: &[WindowState]) -> Result<(), String> {
        // ディレクトリが存在しない場合は作成
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let content = serde_json::to_string_pretty(states)
            .map_err(|e| format!("Failed to serialize window states: {}", e))?;

        fs::write(&self.storage_path, content)
            .map_err(|e| format!("Failed to write window states: {}", e))
    }

    /// ウィンドウ状態を削除
    pub fn delete_state(&self, label: &str) -> Result<(), String> {
        let mut states = self.load_all_states().unwrap_or_default();
        states.retain(|s| s.id != label);
        self.save_all_states(&states)
    }

    /// 古いウィンドウ状態をクリーンアップ（30日以上前）
    pub fn cleanup_old_states(&self) -> Result<(), String> {
        let mut states = self.load_all_states().unwrap_or_default();
        let cutoff = chrono::Utc::now() - chrono::Duration::days(30);

        states.retain(|s| {
            chrono::DateTime::parse_from_rfc3339(&s.updated_at)
                .map(|dt| dt > cutoff)
                .unwrap_or(true)
        });

        self.save_all_states(&states)
    }
}

impl Default for WindowStateStorage {
    fn default() -> Self {
        Self::new()
    }
}
