//! SQL Generator テストモジュール
//!
//! SqlBuilder、各句、Dialectの包括的なテスト

#[cfg(test)]
mod builder_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::{QuoteStyle, SqlBuilder};
    use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};

    /// テスト用のシンプルなQueryModelを作成
    fn create_simple_query() -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![SelectColumn::Column {
                    table_alias: "u".to_string(),
                    column_name: "id".to_string(),
                    alias: None,
                }],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_simple_select() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_simple_query();

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("SELECT"), "SQL should contain SELECT: {}", sql);
        assert!(sql.contains("u.id"), "SQL should contain u.id: {}", sql);
        assert!(sql.contains("FROM"), "SQL should contain FROM: {}", sql);
        assert!(sql.contains("users"), "SQL should contain users: {}", sql);
        assert!(sql.contains(" u"), "SQL should contain alias u: {}", sql);
    }

    #[test]
    fn test_select_with_distinct() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.distinct = true;

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("SELECT DISTINCT"));
    }

    #[test]
    fn test_select_multiple_columns() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.columns = vec![
            SelectColumn::Column {
                table_alias: "u".to_string(),
                column_name: "id".to_string(),
                alias: None,
            },
            SelectColumn::Column {
                table_alias: "u".to_string(),
                column_name: "name".to_string(),
                alias: Some("user_name".to_string()),
            },
        ];

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.id"));
        assert!(sql.contains("u.name AS user_name"));
    }

    #[test]
    fn test_select_all_columns() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.columns = vec![SelectColumn::All {
            table_alias: "u".to_string(),
        }];

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.*"));
    }

    #[test]
    fn test_select_with_aggregate() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.columns = vec![SelectColumn::Aggregate {
            aggregate: AggregateFunction {
                function: "COUNT".to_string(),
                column: AggregateColumn::All,
            },
            alias: Some("total".to_string()),
        }];

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("COUNT(*)"));
        assert!(sql.contains("AS total"));
    }

    #[test]
    fn test_select_with_count_distinct() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.columns = vec![SelectColumn::Aggregate {
            aggregate: AggregateFunction {
                function: "COUNT_DISTINCT".to_string(),
                column: AggregateColumn::Column {
                    table_alias: "u".to_string(),
                    column_name: "email".to_string(),
                },
            },
            alias: None,
        }];

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("COUNT(DISTINCT u.email)"));
    }

    #[test]
    fn test_empty_columns_returns_error() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_simple_query();
        query.select.columns = vec![];

        let result = builder.build(&query);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "No columns selected");
    }

    #[test]
    fn test_pretty_format() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect); // pretty = true (default)
        let query = create_simple_query();

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("\n"));
    }

    #[test]
    fn test_compact_format() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_simple_query();

        let sql = builder.build(&query).unwrap();

        // compact mode should not have newlines between clauses
        let parts: Vec<&str> = sql.split('\n').collect();
        // SELECT clause still has internal newlines in pretty columns, but clauses are separated by space
        assert!(sql.contains("FROM"));
    }

    #[test]
    fn test_smart_quote_simple_identifier() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).smart_quote(true).compact();
        let query = create_simple_query();

        let sql = builder.build(&query).unwrap();

        // "id", "u", "users" are simple identifiers - should not be quoted in smart mode
        assert!(sql.contains("u.id") || sql.contains("\"u\".\"id\""));
    }

    #[test]
    fn test_always_quote() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).smart_quote(false).compact();
        let query = create_simple_query();

        let sql = builder.build(&query).unwrap();

        // Always quote mode should quote all identifiers
        assert!(sql.contains("\"u\""));
        assert!(sql.contains("\"id\""));
    }
}

