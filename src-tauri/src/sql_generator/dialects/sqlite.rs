use super::super::dialect::Dialect;

pub struct SqliteDialect;

impl Dialect for SqliteDialect {
    fn quote_identifier(&self, identifier: &str) -> String {
        format!("\"{}\"", identifier.replace('"', "\"\""))
    }

    fn escape_string(&self, value: &str) -> String {
        format!("'{}'", value.replace('\'', "''"))
    }

    fn limit_offset(&self, limit: u64, offset: Option<u64>) -> String {
        match offset {
            Some(off) => format!("LIMIT {} OFFSET {}", limit, off),
            None => format!("LIMIT {}", limit),
        }
    }

    fn ilike_operator(&self) -> &str {
        "LIKE" // SQLiteのLIKEは大文字小文字を区別しない
    }

    fn supports_nulls_order(&self) -> bool {
        false
    }

    fn dialect_name(&self) -> &str {
        "sqlite"
    }
}
