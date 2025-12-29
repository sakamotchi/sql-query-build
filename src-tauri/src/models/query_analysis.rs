use serde::{Deserialize, Serialize};

/// クエリ種別
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum QueryType {
    Select,
    Insert,
    Update,
    Delete,
    Drop,
    Truncate,
    Alter,
    Create,
    Unknown,
}

/// 危険度レベル
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Ord, PartialOrd, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Safe,
    Warning,
    Danger,
}

/// 危険度要因
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskFactor {
    pub code: String,
    pub message: String,
}

/// クエリ解析結果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryAnalysisResult {
    pub query_type: QueryType,
    pub risk_level: RiskLevel,
    pub risk_factors: Vec<RiskFactor>,
    pub affected_tables: Vec<String>,
    pub has_where_clause: bool,
}

impl QueryAnalysisResult {
    pub fn safe_select() -> Self {
        Self {
            query_type: QueryType::Select,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![],
            has_where_clause: false,
        }
    }

    pub fn unknown() -> Self {
        Self {
            query_type: QueryType::Unknown,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![],
            has_where_clause: false,
        }
    }
}
