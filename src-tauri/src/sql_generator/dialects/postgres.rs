use super::super::dialect::Dialect;

pub struct PostgresDialect;

impl Dialect for PostgresDialect {
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
        "ILIKE"
    }

    fn supports_nulls_order(&self) -> bool {
        true
    }

    fn dialect_name(&self) -> &str {
        "postgresql"
    }
}
