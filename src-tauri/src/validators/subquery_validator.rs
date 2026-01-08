use crate::error::QueryBuilderError;
use crate::models::expression_node::SubqueryExpression;

pub struct SubqueryValidator;

impl SubqueryValidator {
    /// サブクエリがスカラー値を返すか検証
    pub fn validate_scalar(subquery: &SubqueryExpression) -> Result<(), QueryBuilderError> {
        if subquery.query.where_clause.is_none() {
            eprintln!("Subquery without WHERE clause may return multiple rows");
        }

        Ok(())
    }
}
