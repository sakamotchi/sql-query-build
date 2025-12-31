use crate::models::{
    database_structure::{Column, ForeignKey},
    join_suggestion::{JoinCondition, JoinSuggestion},
};
use crate::services::database_inspector::TableForeignKey;
use std::collections::HashMap;

/// JOIN提案を生成するシンプルなエンジン
pub struct JoinSuggestionEngine {
    foreign_keys: Vec<TableForeignKey>,
    table_columns: HashMap<String, Vec<Column>>,
}

impl JoinSuggestionEngine {
    pub fn new(
        foreign_keys: Vec<TableForeignKey>,
        table_columns: HashMap<String, Vec<Column>>,
    ) -> Self {
        Self {
            foreign_keys,
            table_columns,
        }
    }

    /// テーブル間のJOIN候補を提案
    pub fn suggest_joins(&self, from_table: &str, to_table: &str) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        suggestions.extend(self.suggest_by_foreign_keys(from_table, to_table));
        suggestions.extend(self.suggest_by_column_names(from_table, to_table));

        suggestions.sort_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        suggestions
    }

    fn suggest_by_foreign_keys(&self, from_table: &str, to_table: &str) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        for table_fk in &self.foreign_keys {
            let fk: &ForeignKey = &table_fk.foreign_key;

            if table_fk.table == from_table && fk.referenced_table == to_table {
                let conditions = fk
                    .columns
                    .iter()
                    .zip(fk.referenced_columns.iter())
                    .map(|(from_col, to_col)| JoinCondition {
                        left_column: format!("{}.{}", from_table, from_col),
                        operator: "=".to_string(),
                        right_column: format!("{}.{}", to_table, to_col),
                    })
                    .collect();

                suggestions.push(JoinSuggestion {
                    from_table: from_table.to_string(),
                    to_table: to_table.to_string(),
                    join_type: "LEFT JOIN".to_string(),
                    conditions,
                    confidence: 1.0,
                    reason: format!("外部キー制約 '{}' に基づく", fk.name),
                });
            }

            if table_fk.table == to_table && fk.referenced_table == from_table {
                let conditions = fk
                    .columns
                    .iter()
                    .zip(fk.referenced_columns.iter())
                    .map(|(from_col, to_col)| JoinCondition {
                        left_column: format!("{}.{}", from_table, to_col),
                        operator: "=".to_string(),
                        right_column: format!("{}.{}", to_table, from_col),
                    })
                    .collect();

                suggestions.push(JoinSuggestion {
                    from_table: from_table.to_string(),
                    to_table: to_table.to_string(),
                    join_type: "INNER JOIN".to_string(),
                    conditions,
                    confidence: 1.0,
                    reason: format!("外部キー制約 '{}' に基づく（逆方向）", fk.name),
                });
            }
        }

        suggestions
    }

    fn suggest_by_column_names(&self, from_table: &str, to_table: &str) -> Vec<JoinSuggestion> {
        let mut suggestions = Vec::new();

        let from_columns = self.get_table_columns(from_table);
        let to_columns = self.get_table_columns(to_table);
        let to_table_key = to_table.trim_end_matches('s');
        let from_table_key = from_table.trim_end_matches('s');

        for from_col in from_columns {
            for to_col in to_columns {
                // 完全一致
                if from_col.name == to_col.name {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "INNER JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.7,
                        reason: format!("カラム名の一致: '{}'", from_col.name),
                    });
                }

                // パターン: xxx_id -> id
                let matches_to_table = from_col.name == format!("{}_id", to_table)
                    || (!to_table_key.is_empty()
                        && from_col.name == format!("{}_id", to_table_key));

                if matches_to_table && to_col.name == "id" {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "LEFT JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.8,
                        reason: format!(
                            "カラム名パターン: '{}.{}' → '{}.{}'",
                            from_table, from_col.name, to_table, to_col.name
                        ),
                    });
                }

                // 逆パターン: id -> xxx_id
                let matches_from_table = to_col.name == format!("{}_id", from_table)
                    || (!from_table_key.is_empty()
                        && to_col.name == format!("{}_id", from_table_key));

                if from_col.name == "id" && matches_from_table {
                    suggestions.push(JoinSuggestion {
                        from_table: from_table.to_string(),
                        to_table: to_table.to_string(),
                        join_type: "INNER JOIN".to_string(),
                        conditions: vec![JoinCondition {
                            left_column: format!("{}.{}", from_table, from_col.name),
                            operator: "=".to_string(),
                            right_column: format!("{}.{}", to_table, to_col.name),
                        }],
                        confidence: 0.8,
                        reason: format!(
                            "カラム名パターン: '{}.{}' ← '{}.{}'",
                            from_table, from_col.name, to_table, to_col.name
                        ),
                    });
                }
            }
        }

        suggestions
    }

    fn get_table_columns(&self, table_name: &str) -> &[Column] {
        self.table_columns
            .get(table_name)
            .map(|cols| cols.as_slice())
            .unwrap_or(&[])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn column(name: &str) -> Column {
        Column {
            name: name.to_string(),
            data_type: "text".to_string(),
            display_type: "text".to_string(),
            nullable: true,
            default_value: None,
            is_primary_key: false,
            is_foreign_key: false,
            is_unique: false,
            is_auto_increment: false,
            ordinal_position: 1,
            comment: None,
        }
    }

    fn fk(
        table: &str,
        referenced_table: &str,
        columns: Vec<&str>,
        referenced_columns: Vec<&str>,
    ) -> TableForeignKey {
        TableForeignKey {
            schema: "public".to_string(),
            table: table.to_string(),
            foreign_key: ForeignKey {
                name: format!("fk_{}_{}", table, referenced_table),
                columns: columns.into_iter().map(|c| c.to_string()).collect(),
                referenced_schema: "public".to_string(),
                referenced_table: referenced_table.to_string(),
                referenced_columns: referenced_columns
                    .into_iter()
                    .map(|c| c.to_string())
                    .collect(),
                on_delete: "NO ACTION".to_string(),
                on_update: "NO ACTION".to_string(),
            },
        }
    }

    #[test]
    fn test_suggest_by_foreign_keys() {
        let foreign_keys = vec![fk("orders", "users", vec!["user_id"], vec!["id"])];
        let columns = HashMap::new();
        let engine = JoinSuggestionEngine::new(foreign_keys, columns);

        let suggestions = engine.suggest_joins("orders", "users");

        assert_eq!(suggestions.len(), 1);
        let suggestion = &suggestions[0];
        assert_eq!(suggestion.confidence, 1.0);
        assert_eq!(suggestion.join_type, "LEFT JOIN");
        assert_eq!(suggestion.conditions.len(), 1);
        assert_eq!(suggestion.conditions[0].left_column, "orders.user_id");
        assert_eq!(suggestion.conditions[0].right_column, "users.id");
    }

    #[test]
    fn test_suggest_by_column_names() {
        let mut table_columns = HashMap::new();
        table_columns.insert("orders".to_string(), vec![column("user_id"), column("id")]);
        table_columns.insert("users".to_string(), vec![column("id"), column("email")]);

        let engine = JoinSuggestionEngine::new(Vec::new(), table_columns);
        let suggestions = engine.suggest_joins("orders", "users");

        assert!(
            suggestions
                .iter()
                .any(|s| s.reason.contains("カラム名パターン")),
            "expected pattern based suggestion"
        );
        assert!(
            suggestions.iter().any(|s| s.confidence == 0.8),
            "expected high confidence for pattern match"
        );
    }

    #[test]
    fn test_suggest_joins_sorting() {
        let mut table_columns = HashMap::new();
        table_columns.insert("a".to_string(), vec![column("id"), column("b_id")]);
        table_columns.insert("b".to_string(), vec![column("id")]);

        let foreign_keys = vec![fk("b", "a", vec!["id"], vec!["id"])];
        let engine = JoinSuggestionEngine::new(foreign_keys, table_columns);

        let suggestions = engine.suggest_joins("a", "b");

        assert!(!suggestions.is_empty());
        let top_confidence = suggestions.first().unwrap().confidence;
        assert!(
            suggestions.iter().all(|s| s.confidence <= top_confidence),
            "suggestions should be sorted by confidence desc"
        );
        assert_eq!(top_confidence, 1.0);
    }
}
