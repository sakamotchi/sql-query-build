#[cfg(test)]
mod tests {
    use crate::models::{WindowCreateOptions, WindowState, WindowType};

    #[test]
    fn test_window_state_creation() {
        let state = WindowState::new(WindowType::QueryBuilder, Some("conn-123".to_string()));

        assert!(!state.id.is_empty());
        assert_eq!(state.window_type, WindowType::QueryBuilder);
        assert_eq!(state.connection_id, Some("conn-123".to_string()));
        assert_eq!(state.width, 1200);
        assert_eq!(state.height, 800);
        assert!(!state.maximized);
    }

    #[test]
    fn test_window_state_creation_without_connection() {
        let state = WindowState::new(WindowType::Launcher, None);

        assert!(!state.id.is_empty());
        assert_eq!(state.window_type, WindowType::Launcher);
        assert_eq!(state.connection_id, None);
    }

    #[test]
    fn test_default_create_options() {
        let options = WindowCreateOptions::default();

        assert_eq!(options.title, "SQL Query Builder");
        assert_eq!(options.window_type, WindowType::QueryBuilder);
        assert!(options.connection_id.is_none());
        assert_eq!(options.width, Some(1200));
        assert_eq!(options.height, Some(800));
        assert!(options.center);
        assert!(options.restore_state);
    }

    #[test]
    fn test_window_type_serialization() {
        let window_type = WindowType::QueryBuilder;
        let serialized = serde_json::to_string(&window_type).unwrap();
        assert_eq!(serialized, "\"query_builder\"");

        let deserialized: WindowType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, WindowType::QueryBuilder);
    }
}
