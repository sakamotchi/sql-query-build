#[cfg(test)]
mod tests {
    use crate::models::query_analysis::{QueryType, RiskLevel};
    use crate::services::query_analyzer::QueryAnalyzer;

    #[test]
    fn test_analyze_select() {
        let result = QueryAnalyzer::analyze("SELECT * FROM users", "postgresql");
        assert_eq!(result.query_type, QueryType::Select);
        assert_eq!(result.risk_level, RiskLevel::Safe);
    }

    #[test]
    fn test_analyze_update_without_where() {
        let result = QueryAnalyzer::analyze("UPDATE users SET active = false", "postgresql");
        assert_eq!(result.query_type, QueryType::Update);
        assert_eq!(result.risk_level, RiskLevel::Danger);
        assert!(!result.has_where_clause);
    }

    #[test]
    fn test_analyze_update_with_where() {
        let result =
            QueryAnalyzer::analyze("UPDATE users SET active = false WHERE id = 1", "postgresql");
        assert_eq!(result.query_type, QueryType::Update);
        assert_eq!(result.risk_level, RiskLevel::Warning);
        assert!(result.has_where_clause);
    }

    #[test]
    fn test_analyze_delete_without_where() {
        let result = QueryAnalyzer::analyze("DELETE FROM users", "postgresql");
        assert_eq!(result.query_type, QueryType::Delete);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_delete_with_where() {
        let result = QueryAnalyzer::analyze("DELETE FROM users WHERE id = 1", "postgresql");
        assert_eq!(result.query_type, QueryType::Delete);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_drop_table() {
        let result = QueryAnalyzer::analyze("DROP TABLE users", "postgresql");
        assert_eq!(result.query_type, QueryType::Drop);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_truncate() {
        let result = QueryAnalyzer::analyze("TRUNCATE TABLE users", "postgresql");
        assert_eq!(result.query_type, QueryType::Truncate);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_insert() {
        let result =
            QueryAnalyzer::analyze("INSERT INTO users (name) VALUES ('test')", "postgresql");
        assert_eq!(result.query_type, QueryType::Insert);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_create_table() {
        let result = QueryAnalyzer::analyze("CREATE TABLE users (id INT)", "postgresql");
        assert_eq!(result.query_type, QueryType::Create);
        assert_eq!(result.risk_level, RiskLevel::Safe);
    }

    #[test]
    fn test_analyze_alter_table() {
        let result = QueryAnalyzer::analyze(
            "ALTER TABLE users ADD COLUMN email VARCHAR(255)",
            "postgresql",
        );
        assert_eq!(result.query_type, QueryType::Alter);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_invalid_sql() {
        let result = QueryAnalyzer::analyze("NOT A VALID SQL", "postgresql");
        assert_eq!(result.query_type, QueryType::Unknown);
    }
}
