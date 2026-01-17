// SQLエディタウィンドウ基盤のテスト
//
// このファイルは src-tauri/src/services/window_manager.rs のテストを補完します。
// 既存のテストと併せて、以下のテストケースを追加できます。

#[cfg(test)]
mod sql_editor_window_tests {
    // 注: このテストは window_manager.rs のテストセクションに追加することを推奨
    // 以下は追加すべきテストのサンプルコードです

    /*
    #[test]
    fn test_sql_editor_title_format_test() {
        let title = format_sql_editor_title("PostgreSQLテスト", "test");
        assert_eq!(title, "[テスト] PostgreSQLテスト - SQLエディタ");
    }

    #[test]
    fn test_sql_editor_title_format_staging() {
        let title = format_sql_editor_title("PostgreSQLステージング", "staging");
        assert_eq!(title, "[ステージング] PostgreSQLステージング - SQLエディタ");
    }

    #[test]
    fn test_sql_editor_title_format_custom_environment() {
        let title = format_sql_editor_title("PostgreSQL", "custom-env");
        assert_eq!(title, "[custom-env] PostgreSQL - SQLエディタ");
    }

    #[test]
    fn test_sql_editor_label_without_connection() {
        let manager = WindowManager::new();
        let label = manager.generate_window_label(&WindowType::SqlEditor, &None);
        assert!(label.starts_with("sql_editor_"));
        // UUIDが付与されているので、長さをチェック
        assert!(label.len() > "sql_editor_".len());
    }

    #[test]
    fn test_window_label_generation_for_different_types() {
        let manager = WindowManager::new();
        let connection_id = Some("test-123".to_string());

        let query_builder_label =
            manager.generate_window_label(&WindowType::QueryBuilder, &connection_id);
        let mutation_builder_label =
            manager.generate_window_label(&WindowType::MutationBuilder, &connection_id);
        let sql_editor_label = manager.generate_window_label(&WindowType::SqlEditor, &connection_id);

        assert_eq!(query_builder_label, "query-builder-test-123");
        assert_eq!(mutation_builder_label, "mutation-builder-test-123");
        assert_eq!(sql_editor_label, "sql_editor_test-123");

        // 各ウィンドウタイプでラベルが異なることを確認
        assert_ne!(query_builder_label, sql_editor_label);
        assert_ne!(mutation_builder_label, sql_editor_label);
    }

    #[test]
    fn test_launcher_and_settings_labels() {
        let manager = WindowManager::new();

        let launcher_label = manager.generate_window_label(&WindowType::Launcher, &None);
        let settings_label = manager.generate_window_label(&WindowType::Settings, &None);

        assert_eq!(launcher_label, "launcher");
        assert_eq!(settings_label, "settings");
    }

    #[test]
    fn test_window_state_creation() {
        let state = WindowState::new(WindowType::SqlEditor, Some("conn-123".to_string()));

        assert_eq!(state.window_type, WindowType::SqlEditor);
        assert_eq!(state.connection_id, Some("conn-123".to_string()));
        assert_eq!(state.width, 1200);
        assert_eq!(state.height, 800);
        assert!(!state.maximized);
        assert!(!state.minimized);
        assert!(!state.fullscreen);
        assert!(!state.id.is_empty());
        assert!(!state.created_at.is_empty());
        assert_eq!(state.created_at, state.updated_at);
    }

    #[test]
    fn test_title_generation_for_sql_editor() {
        let manager = WindowManager::new();
        let state = WindowState::new(WindowType::SqlEditor, Some("test-123".to_string()));

        let title = manager.generate_title(&state);
        assert_eq!(title, "SQLエディタ");
    }

    #[test]
    fn test_sql_editor_title_with_special_characters() {
        // 日本語・絵文字を含む接続名のテスト
        let title = format_sql_editor_title("🐘PostgreSQL本番🔥", "production");
        assert_eq!(title, "[本番] 🐘PostgreSQL本番🔥 - SQLエディタ ⚠️");
    }

    #[test]
    fn test_sql_editor_title_with_empty_connection_name() {
        let title = format_sql_editor_title("", "development");
        assert_eq!(title, "[開発]  - SQLエディタ");
    }
    */
}
