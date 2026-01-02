use crate::sql_generator::builder::QuoteStyle;
use crate::sql_generator::{reserved_words, Dialect};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertQueryModel {
    #[serde(rename = "type")]
    pub query_type: String,
    pub table: String,
    pub columns: Vec<String>,
    pub values: Vec<Value>,
}

pub fn generate_insert_sql(
    model: &InsertQueryModel,
    dialect: &dyn Dialect,
    smart_quote: bool,
) -> Result<String, String> {
    if model.table.trim().is_empty() {
        return Err("Table name is required".to_string());
    }

    if model.columns.is_empty() {
        return Err("Insert columns are required".to_string());
    }

    if model.values.is_empty() {
        return Err("Insert values are required".to_string());
    }

    let quote_style = if smart_quote {
        QuoteStyle::Smart
    } else {
        QuoteStyle::Always
    };

    let table_name = quote_identifier_path(&model.table, dialect, quote_style);

    let columns = model
        .columns
        .iter()
        .map(|col| quote_identifier_path(col, dialect, quote_style))
        .collect::<Vec<_>>()
        .join(", ");

    let values_clause = model
        .values
        .iter()
        .map(|row| build_row_values(row, &model.columns, dialect))
        .collect::<Result<Vec<_>, _>>()?
        .join(", ");

    Ok(format!(
        "INSERT INTO {} ({}) VALUES {};",
        table_name, columns, values_clause
    ))
}

fn quote_identifier_path(identifier: &str, dialect: &dyn Dialect, quote_style: QuoteStyle) -> String {
    identifier
        .split('.')
        .map(|part| quote_identifier(part, dialect, quote_style))
        .collect::<Vec<_>>()
        .join(".")
}

/// 識別子を引用符で囲む（スマートクォーティング対応）
fn quote_identifier(identifier: &str, dialect: &dyn Dialect, quote_style: QuoteStyle) -> String {
    match quote_style {
        QuoteStyle::Always => dialect.quote_identifier(identifier),
        QuoteStyle::Smart => {
            if needs_quoting(identifier) {
                dialect.quote_identifier(identifier)
            } else {
                identifier.to_string()
            }
        }
    }
}

/// 識別子に引用符が必要かどうかを判定
fn needs_quoting(identifier: &str) -> bool {
    // 空文字列または空白を含む場合は必要
    if identifier.is_empty() || identifier.chars().any(|c| c.is_whitespace()) {
        return true;
    }

    // 大文字を含む場合は必要
    if identifier.chars().any(|c| c.is_uppercase()) {
        return true;
    }

    // 特殊文字を含む場合は必要
    if !identifier.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return true;
    }

    // 数字で始まる場合は必要
    if identifier.chars().next().map_or(false, |c| c.is_ascii_digit()) {
        return true;
    }

    // 予約語の場合は必要
    if reserved_words::simple_impl::is_reserved(identifier) {
        return true;
    }

    false
}

fn build_row_values(
    row: &Value,
    columns: &[String],
    dialect: &dyn Dialect,
) -> Result<String, String> {
    let values = columns
        .iter()
        .map(|column| {
            let cell = match row {
                Value::Object(map) => map.get(column).unwrap_or(&Value::Null),
                _ => &Value::Null,
            };
            format_value(cell, dialect)
        })
        .collect::<Vec<_>>()
        .join(", ");

    Ok(format!("({})", values))
}

fn format_value(value: &Value, dialect: &dyn Dialect) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(val) => {
            if *val {
                "TRUE".to_string()
            } else {
                "FALSE".to_string()
            }
        }
        Value::Number(val) => val.to_string(),
        Value::String(val) => dialect.escape_string(val),
        Value::Array(_) | Value::Object(_) => dialect.escape_string(&value.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};

    #[test]
    fn test_generate_insert_sql_single_row() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice",
                "email": "alice@example.com"
            })],
        };

        let dialect = PostgresDialect;

        // smart_quote = false (常に引用符)
        let sql = generate_insert_sql(&model, &dialect, false).unwrap();
        assert_eq!(
            sql,
            r#"INSERT INTO "users" ("name", "email") VALUES ('Alice', 'alice@example.com');"#
        );

        // smart_quote = true (スマート引用符)
        let sql = generate_insert_sql(&model, &dialect, true).unwrap();
        assert_eq!(
            sql,
            r#"INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');"#
        );
    }

    #[test]
    fn test_generate_insert_sql_multiple_rows() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![
                serde_json::json!({"name": "Alice", "email": "alice@example.com"}),
                serde_json::json!({"name": "Bob", "email": "bob@example.com"}),
            ],
        };

        let dialect = PostgresDialect;
        let sql = generate_insert_sql(&model, &dialect, true).unwrap();

        assert!(sql.contains(
            "VALUES ('Alice', 'alice@example.com'), ('Bob', 'bob@example.com')"
        ));
    }

    #[test]
    fn test_generate_insert_sql_with_null() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice",
                "email": null
            })],
        };

        let dialect = PostgresDialect;
        let sql = generate_insert_sql(&model, &dialect, true).unwrap();

        assert!(sql.contains("NULL"));
    }

    #[test]
    fn test_generate_insert_sql_with_schema() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "public.users".to_string(),
            columns: vec!["name".to_string(), "email".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice",
                "email": "alice@example.com"
            })],
        };

        let dialect = MysqlDialect;
        let sql = generate_insert_sql(&model, &dialect, false).unwrap();

        assert!(sql.starts_with("INSERT INTO `public`.`users`"));
    }

    #[test]
    fn test_generate_insert_sql_sqlite() {
        let model = InsertQueryModel {
            query_type: "INSERT".to_string(),
            table: "users".to_string(),
            columns: vec!["name".to_string()],
            values: vec![serde_json::json!({
                "name": "Alice"
            })],
        };

        let dialect = SqliteDialect;
        let sql = generate_insert_sql(&model, &dialect, false).unwrap();

        assert!(sql.contains("INSERT INTO \"users\""));
    }
}
