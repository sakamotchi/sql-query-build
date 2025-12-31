use serde::{Deserialize, Serialize};

/// JOIN提案
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinSuggestion {
    /// FROM側テーブル（例: "users"）
    pub from_table: String,
    /// TO側テーブル（例: "orders"）
    pub to_table: String,
    /// JOINタイプ（例: "INNER JOIN", "LEFT JOIN"）
    pub join_type: String,
    /// ON条件のリスト
    pub conditions: Vec<JoinCondition>,
    /// 信頼度（0.0〜1.0）
    pub confidence: f32,
    /// 提案理由（例: "外部キー制約 'fk_orders_user_id' に基づく"）
    pub reason: String,
}

/// JOIN条件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinCondition {
    /// 左側カラム（例: "users.id"）
    pub left_column: String,
    /// 演算子（通常は "="）
    pub operator: String,
    /// 右側カラム（例: "orders.user_id"）
    pub right_column: String,
}
