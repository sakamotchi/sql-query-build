use std::sync::Arc;

use tauri::State;

use crate::crypto::security_provider::{
    InitializeParams, PasswordRequirements, PasswordValidationResult, PasswordValidator,
    ProviderSwitcher, SecurityConfig, SecurityConfigStorage, SecurityProviderInfo,
    SecurityProviderManager, SecurityProviderType, SwitchParams, SwitchResult, UnlockParams,
};

/// セキュリティ設定を取得
#[tauri::command]
pub async fn get_security_config(
    storage: State<'_, Arc<SecurityConfigStorage>>,
) -> Result<SecurityConfig, String> {
    storage
        .load()
        .await
        .map_err(|e| e.to_string())
}

/// プロバイダーを変更
#[tauri::command]
pub async fn change_security_provider(
    storage: State<'_, Arc<SecurityConfigStorage>>,
    manager: State<'_, Arc<SecurityProviderManager>>,
    provider_type: SecurityProviderType,
) -> Result<(), String> {
    manager
        .change_provider(provider_type)
        .await
        .map_err(|e| e.to_string())?;

    storage
        .change_provider(provider_type)
        .await
        .map_err(|e| e.to_string())
}

/// 現在のセキュリティプロバイダー情報を取得
#[tauri::command]
pub async fn get_security_provider_info(
    manager: State<'_, Arc<SecurityProviderManager>>,
) -> Result<SecurityProviderInfo, String> {
    Ok(manager.provider_info().await)
}

/// 利用可能なプロバイダー一覧を取得
#[tauri::command]
pub async fn get_available_providers() -> Vec<SecurityProviderInfo> {
    vec![
        SecurityProviderInfo {
            provider_type: SecurityProviderType::Simple,
            state: "available".to_string(),
            needs_initialization: false,
            needs_unlock: false,
            display_name: SecurityProviderType::Simple.display_name().to_string(),
            description: SecurityProviderType::Simple.description().to_string(),
            security_level: SecurityProviderType::Simple.security_level(),
        },
        SecurityProviderInfo {
            provider_type: SecurityProviderType::MasterPassword,
            state: "available".to_string(),
            needs_initialization: true,
            needs_unlock: true,
            display_name: SecurityProviderType::MasterPassword
                .display_name()
                .to_string(),
            description: SecurityProviderType::MasterPassword
                .description()
                .to_string(),
            security_level: SecurityProviderType::MasterPassword.security_level(),
        },
        SecurityProviderInfo {
            provider_type: SecurityProviderType::Keychain,
            state: "available".to_string(),
            needs_initialization: false,
            needs_unlock: false,
            display_name: SecurityProviderType::Keychain.display_name().to_string(),
            description: SecurityProviderType::Keychain.description().to_string(),
            security_level: SecurityProviderType::Keychain.security_level(),
        },
    ]
}

/// マスターパスワードを初期化
#[tauri::command]
pub async fn initialize_master_password(
    manager: State<'_, Arc<SecurityProviderManager>>,
    password: String,
    password_confirm: String,
) -> Result<(), String> {
    manager
        .initialize(InitializeParams::MasterPassword {
            password,
            password_confirm,
        })
        .await
        .map_err(|e| e.to_string())
}

/// マスターパスワードでアンロック
#[tauri::command]
pub async fn unlock_with_master_password(
    manager: State<'_, Arc<SecurityProviderManager>>,
    password: String,
) -> Result<(), String> {
    manager
        .unlock(UnlockParams::MasterPassword { password })
        .await
        .map_err(|e| e.to_string())
}

/// パスワード強度をチェック
#[tauri::command]
pub async fn check_password_strength(password: String) -> PasswordValidationResult {
    let validator = PasswordValidator::new(PasswordRequirements::default());
    validator.validate(&password)
}

/// プロバイダーを切り替え（再暗号化込み）
#[tauri::command]
pub async fn switch_security_provider(
    switcher: State<'_, Arc<ProviderSwitcher>>,
    target_provider: SecurityProviderType,
    current_password: Option<String>,
    new_password: Option<String>,
    new_password_confirm: Option<String>,
) -> Result<SwitchResult, String> {
    let current_provider = switcher.current_provider_type().await;

    let current_auth = match current_provider {
        SecurityProviderType::Simple => UnlockParams::Simple,
        SecurityProviderType::MasterPassword => UnlockParams::MasterPassword {
            password: current_password.unwrap_or_default(),
        },
        SecurityProviderType::Keychain => UnlockParams::Keychain,
    };

    let new_init = match target_provider {
        SecurityProviderType::Simple => InitializeParams::Simple,
        SecurityProviderType::MasterPassword => InitializeParams::MasterPassword {
            password: new_password.unwrap_or_default(),
            password_confirm: new_password_confirm.unwrap_or_default(),
        },
        SecurityProviderType::Keychain => InitializeParams::Keychain,
    };

    switcher
        .switch(SwitchParams {
            target_provider,
            current_auth,
            new_init,
        })
        .await
        .map_err(|e| e.to_string())
}