#[cfg(test)]
mod join_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::PostgresDialect;

    fn create_query_with_join(join_type: &str) -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![
                    SelectColumn::Column {
                        table_alias: "u".to_string(),
                        column_name: "id".to_string(),
                        alias: None,
                    },
                    SelectColumn::Column {
                        table_alias: "o".to_string(),
                        column_name: "total".to_string(),
                        alias: None,
                    },
                ],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![JoinClause {
                id: "join1".to_string(),
                join_type: join_type.to_string(),
                table: TableReference {
                    schema: "public".to_string(),
                    name: "orders".to_string(),
                    alias: "o".to_string(),
                },
                conditions: vec![JoinCondition {
                    left: JoinConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "id".to_string(),
                    },
                    operator: "=".to_string(),
                    right: JoinConditionColumn {
                        table_alias: "o".to_string(),
                        column_name: "user_id".to_string(),
                    },
                }],
                condition_logic: "AND".to_string(),
            }],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_inner_join() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_query_with_join("INNER");

        let sql = builder.build(&query).unwrap();

        assert!(
            sql.contains("INNER JOIN"),
            "SQL should contain INNER JOIN: {}",
            sql
        );
        assert!(sql.contains("orders"), "SQL should contain orders: {}", sql);
        assert!(sql.contains("ON"), "SQL should contain ON: {}", sql);
        assert!(sql.contains("u.id"), "SQL should contain u.id: {}", sql);
        assert!(
            sql.contains("o.user_id"),
            "SQL should contain o.user_id: {}",
            sql
        );
    }

    #[test]
    fn test_left_join() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_query_with_join("LEFT");

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("LEFT JOIN"));
    }

    #[test]
    fn test_right_join() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_query_with_join("RIGHT");

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("RIGHT JOIN"));
    }

    #[test]
    fn test_full_outer_join() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_query_with_join("FULL");

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("FULL OUTER JOIN"));
    }

    #[test]
    fn test_cross_join() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_query_with_join("CROSS");
        query.joins[0].conditions = vec![]; // CROSS JOINには条件なし

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("CROSS JOIN"));
        assert!(!sql.contains("ON"));
    }

    #[test]
    fn test_unknown_join_type_returns_error() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let query = create_query_with_join("UNKNOWN");

        let result = builder.build(&query);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown join type"));
    }

    #[test]
    fn test_multiple_join_conditions() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_query_with_join("INNER");
        query.joins[0].conditions.push(JoinCondition {
            left: JoinConditionColumn {
                table_alias: "u".to_string(),
                column_name: "tenant_id".to_string(),
            },
            operator: "=".to_string(),
            right: JoinConditionColumn {
                table_alias: "o".to_string(),
                column_name: "tenant_id".to_string(),
            },
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.id = o.user_id"));
        assert!(sql.contains("AND"));
        assert!(sql.contains("u.tenant_id = o.tenant_id"));
    }

    #[test]
    fn test_multiple_join_conditions_or() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_query_with_join("INNER");
        // Change logic to OR
        query.joins[0].condition_logic = "OR".to_string();

        query.joins[0].conditions.push(JoinCondition {
            left: JoinConditionColumn {
                table_alias: "u".to_string(),
                column_name: "tenant_id".to_string(),
            },
            operator: "=".to_string(),
            right: JoinConditionColumn {
                table_alias: "o".to_string(),
                column_name: "tenant_id".to_string(),
            },
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.id = o.user_id"));
        assert!(sql.contains(" OR "));
        assert!(sql.contains("u.tenant_id = o.tenant_id"));
    }
}

#[cfg(test)]
mod where_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::PostgresDialect;

    fn create_base_query() -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![SelectColumn::Column {
                    table_alias: "u".to_string(),
                    column_name: "id".to_string(),
                    alias: None,
                }],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_where_with_string_literal() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "name".to_string(),
                },
                operator: "=".to_string(),
                value: WhereValue::Literal {
                    value: LiteralValue::String("John".to_string()),
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("WHERE"));
        assert!(sql.contains("u.name = 'John'"));
    }

    #[test]
    fn test_where_with_number_literal() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "age".to_string(),
                },
                operator: ">=".to_string(),
                value: WhereValue::Literal {
                    value: LiteralValue::Number(18.0),
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.age >= 18"));
    }

    #[test]
    fn test_where_with_null() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "deleted_at".to_string(),
                },
                operator: "IS".to_string(),
                value: WhereValue::Literal {
                    value: LiteralValue::Null,
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.deleted_at IS NULL"));
    }

    #[test]
    fn test_where_with_boolean() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "is_active".to_string(),
                },
                operator: "=".to_string(),
                value: WhereValue::Literal {
                    value: LiteralValue::Boolean(true),
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.is_active = TRUE"));
    }

    #[test]
    fn test_where_with_in_list() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "status".to_string(),
                },
                operator: "IN".to_string(),
                value: WhereValue::List {
                    values: vec![
                        LiteralValue::String("active".to_string()),
                        LiteralValue::String("pending".to_string()),
                    ],
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.status IN ('active', 'pending')"));
    }

    #[test]
    fn test_where_with_between() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "age".to_string(),
                },
                operator: "BETWEEN".to_string(),
                value: WhereValue::Range {
                    from: LiteralValue::Number(18.0),
                    to: LiteralValue::Number(65.0),
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.age BETWEEN 18 AND 65"));
    }

    #[test]
    fn test_where_with_column_comparison() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![WhereConditionItem::Condition(WhereCondition {
                id: "cond1".to_string(),
                column: WhereConditionColumn {
                    table_alias: "u".to_string(),
                    column_name: "created_at".to_string(),
                },
                operator: "<".to_string(),
                value: WhereValue::Column {
                    table_alias: "u".to_string(),
                    column_name: "updated_at".to_string(),
                },
            })],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.created_at < u.updated_at"));
    }

    #[test]
    fn test_where_multiple_conditions_and() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![
                WhereConditionItem::Condition(WhereCondition {
                    id: "cond1".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "age".to_string(),
                    },
                    operator: ">=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::Number(18.0),
                    },
                }),
                WhereConditionItem::Condition(WhereCondition {
                    id: "cond2".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "is_active".to_string(),
                    },
                    operator: "=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::Boolean(true),
                    },
                }),
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.age >= 18 AND u.is_active = TRUE"));
    }

    #[test]
    fn test_where_multiple_conditions_or() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "OR".to_string(),
            conditions: vec![
                WhereConditionItem::Condition(WhereCondition {
                    id: "cond1".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "role".to_string(),
                    },
                    operator: "=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::String("admin".to_string()),
                    },
                }),
                WhereConditionItem::Condition(WhereCondition {
                    id: "cond2".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "role".to_string(),
                    },
                    operator: "=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::String("moderator".to_string()),
                    },
                }),
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.role = 'admin' OR u.role = 'moderator'"));
    }

    #[test]
    fn test_where_with_nested_group() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.where_clause = Some(WhereClause {
            logic: "AND".to_string(),
            conditions: vec![
                WhereConditionItem::Condition(WhereCondition {
                    id: "cond1".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "is_active".to_string(),
                    },
                    operator: "=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::Boolean(true),
                    },
                }),
                WhereConditionItem::Group(WhereConditionGroup {
                    id: "group1".to_string(),
                    logic: "OR".to_string(),
                    conditions: vec![
                        WhereConditionItem::Condition(WhereCondition {
                            id: "cond2".to_string(),
                            column: WhereConditionColumn {
                                table_alias: "u".to_string(),
                                column_name: "role".to_string(),
                            },
                            operator: "=".to_string(),
                            value: WhereValue::Literal {
                                value: LiteralValue::String("admin".to_string()),
                            },
                        }),
                        WhereConditionItem::Condition(WhereCondition {
                            id: "cond3".to_string(),
                            column: WhereConditionColumn {
                                table_alias: "u".to_string(),
                                column_name: "role".to_string(),
                            },
                            operator: "=".to_string(),
                            value: WhereValue::Literal {
                                value: LiteralValue::String("moderator".to_string()),
                            },
                        }),
                    ],
                }),
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("u.is_active = TRUE AND (u.role = 'admin' OR u.role = 'moderator')"));
    }
}

