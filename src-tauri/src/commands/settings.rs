use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

use crate::crypto::{ProviderSpecificConfig, SecurityConfigStorage, SecurityProviderType};
use crate::storage::FileStorage;

// ===== データ型 =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    #[serde(rename = "autoSave")]
    pub auto_save: bool,
    #[serde(rename = "windowRestore")]
    pub window_restore: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "auto".to_string(),
            language: "ja".to_string(),
            auto_save: true,
            window_restore: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub provider: String,
    pub level: String,
    #[serde(rename = "masterPasswordSet")]
    pub master_password_set: bool,
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            provider: "simple".to_string(),
            level: "medium".to_string(),
            master_password_set: false,
        }
    }
}

// ===== アプリケーション設定コマンド =====

/// アプリケーション設定を取得する
#[tauri::command]
pub async fn get_settings(storage: State<'_, FileStorage>) -> Result<AppSettings, String> {
    match storage.read("app-settings") {
        Ok(value) => {
            serde_json::from_value(value).map_err(|e| format!("Failed to parse settings: {}", e))
        }
        Err(_) => {
            // 設定が存在しない場合はデフォルト値を返す
            Ok(AppSettings::default())
        }
    }
}

/// アプリケーション設定を更新する（部分更新対応）
#[tauri::command]
pub async fn update_settings(
    settings: serde_json::Value,
    storage: State<'_, FileStorage>,
) -> Result<AppSettings, String> {
    // 現在の設定を読み込む
    let mut current = match storage.read("app-settings") {
        Ok(value) => serde_json::from_value::<AppSettings>(value)
            .map_err(|e| format!("Failed to parse current settings: {}", e))?,
        Err(_) => AppSettings::default(),
    };

    // 部分更新を適用
    if let Some(theme) = settings.get("theme").and_then(|v| v.as_str()) {
        current.theme = theme.to_string();
    }
    if let Some(language) = settings.get("language").and_then(|v| v.as_str()) {
        current.language = language.to_string();
    }
    if let Some(auto_save) = settings.get("autoSave").and_then(|v| v.as_bool()) {
        current.auto_save = auto_save;
    }
    if let Some(window_restore) = settings.get("windowRestore").and_then(|v| v.as_bool()) {
        current.window_restore = window_restore;
    }

    // 保存
    let value = serde_json::to_value(&current)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    storage
        .write("app-settings", &value)
        .map_err(|e| e.to_string())?;

    Ok(current)
}

/// アプリケーション設定をリセットする
#[tauri::command]
pub async fn reset_settings(storage: State<'_, FileStorage>) -> Result<AppSettings, String> {
    let default = AppSettings::default();
    let value = serde_json::to_value(&default)
        .map_err(|e| format!("Failed to serialize default settings: {}", e))?;
    storage
        .write("app-settings", &value)
        .map_err(|e| e.to_string())?;
    Ok(default)
}

// ===== セキュリティ設定コマンド =====

/// セキュリティ設定を取得する
#[tauri::command]
pub async fn get_security_settings(
    config_storage: State<'_, Arc<SecurityConfigStorage>>,
) -> Result<SecuritySettings, String> {
    println!("[get_security_settings] Called");
    let config = config_storage.load().await.map_err(|e| e.to_string())?;
    println!(
        "[get_security_settings] Loaded config: provider_type={:?}, provider_config={:?}",
        config.provider_type, config.provider_config
    );

    // プロバイダー名を文字列に変換
    let provider = match config.provider_type {
        SecurityProviderType::Simple => "simple",
        SecurityProviderType::MasterPassword => "master-password",
        SecurityProviderType::Keychain => "keychain",
    };

    // マスターパスワードが設定されているかチェック
    let master_password_set = matches!(
        config.provider_config,
        ProviderSpecificConfig::MasterPassword {
            is_configured: true
        }
    );

    let result = SecuritySettings {
        provider: provider.to_string(),
        level: "medium".to_string(), // TODO: SecurityConfigにlevelフィールドを追加する必要がある
        master_password_set,
    };
    println!(
        "[get_security_settings] Returning: provider={}, master_password_set={}",
        result.provider, result.master_password_set
    );
    Ok(result)
}

/// セキュリティプロバイダーを変更する
#[tauri::command]
pub async fn set_security_provider(
    provider: String,
    config_storage: State<'_, Arc<SecurityConfigStorage>>,
) -> Result<SecuritySettings, String> {
    // プロバイダーの検証
    let provider_type = match provider.as_str() {
        "simple" => SecurityProviderType::Simple,
        "master-password" => SecurityProviderType::MasterPassword,
        "keychain" => SecurityProviderType::Keychain,
        _ => return Err(format!("Invalid provider: {}", provider)),
    };

    // プロバイダー変更（SecurityConfigStorageのchange_providerメソッドを使用）
    config_storage
        .change_provider(provider_type)
        .await
        .map_err(|e| e.to_string())?;

    // 更新後の設定を取得
    get_security_settings(config_storage).await
}

/// セキュリティレベルを変更する
/// NOTE: 現在のSecurityConfigにはlevelフィールドがないため、この機能は未実装
#[tauri::command]
pub async fn set_security_level(
    level: String,
    config_storage: State<'_, Arc<SecurityConfigStorage>>,
) -> Result<SecuritySettings, String> {
    // TODO: SecurityConfigにlevelフィールドを追加する必要がある
    // 今のところは現在の設定を返すのみ
    let _ = level; // 警告を抑制
    get_security_settings(config_storage).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_settings_default() {
        let settings = AppSettings::default();
        assert_eq!(settings.theme, "auto");
        assert_eq!(settings.language, "ja");
        assert!(settings.auto_save);
        assert!(settings.window_restore);
    }

    #[test]
    fn test_security_settings_default() {
        let settings = SecuritySettings::default();
        assert_eq!(settings.provider, "simple");
        assert_eq!(settings.level, "medium");
        assert!(!settings.master_password_set);
    }
}
