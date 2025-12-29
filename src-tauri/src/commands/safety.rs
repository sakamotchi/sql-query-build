use crate::models::safety_settings::{EnvironmentSafetyConfig, SafetySettings};
use crate::services::safety_config::SafetyConfigStorage;

#[tauri::command]
pub async fn get_safety_settings() -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    storage.load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_environment_safety(
    environment: String,
    config: EnvironmentSafetyConfig,
) -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    let mut settings = storage.load().map_err(|e| e.to_string())?;

    settings.environments.insert(environment, config);
    storage.save(&settings).map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub async fn reset_safety_settings() -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    storage.reset().map_err(|e| e.to_string())
}