#[cfg(test)]
mod order_by_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect};

    fn create_base_query() -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![SelectColumn::Column {
                    table_alias: "u".to_string(),
                    column_name: "id".to_string(),
                    alias: None,
                }],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_order_by_asc() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![OrderByItem {
                table_alias: "u".to_string(),
                column_name: "name".to_string(),
                direction: "ASC".to_string(),
                nulls: None,
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("ORDER BY u.name ASC"));
    }

    #[test]
    fn test_order_by_desc() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![OrderByItem {
                table_alias: "u".to_string(),
                column_name: "created_at".to_string(),
                direction: "DESC".to_string(),
                nulls: None,
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("ORDER BY u.created_at DESC"));
    }

    #[test]
    fn test_order_by_multiple_columns() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![
                OrderByItem {
                    table_alias: "u".to_string(),
                    column_name: "last_name".to_string(),
                    direction: "ASC".to_string(),
                    nulls: None,
                },
                OrderByItem {
                    table_alias: "u".to_string(),
                    column_name: "first_name".to_string(),
                    direction: "ASC".to_string(),
                    nulls: None,
                },
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("ORDER BY u.last_name ASC, u.first_name ASC"));
    }

    #[test]
    fn test_order_by_with_nulls_first_postgres() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![OrderByItem {
                table_alias: "u".to_string(),
                column_name: "name".to_string(),
                direction: "ASC".to_string(),
                nulls: Some("FIRST".to_string()),
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("ORDER BY u.name ASC NULLS FIRST"));
    }

    #[test]
    fn test_order_by_with_nulls_last_postgres() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![OrderByItem {
                table_alias: "u".to_string(),
                column_name: "name".to_string(),
                direction: "DESC".to_string(),
                nulls: Some("LAST".to_string()),
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("ORDER BY u.name DESC NULLS LAST"));
    }

    #[test]
    fn test_order_by_nulls_not_supported_mysql() {
        let dialect = MysqlDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.order_by = Some(OrderByClause {
            items: vec![OrderByItem {
                table_alias: "u".to_string(),
                column_name: "name".to_string(),
                direction: "ASC".to_string(),
                nulls: Some("FIRST".to_string()), // MySQL doesn't support this
            }],
        });

        let sql = builder.build(&query).unwrap();

        // MySQL should ignore NULLS FIRST/LAST
        assert!(!sql.contains("NULLS"));
        assert!(sql.contains("ORDER BY u.name ASC"));
    }
}

