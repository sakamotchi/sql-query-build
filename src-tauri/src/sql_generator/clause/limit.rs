use crate::models::query::*;
use crate::sql_generator::builder::SqlBuilder;

impl<'a> SqlBuilder<'a> {
    /// LIMIT句を生成
    pub fn build_limit(&self, limit: &LimitClause) -> Result<String, String> {
        Ok(self.dialect.limit_offset(limit.limit, limit.offset))
    }
}
