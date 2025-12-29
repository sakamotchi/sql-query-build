use crate::models::safety_settings::{ConfirmationThreshold, SafetySettings};

#[allow(unused_imports)]
use super::safety_config::SafetyConfigStorage;

#[test]
fn test_default_settings() {
    // Note: SafetyConfigStorage::new() might fail in test env if PathManager fails.
    // In unit tests, mocking PathManager is hard without dependency injection.
    // For now, we test SafetySettings defaults directly instead of full integration test.
    let settings = SafetySettings::default();

    assert_eq!(settings.version, 1);
    assert!(settings.environments.contains_key("development"));
    assert!(settings.environments.contains_key("production"));

    let prod = settings.environments.get("production").unwrap();
    assert!(prod.disable_drop);
    assert!(prod.disable_truncate);
    assert_eq!(prod.countdown_seconds, 5);
    assert_eq!(prod.confirmation_threshold, ConfirmationThreshold::Warning);

    // Check development environment
    let dev = settings.environments.get("development").unwrap();
    assert!(!dev.disable_drop);
    assert!(!dev.disable_truncate);
    assert_eq!(dev.countdown_seconds, 0);
    assert_eq!(dev.confirmation_threshold, ConfirmationThreshold::Danger);
}