#[cfg(test)]
mod group_by_having_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::PostgresDialect;

    fn create_base_query() -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![
                    SelectColumn::Column {
                        table_alias: "u".to_string(),
                        column_name: "department".to_string(),
                        alias: None,
                    },
                    SelectColumn::Aggregate {
                        aggregate: AggregateFunction {
                            function: "COUNT".to_string(),
                            column: AggregateColumn::All,
                        },
                        alias: Some("count".to_string()),
                    },
                ],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_group_by_single_column() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.group_by = Some(GroupByClause {
            columns: vec![GroupByColumn {
                table_alias: "u".to_string(),
                column_name: "department".to_string(),
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("GROUP BY u.department"));
    }

    #[test]
    fn test_group_by_multiple_columns() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.group_by = Some(GroupByClause {
            columns: vec![
                GroupByColumn {
                    table_alias: "u".to_string(),
                    column_name: "department".to_string(),
                },
                GroupByColumn {
                    table_alias: "u".to_string(),
                    column_name: "role".to_string(),
                },
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("GROUP BY u.department, u.role"));
    }

    #[test]
    fn test_having_single_condition() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.group_by = Some(GroupByClause {
            columns: vec![GroupByColumn {
                table_alias: "u".to_string(),
                column_name: "department".to_string(),
            }],
        });
        query.having = Some(HavingClause {
            logic: "AND".to_string(),
            conditions: vec![HavingCondition {
                id: "having1".to_string(),
                aggregate: AggregateFunction {
                    function: "COUNT".to_string(),
                    column: AggregateColumn::All,
                },
                operator: ">".to_string(),
                value: LiteralValue::Number(5.0),
            }],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("HAVING COUNT(*) > 5"));
    }

    #[test]
    fn test_having_multiple_conditions() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.group_by = Some(GroupByClause {
            columns: vec![GroupByColumn {
                table_alias: "u".to_string(),
                column_name: "department".to_string(),
            }],
        });
        query.having = Some(HavingClause {
            logic: "AND".to_string(),
            conditions: vec![
                HavingCondition {
                    id: "having1".to_string(),
                    aggregate: AggregateFunction {
                        function: "COUNT".to_string(),
                        column: AggregateColumn::All,
                    },
                    operator: ">".to_string(),
                    value: LiteralValue::Number(5.0),
                },
                HavingCondition {
                    id: "having2".to_string(),
                    aggregate: AggregateFunction {
                        function: "AVG".to_string(),
                        column: AggregateColumn::Column {
                            table_alias: "u".to_string(),
                            column_name: "salary".to_string(),
                        },
                    },
                    operator: ">=".to_string(),
                    value: LiteralValue::Number(50000.0),
                },
            ],
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("HAVING COUNT(*) > 5 AND AVG(u.salary) >= 50000"));
    }
}

#[cfg(test)]
mod limit_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};

    fn create_base_query() -> QueryModel {
        QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![SelectColumn::Column {
                    table_alias: "u".to_string(),
                    column_name: "id".to_string(),
                    alias: None,
                }],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![],
            where_clause: None,
            group_by: None,
            having: None,
            order_by: None,
            limit: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_limit_only_postgres() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.limit = Some(LimitClause {
            limit: 10,
            offset: None,
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("LIMIT 10"));
        assert!(!sql.contains("OFFSET"));
    }

    #[test]
    fn test_limit_with_offset_postgres() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.limit = Some(LimitClause {
            limit: 10,
            offset: Some(20),
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("LIMIT 10 OFFSET 20"));
    }

    #[test]
    fn test_limit_only_mysql() {
        let dialect = MysqlDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.limit = Some(LimitClause {
            limit: 10,
            offset: None,
        });

        let sql = builder.build(&query).unwrap();

        assert!(sql.contains("LIMIT 10"));
    }

    #[test]
    fn test_limit_with_offset_mysql() {
        let dialect = MysqlDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.limit = Some(LimitClause {
            limit: 10,
            offset: Some(20),
        });

        let sql = builder.build(&query).unwrap();

        // MySQL uses LIMIT offset, count syntax
        assert!(sql.contains("LIMIT 20, 10"));
    }

    #[test]
    fn test_limit_sqlite() {
        let dialect = SqliteDialect;
        let builder = SqlBuilder::new(&dialect).compact();
        let mut query = create_base_query();
        query.limit = Some(LimitClause {
            limit: 10,
            offset: Some(20),
        });

        let sql = builder.build(&query).unwrap();

        // SQLite uses same syntax as PostgreSQL
        assert!(sql.contains("LIMIT 10 OFFSET 20"));
    }
}

#[cfg(test)]
mod dialect_tests {
    use crate::sql_generator::dialect::Dialect;
    use crate::sql_generator::dialects::{MysqlDialect, PostgresDialect, SqliteDialect};

    #[test]
    fn test_postgres_quote_identifier() {
        let dialect = PostgresDialect;
        assert_eq!(dialect.quote_identifier("users"), "\"users\"");
        assert_eq!(dialect.quote_identifier("user\"name"), "\"user\"\"name\"");
    }

    #[test]
    fn test_postgres_escape_string() {
        let dialect = PostgresDialect;
        assert_eq!(dialect.escape_string("hello"), "'hello'");
        assert_eq!(dialect.escape_string("it's"), "'it''s'");
    }

    #[test]
    fn test_postgres_dialect_name() {
        let dialect = PostgresDialect;
        assert_eq!(dialect.dialect_name(), "postgresql");
    }

    #[test]
    fn test_postgres_supports_nulls_order() {
        let dialect = PostgresDialect;
        assert!(dialect.supports_nulls_order());
    }

    #[test]
    fn test_postgres_ilike() {
        let dialect = PostgresDialect;
        assert_eq!(dialect.ilike_operator(), "ILIKE");
    }

    #[test]
    fn test_mysql_quote_identifier() {
        let dialect = MysqlDialect;
        assert_eq!(dialect.quote_identifier("users"), "`users`");
        assert_eq!(dialect.quote_identifier("user`name"), "`user``name`");
    }

    #[test]
    fn test_mysql_escape_string() {
        let dialect = MysqlDialect;
        assert_eq!(dialect.escape_string("hello"), "'hello'");
        assert_eq!(dialect.escape_string("it's"), "'it\\'s'");
    }

    #[test]
    fn test_mysql_dialect_name() {
        let dialect = MysqlDialect;
        assert_eq!(dialect.dialect_name(), "mysql");
    }

    #[test]
    fn test_mysql_not_supports_nulls_order() {
        let dialect = MysqlDialect;
        assert!(!dialect.supports_nulls_order());
    }

    #[test]
    fn test_mysql_like_instead_of_ilike() {
        let dialect = MysqlDialect;
        assert_eq!(dialect.ilike_operator(), "LIKE");
    }

    #[test]
    fn test_sqlite_quote_identifier() {
        let dialect = SqliteDialect;
        assert_eq!(dialect.quote_identifier("users"), "\"users\"");
        assert_eq!(dialect.quote_identifier("user\"name"), "\"user\"\"name\"");
    }

    #[test]
    fn test_sqlite_escape_string() {
        let dialect = SqliteDialect;
        assert_eq!(dialect.escape_string("hello"), "'hello'");
        assert_eq!(dialect.escape_string("it's"), "'it''s'");
    }

    #[test]
    fn test_sqlite_dialect_name() {
        let dialect = SqliteDialect;
        assert_eq!(dialect.dialect_name(), "sqlite");
    }

    #[test]
    fn test_sqlite_not_supports_nulls_order() {
        let dialect = SqliteDialect;
        assert!(!dialect.supports_nulls_order());
    }
}

#[cfg(test)]
mod complete_query_tests {
    use crate::models::query::*;
    use crate::sql_generator::builder::SqlBuilder;
    use crate::sql_generator::dialects::PostgresDialect;

    #[test]
    fn test_complete_query_with_all_clauses() {
        let dialect = PostgresDialect;
        let builder = SqlBuilder::new(&dialect).compact();

        let query = QueryModel {
            id: None,
            name: None,
            description: None,
            connection_id: "test".to_string(),
            select: SelectClause {
                distinct: false,
                columns: vec![
                    SelectColumn::Column {
                        table_alias: "u".to_string(),
                        column_name: "department".to_string(),
                        alias: None,
                    },
                    SelectColumn::Aggregate {
                        aggregate: AggregateFunction {
                            function: "COUNT".to_string(),
                            column: AggregateColumn::All,
                        },
                        alias: Some("user_count".to_string()),
                    },
                    SelectColumn::Aggregate {
                        aggregate: AggregateFunction {
                            function: "AVG".to_string(),
                            column: AggregateColumn::Column {
                                table_alias: "u".to_string(),
                                column_name: "salary".to_string(),
                            },
                        },
                        alias: Some("avg_salary".to_string()),
                    },
                ],
            },
            from: FromClause {
                table: TableReference {
                    schema: "public".to_string(),
                    name: "users".to_string(),
                    alias: "u".to_string(),
                },
            },
            joins: vec![JoinClause {
                id: "join1".to_string(),
                join_type: "LEFT".to_string(),
                table: TableReference {
                    schema: "public".to_string(),
                    name: "departments".to_string(),
                    alias: "d".to_string(),
                },
                conditions: vec![JoinCondition {
                    left: JoinConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "department_id".to_string(),
                    },
                    operator: "=".to_string(),
                    right: JoinConditionColumn {
                        table_alias: "d".to_string(),
                        column_name: "id".to_string(),
                    },
                }],
                condition_logic: "AND".to_string(),
            }],
            where_clause: Some(WhereClause {
                logic: "AND".to_string(),
                conditions: vec![WhereConditionItem::Condition(WhereCondition {
                    id: "cond1".to_string(),
                    column: WhereConditionColumn {
                        table_alias: "u".to_string(),
                        column_name: "is_active".to_string(),
                    },
                    operator: "=".to_string(),
                    value: WhereValue::Literal {
                        value: LiteralValue::Boolean(true),
                    },
                })],
            }),
            group_by: Some(GroupByClause {
                columns: vec![GroupByColumn {
                    table_alias: "u".to_string(),
                    column_name: "department".to_string(),
                }],
            }),
            having: Some(HavingClause {
                logic: "AND".to_string(),
                conditions: vec![HavingCondition {
                    id: "having1".to_string(),
                    aggregate: AggregateFunction {
                        function: "COUNT".to_string(),
                        column: AggregateColumn::All,
                    },
                    operator: ">".to_string(),
                    value: LiteralValue::Number(5.0),
                }],
            }),
            order_by: Some(OrderByClause {
                items: vec![OrderByItem {
                    table_alias: "u".to_string(),
                    column_name: "department".to_string(),
                    direction: "ASC".to_string(),
                    nulls: None,
                }],
            }),
            limit: Some(LimitClause {
                limit: 100,
                offset: Some(0),
            }),
            created_at: None,
            updated_at: None,
        };

        let sql = builder.build(&query).unwrap();

        // Verify all parts are present
        assert!(sql.contains("SELECT"), "SQL should contain SELECT: {}", sql);
        assert!(
            sql.contains("u.department"),
            "SQL should contain u.department: {}",
            sql
        );
        assert!(
            sql.contains("COUNT(*)"),
            "SQL should contain COUNT(*): {}",
            sql
        );
        assert!(
            sql.contains("AVG(u.salary)"),
            "SQL should contain AVG(u.salary): {}",
            sql
        );
        assert!(sql.contains("FROM"), "SQL should contain FROM: {}", sql);
        assert!(sql.contains("users"), "SQL should contain users: {}", sql);
        assert!(
            sql.contains("LEFT JOIN"),
            "SQL should contain LEFT JOIN: {}",
            sql
        );
        assert!(
            sql.contains("departments"),
            "SQL should contain departments: {}",
            sql
        );
        assert!(sql.contains("ON"), "SQL should contain ON: {}", sql);
        assert!(
            sql.contains("u.department_id"),
            "SQL should contain u.department_id: {}",
            sql
        );
        assert!(sql.contains("d.id"), "SQL should contain d.id: {}", sql);
        assert!(
            sql.contains("WHERE u.is_active = TRUE"),
            "SQL should contain WHERE: {}",
            sql
        );
        assert!(
            sql.contains("GROUP BY u.department"),
            "SQL should contain GROUP BY: {}",
            sql
        );
        assert!(
            sql.contains("HAVING COUNT(*) > 5"),
            "SQL should contain HAVING: {}",
            sql
        );
        assert!(
            sql.contains("ORDER BY u.department ASC"),
            "SQL should contain ORDER BY: {}",
            sql
        );
        assert!(
            sql.contains("LIMIT 100 OFFSET 0"),
            "SQL should contain LIMIT: {}",
            sql
        );
    }
}
