use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// ORDER BY句を生成
    pub fn build_order_by(&self, order_by: &OrderByClause) -> Result<String, String> {
        let items: Vec<String> = order_by
            .items
            .iter()
            .map(|item| {
                let col = format!(
                    "{}.{}",
                    self.quote_identifier(&item.table_alias),
                    self.quote_identifier(&item.column_name)
                );
                let direction = &item.direction;
                let nulls = if self.dialect.supports_nulls_order() {
                    match &item.nulls {
                        Some(n) => format!(" NULLS {}", n),
                        None => String::new(),
                    }
                } else {
                    String::new()
                };
                format!("{} {}{}", col, direction, nulls)
            })
            .collect();

        Ok(format!("ORDER BY {}", items.join(", ")))
    }
}
