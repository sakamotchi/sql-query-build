use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConfirmationThreshold {
    Warning,
    Danger,
}

impl Default for ConfirmationThreshold {
    fn default() -> Self {
        Self::Warning
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentSafetyConfig {
    pub confirmation_enabled: bool,
    pub confirmation_threshold: ConfirmationThreshold,
    pub countdown_seconds: u8,
    pub disable_drop: bool,
    pub disable_truncate: bool,
}

impl Default for EnvironmentSafetyConfig {
    fn default() -> Self {
        Self {
            confirmation_enabled: true,
            confirmation_threshold: ConfirmationThreshold::Warning,
            countdown_seconds: 3,
            disable_drop: false,
            disable_truncate: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetySettings {
    pub version: u32,
    pub environments: HashMap<String, EnvironmentSafetyConfig>,
}

impl Default for SafetySettings {
    fn default() -> Self {
        let mut environments = HashMap::new();

        environments.insert(
            "development".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Danger,
                countdown_seconds: 0,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "test".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Danger,
                countdown_seconds: 0,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "staging".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Warning,
                countdown_seconds: 3,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "production".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Warning,
                countdown_seconds: 5,
                disable_drop: true,
                disable_truncate: true,
            },
        );

        Self {
            version: 1,
            environments,
        }
    }
}
