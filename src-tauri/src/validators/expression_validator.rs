use crate::error::QueryBuilderError;
use crate::models::expression_node::*;

pub struct ExpressionValidator {
    max_depth: usize,
    max_arguments: usize,
}

impl ExpressionValidator {
    pub fn new() -> Self {
        Self {
            max_depth: 10,
            max_arguments: 10,
        }
    }

    /// 式ツリー全体をバリデーション
    pub fn validate(&self, node: &ExpressionNode) -> Result<(), QueryBuilderError> {
        self.validate_depth(node, 0)?;
        self.validate_structure(node)?;
        Ok(())
    }

    fn validate_depth(&self, node: &ExpressionNode, depth: usize) -> Result<(), QueryBuilderError> {
        if depth > self.max_depth {
            return Err(QueryBuilderError::ExpressionTooDeep(depth));
        }

        match node {
            ExpressionNode::Function(func) => {
                for arg in &func.arguments {
                    self.validate_depth(arg, depth + 1)?;
                }
            }
            ExpressionNode::Subquery(sub) => {
                self.validate_depth(&sub.query.select, depth + 1)?;
            }
            ExpressionNode::Binary(bin) => {
                self.validate_depth(&bin.left, depth + 1)?;
                self.validate_depth(&bin.right, depth + 1)?;
            }
            ExpressionNode::Unary(un) => {
                self.validate_depth(&un.operand, depth + 1)?;
            }
            _ => {}
        }

        Ok(())
    }

    fn validate_structure(&self, node: &ExpressionNode) -> Result<(), QueryBuilderError> {
        match node {
            ExpressionNode::Function(func) => {
                if func.arguments.len() > self.max_arguments {
                    return Err(QueryBuilderError::TooManyArguments(func.arguments.len()));
                }
                for arg in &func.arguments {
                    self.validate_structure(arg)?;
                }
            }
            ExpressionNode::Subquery(sub) => {
                self.validate_structure(&sub.query.select)?;
            }
            _ => {}
        }

        Ok(())
    }
}
