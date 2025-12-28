use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// GROUP BY句を生成
    pub fn build_group_by(&self, group_by: &GroupByClause) -> Result<String, String> {
        let columns: Vec<String> = group_by
            .columns
            .iter()
            .map(|col| {
                format!(
                    "{}.{}",
                    self.quote_identifier(&col.table_alias),
                    self.quote_identifier(&col.column_name)
                )
            })
            .collect();

        Ok(format!("GROUP BY {}", columns.join(", ")))
    }

    /// HAVING句を生成
    pub fn build_having(&self, having: &HavingClause) -> Result<String, String> {
        let conditions: Vec<String> = having
            .conditions
            .iter()
            .map(|cond| {
                let agg = self.build_aggregate(&cond.aggregate)?;
                let value = self.build_literal_value(&cond.value)?;
                Ok(format!("{} {} {}", agg, cond.operator, value))
            })
            .collect::<Result<Vec<_>, String>>()?;

        let logic = &having.logic;
        Ok(format!("HAVING {}", conditions.join(&format!(" {} ", logic))))
    }
}
