#[cfg(test)]
mod tests {
    use crate::models::expression_node::*;
    use crate::sql::expression_builder::ExpressionBuilder;

    #[test]
    fn test_column_reference() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Column(ColumnReference {
            table: Some("u".to_string()),
            column: "name".to_string(),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "u.name");
    }

    #[test]
    fn test_function_call() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Function(FunctionCall {
            name: "UPPER".to_string(),
            category: FunctionCategory::String,
            arguments: vec![ExpressionNode::Column(ColumnReference {
                table: Some("u".to_string()),
                column: "name".to_string(),
            })],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "UPPER(u.name)");
    }

    #[test]
    fn test_nested_function() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Function(FunctionCall {
            name: "SUBSTRING".to_string(),
            category: FunctionCategory::String,
            arguments: vec![
                ExpressionNode::Function(FunctionCall {
                    name: "UPPER".to_string(),
                    category: FunctionCategory::String,
                    arguments: vec![ExpressionNode::Column(ColumnReference {
                        table: Some("u".to_string()),
                        column: "name".to_string(),
                    })],
                }),
                ExpressionNode::Literal(LiteralValue::Number(
                    serde_json::Number::from(1)
                )),
                ExpressionNode::Literal(LiteralValue::Number(
                    serde_json::Number::from(3)
                )),
            ],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "SUBSTRING(UPPER(u.name), 1, 3)");
    }

    #[test]
    fn test_sqlite_concat() {
        let builder = ExpressionBuilder::new("sqlite");
        let node = ExpressionNode::Function(FunctionCall {
            name: "CONCAT".to_string(),
            category: FunctionCategory::String,
            arguments: vec![
                ExpressionNode::Column(ColumnReference {
                    table: Some("u".to_string()),
                    column: "first_name".to_string(),
                }),
                ExpressionNode::Literal(LiteralValue::String(" ".to_string())),
                ExpressionNode::Column(ColumnReference {
                    table: Some("u".to_string()),
                    column: "last_name".to_string(),
                }),
            ],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "u.first_name || ' ' || u.last_name");
    }

    #[test]
    fn test_depth_limit() {
        let builder = ExpressionBuilder::new("postgresql");

        let mut node = ExpressionNode::Column(ColumnReference {
            table: None,
            column: "x".to_string(),
        });

        for _ in 0..11 {
            node = ExpressionNode::Function(FunctionCall {
                name: "UPPER".to_string(),
                category: FunctionCategory::String,
                arguments: vec![node],
            });
        }

        let result = builder.build(&node);
        assert!(result.is_err());
    }

    #[test]
    fn test_binary_operation() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Binary(BinaryOperation {
            operator: BinaryOperator::Multiply,
            left: Box::new(ExpressionNode::Column(ColumnReference {
                table: Some("orders".to_string()),
                column: "price".to_string(),
            })),
            right: Box::new(ExpressionNode::Column(ColumnReference {
                table: Some("orders".to_string()),
                column: "quantity".to_string(),
            })),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "(orders.price * orders.quantity)");
    }

    #[test]
    fn test_binary_operation_with_literal() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Binary(BinaryOperation {
            operator: BinaryOperator::GreaterThan,
            left: Box::new(ExpressionNode::Column(ColumnReference {
                table: Some("users".to_string()),
                column: "age".to_string(),
            })),
            right: Box::new(ExpressionNode::Literal(LiteralValue::Number(
                serde_json::Number::from(18)
            ))),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "(users.age > 18)");
    }

    #[test]
    fn test_unary_operation_not() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Unary(UnaryOperation {
            operator: UnaryOperator::Not,
            operand: Box::new(ExpressionNode::Column(ColumnReference {
                table: Some("users".to_string()),
                column: "active".to_string(),
            })),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "NOT(users.active)");
    }

    #[test]
    fn test_unary_operation_negate() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Unary(UnaryOperation {
            operator: UnaryOperator::Negate,
            operand: Box::new(ExpressionNode::Column(ColumnReference {
                table: Some("products".to_string()),
                column: "discount".to_string(),
            })),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "-(products.discount)");
    }

    #[test]
    fn test_subquery_expression() {
        use crate::models::query::{WhereClause, WhereCondition, WhereConditionItem, WhereConditionColumn, WhereValue};

        let builder = ExpressionBuilder::new("postgresql");

        let subquery = SubqueryExpression {
            query: Box::new(SubqueryModel {
                select: Box::new(ExpressionNode::Function(FunctionCall {
                    name: "COUNT".to_string(),
                    category: FunctionCategory::Aggregate,
                    arguments: vec![ExpressionNode::Column(ColumnReference {
                        table: None,
                        column: "*".to_string(),
                    })],
                })),
                from: "orders".to_string(),
                where_clause: Some(WhereClause {
                    logic: "AND".to_string(),
                    conditions: vec![WhereConditionItem::Condition(WhereCondition {
                        id: "1".to_string(),
                        column: WhereConditionColumn {
                            table_alias: "orders".to_string(),
                            column_name: "user_id".to_string(),
                        },
                        operator: "=".to_string(),
                        value: WhereValue::Column {
                            table_alias: "u".to_string(),
                            column_name: "id".to_string(),
                        },
                    })],
                }),
                alias: None,
            }),
        };

        let node = ExpressionNode::Subquery(subquery);
        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "(SELECT COUNT(*) FROM orders WHERE orders.user_id = u.id)");
    }

