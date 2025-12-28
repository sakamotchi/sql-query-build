use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// JOIN句を生成
    pub fn build_join(&self, join: &JoinClause) -> Result<String, String> {
        let join_type = match join.join_type.as_str() {
            "INNER" => "INNER JOIN",
            "LEFT" => "LEFT JOIN",
            "RIGHT" => "RIGHT JOIN",
            "FULL" => "FULL OUTER JOIN",
            "CROSS" => "CROSS JOIN",
            _ => return Err(format!("Unknown join type: {}", join.join_type)),
        };

        let table = &join.table;
        let table_sql = format!(
            "{}.{} {}",
            self.quote_identifier(&table.schema),
            self.quote_identifier(&table.name),
            self.quote_identifier(&table.alias)
        );

        if join.conditions.is_empty() {
            return Ok(format!("{} {}", join_type, table_sql));
        }

        let conditions: Vec<String> = join
            .conditions
            .iter()
            .map(|cond| {
                format!(
                    "{}.{} {} {}.{}",
                    self.quote_identifier(&cond.left.table_alias),
                    self.quote_identifier(&cond.left.column_name),
                    cond.operator,
                    self.quote_identifier(&cond.right.table_alias),
                    self.quote_identifier(&cond.right.column_name)
                )
            })
            .collect();

        let logic = &join.condition_logic;
        let on_clause = conditions.join(&format!(" {} ", logic));

        Ok(format!("{} {} ON {}", join_type, table_sql, on_clause))
    }
}
