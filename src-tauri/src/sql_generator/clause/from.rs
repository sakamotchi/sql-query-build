use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// FROM句を生成
    pub fn build_from(&self, from: &FromClause) -> Result<String, String> {
        let table = &from.table;
        let prefix = if self.pretty { "" } else { "" };

        Ok(format!(
            "{}FROM {}.{} {}",
            prefix,
            self.quote_identifier(&table.schema),
            self.quote_identifier(&table.name),
            self.quote_identifier(&table.alias)
        ))
    }
}
