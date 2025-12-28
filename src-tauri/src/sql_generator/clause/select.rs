use crate::models::query::*;

use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// SELECT句を生成
    pub fn build_select(&self, select: &SelectClause) -> Result<String, String> {
        let mut sql = String::from("SELECT");

        if select.distinct {
            sql.push_str(" DISTINCT");
        }

        let columns: Vec<String> = select
            .columns
            .iter()
            .map(|col| self.build_select_column(col))
            .collect::<Result<Vec<_>, _>>()?;

        if columns.is_empty() {
            return Err("No columns selected".to_string());
        }

        let separator = if self.pretty { ",\n  " } else { ", " };
        let prefix = if self.pretty { "\n  " } else { " " };

        sql.push_str(&format!("{}{}", prefix, columns.join(separator)));

        Ok(sql)
    }

    /// SELECT列を生成
    fn build_select_column(&self, column: &SelectColumn) -> Result<String, String> {
        let col_sql = match column {
            SelectColumn::Column {
                table_alias,
                column_name,
                alias,
            } => {
                let col = format!(
                    "{}.{}",
                    self.quote_identifier(table_alias),
                    self.quote_identifier(column_name)
                );
                if let Some(a) = alias {
                    format!("{} AS {}", col, self.quote_identifier(a))
                } else {
                    col
                }
            }
            SelectColumn::All { table_alias } => {
                format!("{}.*", self.quote_identifier(table_alias))
            }
            SelectColumn::Aggregate { aggregate, alias } => {
                let agg = self.build_aggregate(aggregate)?;
                if let Some(a) = alias {
                    format!("{} AS {}", agg, self.quote_identifier(a))
                } else {
                    agg
                }
            }
            SelectColumn::Expression { expression, alias } => {
                if let Some(a) = alias {
                    format!("({}) AS {}", expression, self.quote_identifier(a))
                } else {
                    format!("({})", expression)
                }
            }
        };

        Ok(col_sql)
    }

    /// 集計関数を生成
    pub(crate) fn build_aggregate(&self, agg: &AggregateFunction) -> Result<String, String> {
        let func = match agg.function.as_str() {
            "COUNT_DISTINCT" => "COUNT(DISTINCT",
            f => f,
        };

        let col = match &agg.column {
            AggregateColumn::All => "*".to_string(),
            AggregateColumn::Column {
                table_alias,
                column_name,
            } => format!(
                "{}.{}",
                self.quote_identifier(table_alias),
                self.quote_identifier(column_name)
            ),
        };

        if agg.function == "COUNT_DISTINCT" {
            Ok(format!("{} {})", func, col))
        } else {
            Ok(format!("{}({})", func, col))
        }
    }
}
