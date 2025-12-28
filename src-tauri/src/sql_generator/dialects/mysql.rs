use super::super::dialect::Dialect;

pub struct MysqlDialect;

impl Dialect for MysqlDialect {
    fn quote_identifier(&self, identifier: &str) -> String {
        format!("`{}`", identifier.replace('`', "``"))
    }

    fn escape_string(&self, value: &str) -> String {
        format!("'{}'", value.replace('\'', "\\'"))
    }

    fn limit_offset(&self, limit: u64, offset: Option<u64>) -> String {
        match offset {
            Some(off) => format!("LIMIT {}, {}", off, limit),
            None => format!("LIMIT {}", limit),
        }
    }

    fn ilike_operator(&self) -> &str {
        "LIKE" // MySQLのLIKEはデフォルトで大文字小文字を区別しない
    }

    fn supports_nulls_order(&self) -> bool {
        false // MySQL 8.0未満は非サポート（今回はシンプルに非サポートとする）
    }

    fn dialect_name(&self) -> &str {
        "mysql"
    }
}
