use sqlparser::ast::{FromTable, ObjectType, Statement};
use sqlparser::dialect::{Dialect, MySqlDialect, PostgreSqlDialect, SQLiteDialect};
use sqlparser::parser::Parser;

use crate::models::query_analysis::{QueryAnalysisResult, QueryType, RiskFactor, RiskLevel};

pub struct QueryAnalyzer;

impl QueryAnalyzer {
    /// SQLクエリを解析して危険度を判定
    pub fn analyze(sql: &str, dialect: &str) -> QueryAnalysisResult {
        let dialect_box: Box<dyn Dialect> = match dialect {
            "postgresql" => Box::new(PostgreSqlDialect {}),
            "mysql" => Box::new(MySqlDialect {}),
            "sqlite" => Box::new(SQLiteDialect {}),
            _ => Box::new(PostgreSqlDialect {}),
        };

        let ast = match Parser::parse_sql(&*dialect_box, sql) {
            Ok(statements) => statements,
            Err(_) => return QueryAnalysisResult::unknown(),
        };

        if ast.is_empty() {
            return QueryAnalysisResult::unknown();
        }

        // 最初の文のみ解析
        Self::analyze_statement(&ast[0])
    }

    fn analyze_statement(stmt: &Statement) -> QueryAnalysisResult {
        match stmt {
            Statement::Query(query) => Self::analyze_select(query),
            Statement::Insert(insert) => Self::analyze_insert(&insert.table_name),
            Statement::Update {
                table, selection, ..
            } => Self::analyze_update(table, selection),
            Statement::Delete(delete) => Self::analyze_delete(&delete.from, &delete.selection),
            Statement::Drop {
                object_type, names, ..
            } => Self::analyze_drop(object_type, names),
            Statement::Truncate { table_names, .. } => Self::analyze_truncate(table_names),
            Statement::AlterTable { name, .. } => Self::analyze_alter(name),
            Statement::CreateTable(create) => Self::analyze_create_table(&create.name),
            Statement::CreateIndex(create_index) => Self::analyze_create_index(&create_index.name),
            _ => QueryAnalysisResult::unknown(),
        }
    }

    fn analyze_select(_query: &sqlparser::ast::Query) -> QueryAnalysisResult {
        QueryAnalysisResult::safe_select()
    }

    fn analyze_insert(table_name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Insert,
            risk_level: RiskLevel::Warning,
            risk_factors: vec![RiskFactor {
                code: "insert_data".to_string(),
                message: "データが挿入されます".to_string(),
            }],
            affected_tables: vec![table_name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_update(
        table: &sqlparser::ast::TableWithJoins,
        selection: &Option<sqlparser::ast::Expr>,
    ) -> QueryAnalysisResult {
        let table_name = table.relation.to_string();
        let has_where = selection.is_some();

        let (risk_level, risk_factors) = if has_where {
            (
                RiskLevel::Warning,
                vec![RiskFactor {
                    code: "update_with_where".to_string(),
                    message: "条件に一致するデータが更新されます".to_string(),
                }],
            )
        } else {
            (
                RiskLevel::Danger,
                vec![RiskFactor {
                    code: "no_where_clause".to_string(),
                    message: "WHERE句がありません。テーブル内の全データが更新されます".to_string(),
                }],
            )
        };

        QueryAnalysisResult {
            query_type: QueryType::Update,
            risk_level,
            risk_factors,
            affected_tables: vec![table_name],
            has_where_clause: has_where,
        }
    }

    fn analyze_delete(
        from: &FromTable,
        selection: &Option<sqlparser::ast::Expr>,
    ) -> QueryAnalysisResult {
        // FromTable (in sqlparser 0.52) structure is opaque or complex,
        // so we convert to string and split by comma to get table names.
        let from_str = from.to_string();
        let table_names: Vec<String> = from_str.split(',').map(|s| s.trim().to_string()).collect();
        let has_where = selection.is_some();

        let (risk_level, risk_factors) = if has_where {
            (
                RiskLevel::Warning,
                vec![RiskFactor {
                    code: "delete_with_where".to_string(),
                    message: "条件に一致するデータが削除されます".to_string(),
                }],
            )
        } else {
            (
                RiskLevel::Danger,
                vec![RiskFactor {
                    code: "no_where_clause".to_string(),
                    message: "WHERE句がありません。テーブル内の全データが削除されます".to_string(),
                }],
            )
        };

        QueryAnalysisResult {
            query_type: QueryType::Delete,
            risk_level,
            risk_factors,
            affected_tables: table_names,
            has_where_clause: has_where,
        }
    }

    fn analyze_drop(
        object_type: &ObjectType,
        names: &[sqlparser::ast::ObjectName],
    ) -> QueryAnalysisResult {
        let type_name = match object_type {
            ObjectType::Table => "テーブル",
            ObjectType::Index => "インデックス",
            ObjectType::Schema => "スキーマ",
            ObjectType::View => "ビュー",
            _ => "オブジェクト",
        };

        QueryAnalysisResult {
            query_type: QueryType::Drop,
            risk_level: RiskLevel::Danger,
            risk_factors: vec![RiskFactor {
                code: "drop_object".to_string(),
                message: format!("{}が削除されます。この操作は取り消せません", type_name),
            }],
            affected_tables: names.iter().map(|n| n.to_string()).collect(),
            has_where_clause: false,
        }
    }

    fn analyze_truncate(
        table_names: &[sqlparser::ast::TruncateTableTarget],
    ) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Truncate,
            risk_level: RiskLevel::Danger,
            risk_factors: vec![RiskFactor {
                code: "truncate_table".to_string(),
                message: "テーブル内の全データが削除されます。この操作は取り消せません".to_string(),
            }],
            affected_tables: table_names.iter().map(|t| t.name.to_string()).collect(),
            has_where_clause: false,
        }
    }

    fn analyze_alter(name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Alter,
            risk_level: RiskLevel::Warning,
            risk_factors: vec![RiskFactor {
                code: "alter_table".to_string(),
                message: "テーブル構造が変更されます".to_string(),
            }],
            affected_tables: vec![name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_create_table(name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Create,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_create_index(name: &Option<sqlparser::ast::ObjectName>) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Create,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: name.as_ref().map(|n| n.to_string()).into_iter().collect(),
            has_where_clause: false,
        }
    }
}
