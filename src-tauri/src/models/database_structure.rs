use serde::{Deserialize, Serialize};

/// データベース構造全体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStructure {
    pub connection_id: String,
    pub database_name: String,
    pub database_type: String,
    pub schemas: Vec<Schema>,
    pub fetched_at: String,
}

/// スキーマ情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schema {
    pub name: String,
    pub is_system: bool,
    pub tables: Vec<Table>,
    pub views: Vec<View>,
}

/// テーブル情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Table {
    pub name: String,
    pub schema: String,
    pub comment: Option<String>,
    pub estimated_row_count: Option<i64>,
    pub columns: Vec<Column>,
    pub primary_key: Option<PrimaryKey>,
    pub indexes: Vec<Index>,
    pub foreign_keys: Vec<ForeignKey>,
    pub referenced_by: Vec<ForeignKeyReference>,
}

/// ビュー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct View {
    pub name: String,
    pub schema: String,
    pub comment: Option<String>,
    pub columns: Vec<Column>,
    pub definition: Option<String>,
}

/// カラム情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    pub data_type: String,
    pub display_type: String,
    pub nullable: bool,
    pub default_value: Option<String>,
    pub is_primary_key: bool,
    pub is_foreign_key: bool,
    pub is_unique: bool,
    pub is_auto_increment: bool,
    pub ordinal_position: i32,
    pub comment: Option<String>,
}

/// プライマリキー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrimaryKey {
    pub name: String,
    pub columns: Vec<String>,
}

/// インデックス情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Index {
    pub name: String,
    pub is_unique: bool,
    pub is_primary: bool,
    pub columns: Vec<String>,
    #[serde(rename = "type")]
    pub index_type: String,
}

/// 外部キー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKey {
    pub name: String,
    pub columns: Vec<String>,
    pub referenced_schema: String,
    pub referenced_table: String,
    pub referenced_columns: Vec<String>,
    pub on_delete: String,
    pub on_update: String,
}

/// 外部キー参照情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKeyReference {
    pub source_schema: String,
    pub source_table: String,
    pub source_columns: Vec<String>,
    pub target_columns: Vec<String>,
    pub constraint_name: String,
}
