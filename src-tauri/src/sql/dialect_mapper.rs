use std::collections::HashMap;

use crate::error::QueryBuilderError;
use crate::models::expression_node::ExpressionNode;

pub struct DialectMapper {
    db_type: String,
    function_map: HashMap<String, String>,
}

impl DialectMapper {
    pub fn new(db_type: &str) -> Self {
        let mut mapper = Self {
            db_type: db_type.to_string(),
            function_map: HashMap::new(),
        };

        mapper.init_mappings();
        mapper
    }

    fn init_mappings(&mut self) {
        match self.db_type.as_str() {
            "postgresql" => self.init_postgresql(),
            "mysql" => self.init_mysql(),
            "sqlite" => self.init_sqlite(),
            _ => {}
        }
    }

    fn init_postgresql(&mut self) {
        self.function_map
            .insert("CONCAT".to_string(), "CONCAT".to_string());
        self.function_map
            .insert("SUBSTRING".to_string(), "SUBSTRING".to_string());
    }

    fn init_mysql(&mut self) {
        self.function_map
            .insert("CONCAT".to_string(), "CONCAT".to_string());
        self.function_map
            .insert("SUBSTRING".to_string(), "SUBSTRING".to_string());
    }

    fn init_sqlite(&mut self) {
        self.function_map
            .insert("CONCAT".to_string(), "||".to_string());
        self.function_map
            .insert("SUBSTRING".to_string(), "SUBSTR".to_string());
    }

    /// 関数名をデータベース方言に応じてマッピング
    pub fn map_function(
        &self,
        func_name: &str,
        _args: &[ExpressionNode],
    ) -> Result<String, QueryBuilderError> {
        if self.db_type == "sqlite" && func_name.eq_ignore_ascii_case("CONCAT") {
            return Ok("||".to_string());
        }

        Ok(self
            .function_map
            .get(&func_name.to_uppercase())
            .cloned()
            .unwrap_or_else(|| func_name.to_uppercase()))
    }
}
