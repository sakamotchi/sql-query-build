use serde::{Deserialize, Serialize};

/// クエリモデル（完全版）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryModel {
    /// クエリID（保存時に使用）
    pub id: Option<String>,
    /// クエリ名（保存時に使用）
    pub name: Option<String>,
    /// クエリの説明（保存時に使用）
    pub description: Option<String>,
    /// 接続ID
    pub connection_id: String,
    /// SELECT句
    pub select: SelectClause,
    /// FROM句
    pub from: FromClause,
    /// JOIN句
    pub joins: Vec<JoinClause>,
    /// WHERE句
    #[serde(default)]
    pub where_clause: Option<WhereClause>,
    /// GROUP BY句
    #[serde(default)]
    pub group_by: Option<GroupByClause>,
    /// HAVING句
    #[serde(default)]
    pub having: Option<HavingClause>,
    /// ORDER BY句
    #[serde(default)]
    pub order_by: Option<OrderByClause>,
    /// LIMIT/OFFSET
    #[serde(default)]
    pub limit: Option<LimitClause>,
    /// 作成日時
    pub created_at: Option<String>,
    /// 更新日時
    pub updated_at: Option<String>,
}

/// SELECT句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectClause {
    /// DISTINCT
    pub distinct: bool,
    /// 選択カラム
    pub columns: Vec<SelectColumn>,
}

/// 選択カラム
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SelectColumn {
    /// 通常のカラム
    #[serde(rename = "column")]
    Column {
        #[serde(rename = "tableAlias")]
        table_alias: String,
        #[serde(rename = "columnName")]
        column_name: String,
        alias: Option<String>,
    },
    /// 式
    #[serde(rename = "expression")]
    Expression {
        expression: String,
        alias: Option<String>,
    },
    /// 集計関数
    #[serde(rename = "aggregate")]
    Aggregate {
        aggregate: AggregateFunction,
        alias: Option<String>,
    },
    /// すべてのカラム (table.*)
    #[serde(rename = "all")]
    All {
        #[serde(rename = "tableAlias")]
        table_alias: String,
    },
}

/// 集計関数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregateFunction {
    /// 関数名
    pub function: String,
    /// 対象カラム
    pub column: AggregateColumn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AggregateColumn {
    All,
    Column {
        #[serde(rename = "tableAlias")]
        table_alias: String,
        #[serde(rename = "columnName")]
        column_name: String,
    },
}

/// FROM句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FromClause {
    /// メインテーブル
    pub table: TableReference,
}

/// テーブル参照
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableReference {
    /// スキーマ名
    pub schema: String,
    /// テーブル名
    pub name: String,
    /// エイリアス
    pub alias: String,
}

/// JOIN句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinClause {
    /// JOIN ID
    pub id: String,
    /// JOIN種別
    #[serde(rename = "type")]
    pub join_type: String,
    /// 結合テーブル
    pub table: TableReference,
    /// 結合条件
    pub conditions: Vec<JoinCondition>,
    /// 条件の結合方法
    pub condition_logic: String,
}

/// JOIN条件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinCondition {
    /// 左側（元テーブル）
    pub left: JoinConditionColumn,
    /// 演算子
    pub operator: String,
    /// 右側（結合テーブル）
    pub right: JoinConditionColumn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinConditionColumn {
    pub table_alias: String,
    pub column_name: String,
}

/// WHERE句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhereClause {
    /// 条件の結合方法
    pub logic: String,
    /// 条件リスト
    pub conditions: Vec<WhereConditionItem>,
}

/// WHERE条件アイテム（条件またはグループ）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WhereConditionItem {
    #[serde(rename = "condition")]
    Condition(WhereCondition),
    #[serde(rename = "group")]
    Group(WhereConditionGroup),
}

/// WHERE条件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhereCondition {
    /// 条件ID
    pub id: String,
    /// カラム
    pub column: WhereConditionColumn,
    /// 演算子
    pub operator: String,
    /// 値
    pub value: WhereValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhereConditionColumn {
    pub table_alias: String,
    pub column_name: String,
}

/// WHERE値
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WhereValue {
    #[serde(rename = "literal")]
    Literal { value: LiteralValue },
    #[serde(rename = "list")]
    List { values: Vec<LiteralValue> },
    #[serde(rename = "range")]
    Range {
        from: LiteralValue,
        to: LiteralValue,
    },
    #[serde(rename = "column")]
    Column {
        table_alias: String,
        column_name: String,
    },
    #[serde(rename = "subquery")]
    Subquery { query: Box<QueryModel> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum LiteralValue {
    Null,
    String(String),
    Number(f64),
    Boolean(bool),
}

/// 条件グループ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhereConditionGroup {
    /// グループID
    pub id: String,
    /// グループ内の結合方法
    pub logic: String,
    /// 条件リスト
    pub conditions: Vec<WhereConditionItem>,
}

/// GROUP BY句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupByClause {
    /// グループ化カラム
    pub columns: Vec<GroupByColumn>,
}

/// グループ化カラム
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupByColumn {
    pub table_alias: String,
    pub column_name: String,
}

/// HAVING句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HavingClause {
    /// 条件の結合方法
    pub logic: String,
    /// 条件リスト
    pub conditions: Vec<HavingCondition>,
}

/// HAVING条件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HavingCondition {
    /// 条件ID
    pub id: String,
    /// 集計関数
    pub aggregate: AggregateFunction,
    /// 演算子
    pub operator: String,
    /// 値
    pub value: LiteralValue,
}

/// ORDER BY句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderByClause {
    /// ソート項目
    pub items: Vec<OrderByItem>,
}

/// ソート項目
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderByItem {
    pub table_alias: String,
    pub column_name: String,
    pub direction: String,
    pub nulls: Option<String>,
}

/// LIMIT/OFFSET句
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LimitClause {
    /// 取得件数
    pub limit: u64,
    /// オフセット
    pub offset: Option<u64>,
}
