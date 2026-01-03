use crate::error::QueryBuilderError;
use crate::models::expression_node::*;
use crate::models::query::{LiteralValue as QueryLiteralValue, WhereClause, WhereConditionItem, WhereValue};
use crate::sql::dialect_mapper::DialectMapper;

pub struct ExpressionBuilder {
    dialect_mapper: DialectMapper,
    max_depth: usize,
}

impl ExpressionBuilder {
    pub fn new(db_type: &str) -> Self {
        Self {
            dialect_mapper: DialectMapper::new(db_type),
            max_depth: 10,
        }
    }

    /// ExpressionNodeからSQL文字列を生成
    pub fn build(&self, node: &ExpressionNode) -> Result<String, QueryBuilderError> {
        self.build_with_depth(node, 0)
    }

    fn build_with_depth(
        &self,
        node: &ExpressionNode,
        depth: usize,
    ) -> Result<String, QueryBuilderError> {
        if depth > self.max_depth {
            return Err(QueryBuilderError::ExpressionTooDeep(depth));
        }

        match node {
            ExpressionNode::Column(col) => self.build_column(col),
            ExpressionNode::Literal(lit) => self.build_literal(lit),
            ExpressionNode::Function(func) => self.build_function(func, depth),
            ExpressionNode::Subquery(sub) => self.build_subquery(sub, depth),
            ExpressionNode::Binary(bin) => self.build_binary(bin, depth),
            ExpressionNode::Unary(un) => self.build_unary(un, depth),
        }
    }

    fn build_column(&self, col: &ColumnReference) -> Result<String, QueryBuilderError> {
        if let Some(table) = &col.table {
            Ok(format!("{}.{}", table, col.column))
        } else {
            Ok(col.column.clone())
        }
    }

    fn build_literal(&self, lit: &LiteralValue) -> Result<String, QueryBuilderError> {
        match lit {
            LiteralValue::String(s) => {
                Ok(format!("'{}'", s.replace('\'', "''")))
            }
            LiteralValue::Number(n) => Ok(n.to_string()),
            LiteralValue::Boolean(b) => {
                Ok(b.to_string().to_uppercase())
            }
            LiteralValue::Null => Ok("NULL".to_string()),
        }
    }

    fn build_function(
        &self,
        func: &FunctionCall,
        depth: usize,
    ) -> Result<String, QueryBuilderError> {
        if func.arguments.len() > 10 {
            return Err(QueryBuilderError::TooManyArguments(func.arguments.len()));
        }

        let mapped_name = self
            .dialect_mapper
            .map_function(&func.name, &func.arguments)?;

        let args: Result<Vec<String>, _> = func
            .arguments
            .iter()
            .map(|arg| self.build_with_depth(arg, depth + 1))
            .collect();

        let args_sql = args?;
        if mapped_name == "||" {
            return Ok(args_sql.join(" || "));
        }

        Ok(format!("{}({})", mapped_name, args_sql.join(", ")))
    }

    fn build_subquery(
        &self,
        sub: &SubqueryExpression,
        depth: usize,
    ) -> Result<String, QueryBuilderError> {
        let select_sql = self.build_with_depth(&sub.query.select, depth + 1)?;
        let from_table = &sub.query.from;

        let mut sql = format!("SELECT {} FROM {}", select_sql, from_table);
        if let Some(alias) = &sub.query.alias {
            sql.push_str(&format!(" {}", alias));
        }

        if let Some(where_clause) = &sub.query.where_clause {
            let where_sql = self.build_where_clause(where_clause)?;
            sql.push_str(&format!(" WHERE {}", where_sql));
        }

        Ok(format!("({})", sql))
    }

    fn build_binary(
        &self,
        bin: &BinaryOperation,
        depth: usize,
    ) -> Result<String, QueryBuilderError> {
        let left = self.build_with_depth(&bin.left, depth + 1)?;
        let right = self.build_with_depth(&bin.right, depth + 1)?;
        let op = bin.operator.as_str();

        Ok(format!("({} {} {})", left, op, right))
    }

    fn build_unary(
        &self,
        un: &UnaryOperation,
        depth: usize,
    ) -> Result<String, QueryBuilderError> {
        let operand = self.build_with_depth(&un.operand, depth + 1)?;
        let op = un.operator.as_str();

        Ok(format!("{}({})", op, operand))
    }

    fn build_where_clause(&self, where_clause: &WhereClause) -> Result<String, QueryBuilderError> {
        let parts: Result<Vec<String>, QueryBuilderError> = where_clause
            .conditions
            .iter()
            .map(|item| self.build_where_condition_item(item))
            .collect();

        let parts = parts?;
        if parts.is_empty() {
            return Ok(String::new());
        }

        Ok(parts.join(&format!(" {} ", where_clause.logic)))
    }

    fn build_where_condition_item(
        &self,
        item: &WhereConditionItem,
    ) -> Result<String, QueryBuilderError> {
        match item {
            WhereConditionItem::Condition(cond) => {
                let column = format!("{}.{}", cond.column.table_alias, cond.column.column_name);
                let value_sql = self.build_where_value(&cond.value)?;
                Ok(format!("{} {} {}", column, cond.operator, value_sql))
            }
            WhereConditionItem::Group(group) => {
                let inner = self.build_where_clause(&WhereClause {
                    logic: group.logic.clone(),
                    conditions: group.conditions.clone(),
                })?;
                Ok(format!("({})", inner))
            }
        }
    }

    fn build_where_value(&self, value: &WhereValue) -> Result<String, QueryBuilderError> {
        match value {
            WhereValue::Literal { value } => self.build_query_literal(value),
            WhereValue::List { values } => {
                let items: Result<Vec<String>, QueryBuilderError> =
                    values.iter().map(|v| self.build_query_literal(v)).collect();
                Ok(format!("({})", items?.join(", ")))
            }
            WhereValue::Range { from, to } => {
                let from_sql = self.build_query_literal(from)?;
                let to_sql = self.build_query_literal(to)?;
                Ok(format!("{} AND {}", from_sql, to_sql))
            }
            WhereValue::Column {
                table_alias,
                column_name,
            } => Ok(format!("{}.{}", table_alias, column_name)),
            WhereValue::Subquery { query: _ } => Err(QueryBuilderError::InvalidLiteral),
        }
    }

    fn build_query_literal(
        &self,
        value: &QueryLiteralValue,
    ) -> Result<String, QueryBuilderError> {
        match value {
            QueryLiteralValue::Null => Ok("NULL".to_string()),
            QueryLiteralValue::String(s) => Ok(format!("'{}'", s.replace('\'', "''"))),
            QueryLiteralValue::Number(n) => Ok(n.to_string()),
            QueryLiteralValue::Boolean(b) => Ok(if *b {
                "TRUE".to_string()
            } else {
                "FALSE".to_string()
            }),
        }
    }
}
