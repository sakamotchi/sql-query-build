use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// WHERE句を生成
    pub fn build_where(&self, where_clause: &WhereClause) -> Result<String, String> {
        let conditions = self.build_where_conditions(&where_clause.conditions, &where_clause.logic)?;
        Ok(format!("WHERE {}", conditions))
    }

    /// WHERE条件を再帰的に生成
    fn build_where_conditions(
        &self,
        conditions: &[WhereConditionItem],
        logic: &str,
    ) -> Result<String, String> {
        let parts: Vec<String> = conditions
            .iter()
            .map(|item| self.build_where_condition_item(item))
            .collect::<Result<Vec<_>, _>>()?;

        if parts.is_empty() {
            return Err("No WHERE conditions".to_string());
        }

        let separator = format!(" {} ", logic);
        Ok(parts.join(&separator))
    }

    /// WHERE条件アイテムを生成
    fn build_where_condition_item(&self, item: &WhereConditionItem) -> Result<String, String> {
        match item {
            WhereConditionItem::Condition(cond) => self.build_condition(cond),
            WhereConditionItem::Group(group) => {
                let inner = self.build_where_conditions(&group.conditions, &group.logic)?;
                Ok(format!("({})", inner))
            }
        }
    }

    /// 単一条件を生成
    fn build_condition(&self, cond: &WhereCondition) -> Result<String, String> {
        let column = format!(
            "{}.{}",
            self.quote_identifier(&cond.column.table_alias),
            self.quote_identifier(&cond.column.column_name)
        );

        let value_sql = self.build_where_value(&cond.value, &cond.operator)?;

        Ok(format!("{} {} {}", column, cond.operator, value_sql))
    }

    /// WHERE値を生成
    fn build_where_value(&self, value: &WhereValue, _operator: &str) -> Result<String, String> {
        match value {
            WhereValue::Literal { value } => self.build_literal_value(value),
            WhereValue::List { values } => {
                let items: Vec<String> = values
                    .iter()
                    .map(|v| self.build_literal_value(v))
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(format!("({})", items.join(", ")))
            }
            WhereValue::Range { from, to } => {
                let from_sql = self.build_literal_value(from)?;
                let to_sql = self.build_literal_value(to)?;
                Ok(format!("{} AND {}", from_sql, to_sql))
            }
            WhereValue::Column {
                table_alias,
                column_name,
            } => Ok(format!(
                "{}.{}",
                self.quote_identifier(table_alias),
                self.quote_identifier(column_name)
            )),
            WhereValue::Subquery { query: _ } => {
                // TODO: サブクエリ対応（フェーズ2）
                Err("Subqueries are not supported yet".to_string())
            }
        }
    }


}