    #[test]
    fn test_mysql_substring() {
        let builder = ExpressionBuilder::new("mysql");
        let node = ExpressionNode::Function(FunctionCall {
            name: "SUBSTRING".to_string(),
            category: FunctionCategory::String,
            arguments: vec![
                ExpressionNode::Column(ColumnReference {
                    table: Some("users".to_string()),
                    column: "name".to_string(),
                }),
                ExpressionNode::Literal(LiteralValue::Number(
                    serde_json::Number::from(1)
                )),
                ExpressionNode::Literal(LiteralValue::Number(
                    serde_json::Number::from(5)
                )),
            ],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "SUBSTRING(users.name, 1, 5)");
    }

    #[test]
    fn test_too_many_arguments() {
        let builder = ExpressionBuilder::new("postgresql");

        // 11個の引数を持つ関数を作成
        let mut args = Vec::new();
        for i in 0..11 {
            args.push(ExpressionNode::Literal(LiteralValue::Number(
                serde_json::Number::from(i)
            )));
        }

        let node = ExpressionNode::Function(FunctionCall {
            name: "COALESCE".to_string(),
            category: FunctionCategory::Conditional,
            arguments: args,
        });

        let result = builder.build(&node);
        assert!(result.is_err());
    }

    #[test]
    fn test_sql_injection_prevention() {
        let builder = ExpressionBuilder::new("postgresql");

        // シングルクォートを含む文字列
        let node = ExpressionNode::Literal(LiteralValue::String(
            "'; DROP TABLE users; --".to_string()
        ));

        let sql = builder.build(&node).unwrap();
        // シングルクォートが適切にエスケープされることを確認
        assert_eq!(sql, "'''; DROP TABLE users; --'");
    }

    #[test]
    fn test_boolean_literal() {
        let builder = ExpressionBuilder::new("postgresql");

        let node_true = ExpressionNode::Literal(LiteralValue::Boolean(true));
        let sql_true = builder.build(&node_true).unwrap();
        assert_eq!(sql_true, "TRUE");

        let node_false = ExpressionNode::Literal(LiteralValue::Boolean(false));
        let sql_false = builder.build(&node_false).unwrap();
        assert_eq!(sql_false, "FALSE");
    }

    #[test]
    fn test_null_literal() {
        let builder = ExpressionBuilder::new("postgresql");

        let node = ExpressionNode::Literal(LiteralValue::Null);

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "NULL");
    }

    #[test]
    fn test_complex_nested_expression() {
        let builder = ExpressionBuilder::new("postgresql");

        // UPPER(SUBSTRING(name, 1, 3)) のような複雑なネスト
        let node = ExpressionNode::Function(FunctionCall {
            name: "UPPER".to_string(),
            category: FunctionCategory::String,
            arguments: vec![ExpressionNode::Function(FunctionCall {
                name: "SUBSTRING".to_string(),
                category: FunctionCategory::String,
                arguments: vec![
                    ExpressionNode::Column(ColumnReference {
                        table: Some("users".to_string()),
                        column: "name".to_string(),
                    }),
                    ExpressionNode::Literal(LiteralValue::Number(
                        serde_json::Number::from(1)
                    )),
                    ExpressionNode::Literal(LiteralValue::Number(
                        serde_json::Number::from(3)
                    )),
                ],
            })],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "UPPER(SUBSTRING(users.name, 1, 3))");
    }
}
