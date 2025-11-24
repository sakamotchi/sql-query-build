use std::sync::Arc;

use tauri::State;

use crate::crypto::security_provider::{
    SecurityProviderInfo, SecurityProviderManager, SecurityProviderType,
};

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
