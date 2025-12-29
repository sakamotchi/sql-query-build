use crate::models::query_analysis::QueryAnalysisResult;
use crate::services::query_analyzer::QueryAnalyzer;

#[tauri::command]
pub fn analyze_query(sql: String, dialect: String) -> QueryAnalysisResult {
    QueryAnalyzer::analyze(&sql, &dialect)
}
