use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// ウィンドウの種類
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WindowType {
    /// ランチャーウィンドウ（メイン）
    Launcher,
    /// クエリビルダーウィンドウ
    QueryBuilder,
    /// 設定ウィンドウ
    Settings,
}

/// ウィンドウの状態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    /// ウィンドウID
    pub id: String,
    /// ウィンドウの種類
    pub window_type: WindowType,
    /// 関連する接続ID（クエリビルダーの場合）
    pub connection_id: Option<String>,
    /// ウィンドウ位置X
    pub x: Option<i32>,
    /// ウィンドウ位置Y
    pub y: Option<i32>,
    /// ウィンドウ幅
    pub width: u32,
    /// ウィンドウ高さ
    pub height: u32,
    /// 最大化状態
    pub maximized: bool,
    /// 最小化状態
    pub minimized: bool,
    /// フルスクリーン状態
    pub fullscreen: bool,
    /// 作成日時
    pub created_at: String,
    /// 更新日時
    pub updated_at: String,
}

impl WindowState {
    pub fn new(window_type: WindowType, connection_id: Option<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            window_type,
            connection_id,
            x: None,
            y: None,
            width: 1200,
            height: 800,
            maximized: false,
            minimized: false,
            fullscreen: false,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// ウィンドウ生成オプション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowCreateOptions {
    /// ウィンドウタイトル
    pub title: String,
    /// ウィンドウの種類
    pub window_type: WindowType,
    /// 関連する接続ID
    pub connection_id: Option<String>,
    /// 環境名（例: development, staging）
    pub environment: Option<String>,
    /// ウィンドウ幅
    pub width: Option<u32>,
    /// ウィンドウ高さ
    pub height: Option<u32>,
    /// 中央に配置するか
    pub center: bool,
    /// 以前の状態を復元するか
    pub restore_state: bool,
}

impl Default for WindowCreateOptions {
    fn default() -> Self {
        Self {
            title: "SQL Query Builder".to_string(),
            window_type: WindowType::QueryBuilder,
            connection_id: None,
            environment: None,
            width: Some(1200),
            height: Some(800),
            center: true,
            restore_state: true,
        }
    }
}

/// ウィンドウ情報（フロントエンドへの返却用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    /// ウィンドウラベル（Tauri内部識別子）
    pub label: String,
    /// ウィンドウタイトル
    pub title: String,
    /// ウィンドウの種類
    pub window_type: WindowType,
    /// 関連する接続ID
    pub connection_id: Option<String>,
    /// フォーカス状態
    pub focused: bool,
    /// 可視状態
    pub visible: bool,
}
