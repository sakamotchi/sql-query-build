use serde::{Deserialize, Serialize};

/// セキュリティプロバイダーの種別
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecurityProviderType {
    /// シンプルプロバイダー（固定キー暗号化）
    Simple,

    /// マスターパスワードプロバイダー
    MasterPassword,

    /// OSキーチェーンプロバイダー
    Keychain,
}

impl Default for SecurityProviderType {
    fn default() -> Self {
        Self::Simple
    }
}

impl SecurityProviderType {
    /// 表示名を取得
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Simple => "Simple (Default)",
            Self::MasterPassword => "Master Password",
            Self::Keychain => "OS Keychain",
        }
    }

    /// 説明を取得
    pub fn description(&self) -> &'static str {
        match self {
            Self::Simple => "アプリ固定のキーで暗号化。パスワード入力不要。",
            Self::MasterPassword => "ユーザー設定のパスワードで暗号化。起動時に入力が必要。",
            Self::Keychain => "OSのセキュアストレージを使用。OS認証が必要な場合あり。",
        }
    }

    /// セキュリティレベル（1-3）
    pub fn security_level(&self) -> u8 {
        match self {
            Self::Simple => 1,
            Self::MasterPassword => 2,
            Self::Keychain => 3,
        }
    }

    /// アンロックが必要かどうか
    pub fn requires_unlock(&self) -> bool {
        match self {
            Self::Simple => false,
            Self::MasterPassword => true,
            Self::Keychain => false, // OSが自動的に認証
        }
    }
}

/// プロバイダーの状態
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderState {
    /// 未初期化（初回セットアップが必要）
    Uninitialized,

    /// ロック中（アンロックが必要）
    Locked,

    /// 利用可能
    Ready,

    /// エラー状態
    Error(String),
}

impl ProviderState {
    pub fn is_ready(&self) -> bool {
        matches!(self, Self::Ready)
    }

    pub fn is_locked(&self) -> bool {
        matches!(self, Self::Locked)
    }
}

/// 初期化パラメータ
#[derive(Debug, Clone)]
pub enum InitializeParams {
    /// Simpleプロバイダー（パラメータなし）
    Simple,

    /// マスターパスワードプロバイダー
    MasterPassword {
        /// 設定するマスターパスワード
        password: String,
        /// パスワード確認用
        password_confirm: String,
    },

    /// キーチェーンプロバイダー（パラメータなし）
    Keychain,
}

/// アンロックパラメータ
#[derive(Debug, Clone)]
pub enum UnlockParams {
    /// Simpleプロバイダー（パラメータなし）
    Simple,

    /// マスターパスワードプロバイダー
    MasterPassword {
        /// マスターパスワード
        password: String,
    },

    /// キーチェーンプロバイダー（パラメータなし）
    Keychain,
}

/// プロバイダー設定（永続化用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityProviderConfig {
    pub provider_type: SecurityProviderType,
}

impl Default for SecurityProviderConfig {
    fn default() -> Self {
        Self {
            provider_type: SecurityProviderType::default(),
        }
    }
}

/// フロントエンド向けのプロバイダー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityProviderInfo {
    pub provider_type: SecurityProviderType,
    pub state: String,
    pub needs_initialization: bool,
    pub needs_unlock: bool,
    pub display_name: String,
    pub description: String,
    pub security_level: u8,
}
