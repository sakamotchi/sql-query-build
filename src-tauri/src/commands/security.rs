use std::sync::Arc;

use tauri::State;

use crate::connection::ConnectionService;
use crate::crypto::security_provider::{
    InitializeParams, PasswordRequirements, PasswordValidationResult, PasswordValidator,
    ProviderSpecificConfig, ProviderSwitcher, SecurityConfig, SecurityConfigStorage,
    SecurityProviderInfo, SecurityProviderManager, SecurityProviderType, SwitchParams,
    SwitchResult, UnlockParams,
};

/// セキュリティ設定を取得
#[tauri::command]
pub async fn get_security_config(
    storage: State<'_, Arc<SecurityConfigStorage>>,
) -> Result<SecurityConfig, String> {
    storage.load().await.map_err(|e| e.to_string())
}

/// プロバイダーを変更
#[tauri::command]
pub async fn change_security_provider(
    storage: State<'_, Arc<SecurityConfigStorage>>,
    manager: State<'_, Arc<SecurityProviderManager>>,
    connection_service: State<'_, ConnectionService>,
    provider_type: SecurityProviderType,
) -> Result<(), String> {
    manager
        .change_provider(provider_type)
        .await
        .map_err(|e| e.to_string())?;

    storage
        .change_provider(provider_type)
        .await
        .map_err(|e| e.to_string())?;

    connection_service.clear_password_cache();
    Ok(())
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
    storage: State<'_, Arc<SecurityConfigStorage>>,
    manager: State<'_, Arc<SecurityProviderManager>>,
    connection_service: State<'_, ConnectionService>,
    target_provider: SecurityProviderType,
    current_password: Option<String>,
    new_password: Option<String>,
    new_password_confirm: Option<String>,
) -> Result<SwitchResult, String> {
    let current_provider = switcher.current_provider_type().await;
    println!(
        "[switch_security_provider] Switching from {:?} to {:?}",
        current_provider, target_provider
    );

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

    let switch_result = switcher
        .switch(SwitchParams {
            target_provider,
            current_auth,
            new_init,
        })
        .await;

    connection_service.clear_password_cache();

    let result = switch_result.map_err(|e| e.to_string())?;

    println!("[switch_security_provider] Switch completed successfully");

    // NOTE: switcher.switch() が内部で config_storage.change_provider() を呼んでいるため、
    // ここで再度呼ぶ必要はない。
    // ただし、プロバイダー固有の設定(is_configured など)は別途更新が必要。

    // プロバイダー切り替え完了後、必要に応じてマスターパスワード設定をクリア
    if current_provider == SecurityProviderType::MasterPassword
        && target_provider != SecurityProviderType::MasterPassword
    {
        println!("[switch_security_provider] Clearing master password config (switched FROM MasterPassword)");
        let _ = manager.clear_master_password_config().await;
    }

    // プロバイダー固有の設定を更新（必要な場合のみ）
    match target_provider {
        SecurityProviderType::Simple => {
            // Simpleプロバイダーは追加設定不要
            println!("[switch_security_provider] Simple provider: no additional config needed");
        }
        SecurityProviderType::MasterPassword => {
            // is_configuredをtrueに更新
            println!("[switch_security_provider] Updating MasterPassword is_configured to true");
            storage
                .update_provider_config(ProviderSpecificConfig::MasterPassword {
                    is_configured: true,
                })
                .await
                .map_err(|e| e.to_string())?;
        }
        SecurityProviderType::Keychain => {
            // is_initializedをtrueに更新
            println!("[switch_security_provider] Updating Keychain is_initialized to true");
            storage
                .update_provider_config(ProviderSpecificConfig::Keychain {
                    is_initialized: true,
                })
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(result)
}

/// マスターパスワードを検証
#[tauri::command]
pub async fn verify_master_password(
    manager: State<'_, Arc<SecurityProviderManager>>,
    password: String,
) -> Result<bool, String> {
    match manager
        .unlock(UnlockParams::MasterPassword { password })
        .await
    {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// マスターパスワードを変更（再暗号化込み）
#[tauri::command]
pub async fn change_master_password(
    switcher: State<'_, Arc<ProviderSwitcher>>,
    storage: State<'_, Arc<SecurityConfigStorage>>,
    manager: State<'_, Arc<SecurityProviderManager>>,
    connection_service: State<'_, ConnectionService>,
    current_password: String,
    new_password: String,
    new_password_confirm: String,
) -> Result<SwitchResult, String> {
    if switcher.current_provider_type().await != SecurityProviderType::MasterPassword {
        return Err("現在のプロバイダーがマスターパスワードではありません".to_string());
    }

    // 一旦Simpleプロバイダーに切り替え
    switcher
        .switch(SwitchParams {
            target_provider: SecurityProviderType::Simple,
            current_auth: UnlockParams::MasterPassword {
                password: current_password.clone(),
            },
            new_init: InitializeParams::Simple,
        })
        .await
        .map_err(|e| e.to_string())?;

    // マスターパスワード設定をクリア
    manager
        .clear_master_password_config()
        .await
        .map_err(|e| e.to_string())?;

    // 新しいパスワードでマスターパスワードプロバイダーに戻す
    let result = switcher
        .switch(SwitchParams {
            target_provider: SecurityProviderType::MasterPassword,
            current_auth: UnlockParams::Simple,
            new_init: InitializeParams::MasterPassword {
                password: new_password.clone(),
                password_confirm: new_password_confirm.clone(),
            },
        })
        .await;

    let final_result = match result {
        Ok(res) => {
            // 切り替え成功時、is_configuredをtrueに更新
            storage
                .update_provider_config(ProviderSpecificConfig::MasterPassword {
                    is_configured: true,
                })
                .await
                .map_err(|e| e.to_string())?;
            Ok(res)
        }
        Err(err) => {
            // エラー時は元のパスワードで復元を試みる
            let _ = switcher
                .switch(SwitchParams {
                    target_provider: SecurityProviderType::MasterPassword,
                    current_auth: UnlockParams::Simple,
                    new_init: InitializeParams::MasterPassword {
                        password: current_password.clone(),
                        password_confirm: current_password,
                    },
                })
                .await;

            // 復元成功時もis_configuredをtrueに戻す
            let _ = storage
                .update_provider_config(ProviderSpecificConfig::MasterPassword {
                    is_configured: true,
                })
                .await;

            Err(err.to_string())
        }
    };

    connection_service.clear_password_cache();
    final_result
}

/// セキュリティ設定を強制的にリセット（デバッグ用）
/// WARNING: このコマンドは全ての接続情報を失います
#[tauri::command]
pub async fn reset_security_config(
    storage: State<'_, Arc<SecurityConfigStorage>>,
    manager: State<'_, Arc<SecurityProviderManager>>,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    connection_service.clear_password_cache();

    // マスターパスワード設定をクリア（存在しない場合は無視）
    let _ = manager.clear_master_password_config().await;

    // Simpleプロバイダーに強制的に変更
    manager
        .change_provider(SecurityProviderType::Simple)
        .await
        .map_err(|e| e.to_string())?;

    storage
        .change_provider(SecurityProviderType::Simple)
        .await
        .map_err(|e| e.to_string())?;

    // SimpleProvider を初期化
    manager
        .initialize(InitializeParams::Simple)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
