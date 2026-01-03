use serde::{Deserialize, Serialize};

use crate::models::query::WhereClause;

/// 式ノード（再帰的構造）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ExpressionNode {
    Column(ColumnReference),
    Literal(LiteralValue),
    Function(FunctionCall),
    Subquery(SubqueryExpression),
    Binary(BinaryOperation),
    Unary(UnaryOperation),
}

/// カラム参照
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ColumnReference {
    pub table: Option<String>,
    pub column: String,
}

/// リテラル値（型安全なenum版）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "valueType", content = "value", rename_all = "lowercase")]
pub enum LiteralValue {
    String(String),
    Number(serde_json::Number),
    Boolean(bool),
    Null,
}

/// 関数呼び出し
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FunctionCall {
    pub name: String,
    pub category: FunctionCategory,
    pub arguments: Vec<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FunctionCategory {
    String,
    Date,
    Numeric,
    Conditional,
    Aggregate,
}

/// サブクエリ式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubqueryExpression {
    pub query: Box<SubqueryModel>,
}

/// サブクエリモデル
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubqueryModel {
    pub select: Box<ExpressionNode>,
    pub from: String,
    #[serde(rename = "where")]
    pub where_clause: Option<WhereClause>,
    pub alias: Option<String>,
}

/// 二項演算
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BinaryOperation {
    pub operator: BinaryOperator,
    pub left: Box<ExpressionNode>,
    pub right: Box<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BinaryOperator {
    #[serde(rename = "+")]
    Add,
    #[serde(rename = "-")]
    Subtract,
    #[serde(rename = "*")]
    Multiply,
    #[serde(rename = "/")]
    Divide,
    #[serde(rename = "=")]
    Equal,
    #[serde(rename = "!=")]
    NotEqual,
    #[serde(rename = ">")]
    GreaterThan,
    #[serde(rename = "<")]
    LessThan,
    #[serde(rename = ">=")]
    GreaterThanOrEqual,
    #[serde(rename = "<=")]
    LessThanOrEqual,
    #[serde(rename = "AND")]
    And,
    #[serde(rename = "OR")]
    Or,
}

impl BinaryOperator {
    pub fn as_str(&self) -> &'static str {
        match self {
            BinaryOperator::Add => "+",
            BinaryOperator::Subtract => "-",
            BinaryOperator::Multiply => "*",
            BinaryOperator::Divide => "/",
            BinaryOperator::Equal => "=",
            BinaryOperator::NotEqual => "!=",
            BinaryOperator::GreaterThan => ">",
            BinaryOperator::LessThan => "<",
            BinaryOperator::GreaterThanOrEqual => ">=",
            BinaryOperator::LessThanOrEqual => "<=",
            BinaryOperator::And => "AND",
            BinaryOperator::Or => "OR",
        }
    }
}

/// 単項演算
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnaryOperation {
    pub operator: UnaryOperator,
    pub operand: Box<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UnaryOperator {
    #[serde(rename = "NOT")]
    Not,
    #[serde(rename = "-")]
    Negate,
}

impl UnaryOperator {
    pub fn as_str(&self) -> &'static str {
        match self {
            UnaryOperator::Not => "NOT",
            UnaryOperator::Negate => "-",
        }
    }
}
