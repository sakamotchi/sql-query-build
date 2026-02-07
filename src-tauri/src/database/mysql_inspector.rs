use crate::connection::{ConnectionConfig, ConnectionInfo};
use crate::models::database_structure::*;
use crate::services::database_inspector::{DatabaseInspector, TableForeignKey};
use async_trait::async_trait;
use sqlx::mysql::MySqlPool;
use sqlx::Row;
use std::collections::HashMap;

pub struct MysqlInspector {
    pool: MySqlPool,
    database_name: String,
}

impl MysqlInspector {
    pub async fn new(connection: &ConnectionInfo, password: Option<&str>) -> Result<Self, String> {
        let connection_string = connection
            .build_connection_string(password)
            .map_err(|e| format!("Failed to build connection string: {}", e))?;

        let pool = MySqlPool::connect(&connection_string)
            .await
            .map_err(|e| format!("Failed to connect: {}", e))?;

        let database_name = match &connection.connection {
            ConnectionConfig::Network(cfg) => cfg.database.clone(),
            _ => return Err("Invalid connection config for MySQL".to_string()),
        };

        Ok(Self {
            pool,
            database_name,
        })
    }

    async fn get_all_columns_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<Column>>, String> {
        let query = r#"
            SELECT
                CAST(TABLE_NAME AS CHAR) as table_name,
                CAST(COLUMN_NAME AS CHAR) as column_name,
                CAST(DATA_TYPE AS CHAR) as data_type,
                CAST(COLUMN_TYPE AS CHAR) as display_type,
                IS_NULLABLE = 'YES' as nullable,
                CAST(COLUMN_DEFAULT AS CHAR) as column_default,
                COLUMN_KEY = 'PRI' as is_primary_key,
                COLUMN_KEY = 'MUL' as is_foreign_key,
                COLUMN_KEY = 'UNI' as is_unique,
                EXTRA LIKE '%auto_increment%' as is_auto_increment,
                CAST(ORDINAL_POSITION AS SIGNED) as ordinal_position,
                CAST(COLUMN_COMMENT AS CHAR) as comment
            FROM information_schema.columns
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all columns: {}", e))?;

        let mut columns_map: HashMap<String, Vec<Column>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let nullable_int: i32 = row.get("nullable");
            let is_primary_int: i32 = row.get("is_primary_key");
            let is_foreign_int: i32 = row.get("is_foreign_key");
            let is_unique_int: i32 = row.get("is_unique");
            let is_auto_int: i32 = row.get("is_auto_increment");
            let comment: String = row.get("comment");

            let column = Column {
                name: row.get("column_name"),
                data_type: row.get("data_type"),
                display_type: row.get("display_type"),
                nullable: nullable_int != 0,
                default_value: row.get("column_default"),
                is_primary_key: is_primary_int != 0,
                is_foreign_key: is_foreign_int != 0,
                is_unique: is_unique_int != 0,
                is_auto_increment: is_auto_int != 0,
                ordinal_position: row.get("ordinal_position"),
                comment: if comment.is_empty() {
                    None
                } else {
                    Some(comment)
                },
            };

            columns_map
                .entry(table_name)
                .or_insert_with(Vec::new)
                .push(column);
        }

        Ok(columns_map)
    }

    async fn get_all_indexes_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<Index>>, String> {
        let query = r#"
            SELECT
                CAST(TABLE_NAME AS CHAR) as table_name,
                CAST(INDEX_NAME AS CHAR) as index_name,
                NON_UNIQUE = 0 as is_unique,
                INDEX_NAME = 'PRIMARY' as is_primary,
                CAST(INDEX_TYPE AS CHAR) as index_type,
                CAST(GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS CHAR) as columns
            FROM information_schema.statistics
            WHERE TABLE_SCHEMA = ?
            GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE
            ORDER BY TABLE_NAME, INDEX_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all indexes: {}", e))?;

        let mut indexes_map: HashMap<String, Vec<Index>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let is_unique_int: i32 = row.get("is_unique");
            let is_primary_int: i32 = row.get("is_primary");
            let columns_str: String = row.get("columns");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            let index = Index {
                name: row.get("index_name"),
                is_unique: is_unique_int != 0,
                is_primary: is_primary_int != 0,
                columns,
                index_type: row.get("index_type"),
            };

            indexes_map
                .entry(table_name)
                .or_insert_with(Vec::new)
                .push(index);
        }

        Ok(indexes_map)
    }

    async fn get_all_foreign_keys_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<ForeignKey>>, String> {
        let query = r#"
            SELECT
                CAST(kcu.TABLE_NAME AS CHAR) as table_name,
                CAST(kcu.CONSTRAINT_NAME AS CHAR) as constraint_name,
                CAST(GROUP_CONCAT(DISTINCT kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION SEPARATOR ',') AS CHAR) as columns,
                CAST(kcu.REFERENCED_TABLE_SCHEMA AS CHAR) as referenced_table_schema,
                CAST(kcu.REFERENCED_TABLE_NAME AS CHAR) as referenced_table_name,
                CAST(GROUP_CONCAT(DISTINCT kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION SEPARATOR ',') AS CHAR) as referenced_columns,
                CAST(COALESCE(rc.DELETE_RULE, 'NO ACTION') AS CHAR) as on_delete,
                CAST(COALESCE(rc.UPDATE_RULE, 'NO ACTION') AS CHAR) as on_update
            FROM information_schema.key_column_usage kcu
            LEFT JOIN information_schema.referential_constraints rc
              ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
             AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            WHERE kcu.TABLE_SCHEMA = ?
              AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY
                kcu.TABLE_NAME,
                kcu.CONSTRAINT_NAME,
                kcu.REFERENCED_TABLE_SCHEMA,
                kcu.REFERENCED_TABLE_NAME,
                rc.DELETE_RULE,
                rc.UPDATE_RULE
            ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all foreign keys: {}", e))?;

        let mut fks_map: HashMap<String, Vec<ForeignKey>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let columns_str: String = row.get("columns");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            let ref_columns_str: String = row.get("referenced_columns");
            let referenced_columns: Vec<String> =
                ref_columns_str.split(',').map(|s| s.to_string()).collect();

            let fk = ForeignKey {
                name: row.get("constraint_name"),
                columns,
                referenced_schema: row.get("referenced_table_schema"),
                referenced_table: row.get("referenced_table_name"),
                referenced_columns,
                on_delete: row.get("on_delete"),
                on_update: row.get("on_update"),
            };

            fks_map.entry(table_name).or_insert_with(Vec::new).push(fk);
        }

        Ok(fks_map)
    }

    async fn get_all_foreign_key_references_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<ForeignKeyReference>>, String> {
        let query = r#"
            SELECT
                CAST(REFERENCED_TABLE_NAME AS CHAR) as target_table,
                CAST(TABLE_SCHEMA AS CHAR) as source_schema,
                CAST(TABLE_NAME AS CHAR) as source_table,
                CAST(GROUP_CONCAT(DISTINCT COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as source_columns,
                CAST(GROUP_CONCAT(DISTINCT REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as target_columns,
                CAST(CONSTRAINT_NAME AS CHAR) as constraint_name
            FROM information_schema.key_column_usage
            WHERE REFERENCED_TABLE_SCHEMA = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY REFERENCED_TABLE_NAME, TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME
            ORDER BY REFERENCED_TABLE_NAME, TABLE_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all foreign key references: {}", e))?;

        let mut refs_map: HashMap<String, Vec<ForeignKeyReference>> = HashMap::new();
        for row in rows {
            let target_table: String = row.get("target_table");

            let source_columns_str: String = row.get("source_columns");
            let source_columns: Vec<String> =
                source_columns_str.split(',').map(|s| s.to_string()).collect();

            let target_columns_str: String = row.get("target_columns");
            let target_columns: Vec<String> =
                target_columns_str.split(',').map(|s| s.to_string()).collect();

            let fk_ref = ForeignKeyReference {
                source_schema: row.get("source_schema"),
                source_table: row.get("source_table"),
                source_columns,
                target_columns,
                constraint_name: row.get("constraint_name"),
            };

            refs_map
                .entry(target_table)
                .or_insert_with(Vec::new)
                .push(fk_ref);
        }

        Ok(refs_map)
    }

    async fn get_all_primary_keys_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, PrimaryKey>, String> {
        let query = r#"
            SELECT
                CAST(TABLE_NAME AS CHAR) as table_name,
                CAST(CONSTRAINT_NAME AS CHAR) as constraint_name,
                CAST(GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as columns
            FROM information_schema.key_column_usage
            WHERE CONSTRAINT_NAME = 'PRIMARY'
              AND TABLE_SCHEMA = ?
            GROUP BY TABLE_NAME, CONSTRAINT_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all primary keys: {}", e))?;

        let mut pks_map: HashMap<String, PrimaryKey> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let columns_str: String = row.get("columns");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            pks_map.insert(
                table_name,
                PrimaryKey {
                    name: row.get("constraint_name"),
                    columns,
                },
            );
        }

        Ok(pks_map)
    }
}

#[async_trait]
impl DatabaseInspector for MysqlInspector {
    async fn get_schemas(&self) -> Result<Vec<Schema>, String> {
        let query = r#"
            SELECT
                CAST(SCHEMA_NAME AS CHAR) as name,
                CASE
                    WHEN SCHEMA_NAME IN ('mysql', 'information_schema', 'performance_schema', 'sys')
                    THEN 1
                    ELSE 0
                END as is_system
            FROM information_schema.schemata
            ORDER BY
                CASE WHEN SCHEMA_NAME = ? THEN 0 ELSE 1 END,
                SCHEMA_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(&self.database_name)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get schemas: {}", e))?;

        let mut schemas = Vec::new();
        for row in rows {
            let name: String = row.get("name");
            let is_system_int: i32 = row.get("is_system");
            let is_system = is_system_int != 0;

            let tables = self.get_tables(&name).await?;
            let views = self.get_views(&name).await?;

            schemas.push(Schema {
                name,
                is_system,
                tables,
                views,
            });
        }

        Ok(schemas)
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<Table>, String> {
        let query = r#"
            SELECT
                CAST(t.TABLE_NAME AS CHAR) as table_name,
                CAST(t.TABLE_COMMENT AS CHAR) as comment,
                CAST(t.TABLE_ROWS AS SIGNED) as estimated_rows
            FROM information_schema.tables t
            WHERE t.TABLE_SCHEMA = ?
              AND t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY t.TABLE_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get tables: {}", e))?;

        let columns_map = self.get_all_columns_in_schema(schema).await?;
        let indexes_map = self.get_all_indexes_in_schema(schema).await?;
        let fks_map = self.get_all_foreign_keys_in_schema(schema).await?;
        let refs_map = self.get_all_foreign_key_references_in_schema(schema).await?;
        let pks_map = self.get_all_primary_keys_in_schema(schema).await?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.get("table_name");
            let comment: Option<String> = row.get("comment");
            let estimated_row_count: Option<i64> = row.try_get("estimated_rows").ok();

            let columns = columns_map.get(&name).cloned().unwrap_or_default();
            let indexes = indexes_map.get(&name).cloned().unwrap_or_default();
            let foreign_keys = fks_map.get(&name).cloned().unwrap_or_default();
            let referenced_by = refs_map.get(&name).cloned().unwrap_or_default();
            let primary_key = pks_map.get(&name).cloned();

            tables.push(Table {
                name,
                schema: schema.to_string(),
                comment: if comment.as_ref().map_or(true, |c| c.is_empty()) {
                    None
                } else {
                    comment
                },
                estimated_row_count,
                columns,
                primary_key,
                indexes,
                foreign_keys,
                referenced_by,
            });
        }

        Ok(tables)
    }

    async fn get_views(&self, schema: &str) -> Result<Vec<View>, String> {
        let query = r#"
            SELECT
                CAST(TABLE_NAME AS CHAR) as table_name,
                CAST('' AS CHAR) as comment,
                CAST(VIEW_DEFINITION AS CHAR) as definition
            FROM information_schema.views
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get views: {}", e))?;

        let columns_map = self.get_all_columns_in_schema(schema).await?;

        let mut views = Vec::new();
        for row in rows {
            let name: String = row.get("table_name");
            let definition: Option<String> = row.get("definition");

            let columns = columns_map.get(&name).cloned().unwrap_or_default();

            views.push(View {
                name,
                schema: schema.to_string(),
                comment: None,
                columns,
                definition,
            });
        }

        Ok(views)
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<Column>, String> {
        let query = r#"
            SELECT
                CAST(COLUMN_NAME AS CHAR) as column_name,
                CAST(DATA_TYPE AS CHAR) as data_type,
                CAST(COLUMN_TYPE AS CHAR) as display_type,
                IS_NULLABLE = 'YES' as nullable,
                CAST(COLUMN_DEFAULT AS CHAR) as column_default,
                COLUMN_KEY = 'PRI' as is_primary_key,
                COLUMN_KEY = 'MUL' as is_foreign_key,
                COLUMN_KEY = 'UNI' as is_unique,
                EXTRA LIKE '%auto_increment%' as is_auto_increment,
                CAST(ORDINAL_POSITION AS SIGNED) as ordinal_position,
                CAST(COLUMN_COMMENT AS CHAR) as comment
            FROM information_schema.columns
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get columns: {}", e))?;

        let columns = rows
            .iter()
            .map(|row| {
                let nullable_int: i32 = row.get("nullable");
                let is_primary_int: i32 = row.get("is_primary_key");
                let is_foreign_int: i32 = row.get("is_foreign_key");
                let is_unique_int: i32 = row.get("is_unique");
                let is_auto_int: i32 = row.get("is_auto_increment");
                let comment: String = row.get("comment");

                Column {
                    name: row.get("column_name"),
                    data_type: row.get("data_type"),
                    display_type: row.get("display_type"),
                    nullable: nullable_int != 0,
                    default_value: row.get("column_default"),
                    is_primary_key: is_primary_int != 0,
                    is_foreign_key: is_foreign_int != 0,
                    is_unique: is_unique_int != 0,
                    is_auto_increment: is_auto_int != 0,
                    ordinal_position: row.get("ordinal_position"),
                    comment: if comment.is_empty() {
                        None
                    } else {
                        Some(comment)
                    },
                }
            })
            .collect();

        Ok(columns)
    }

    async fn get_indexes(&self, schema: &str, table: &str) -> Result<Vec<Index>, String> {
        let query = r#"
            SELECT
                CAST(INDEX_NAME AS CHAR) as index_name,
                NON_UNIQUE = 0 as is_unique,
                INDEX_NAME = 'PRIMARY' as is_primary,
                CAST(INDEX_TYPE AS CHAR) as index_type,
                CAST(GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS CHAR) as columns
            FROM information_schema.statistics
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
            GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
            ORDER BY INDEX_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get indexes: {}", e))?;

        let indexes = rows
            .iter()
            .map(|row| {
                let is_unique_int: i32 = row.get("is_unique");
                let is_primary_int: i32 = row.get("is_primary");
                let columns_str: String = row.get("columns");
                let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

                Index {
                    name: row.get("index_name"),
                    is_unique: is_unique_int != 0,
                    is_primary: is_primary_int != 0,
                    columns,
                    index_type: row.get("index_type"),
                }
            })
            .collect();

        Ok(indexes)
    }

    async fn get_foreign_keys(&self, schema: &str, table: &str) -> Result<Vec<ForeignKey>, String> {
        let query = r#"
            SELECT
                CAST(CONSTRAINT_NAME AS CHAR) as constraint_name,
                CAST(GROUP_CONCAT(DISTINCT COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as columns,
                CAST(REFERENCED_TABLE_SCHEMA AS CHAR) as referenced_table_schema,
                CAST(REFERENCED_TABLE_NAME AS CHAR) as referenced_table_name,
                CAST(GROUP_CONCAT(DISTINCT REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as referenced_columns
            FROM information_schema.key_column_usage
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY CONSTRAINT_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get foreign keys: {}", e))?;

        let mut foreign_keys = Vec::new();
        for row in rows {
            let columns_str: String = row.get("columns");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            let ref_columns_str: String = row.get("referenced_columns");
            let referenced_columns: Vec<String> =
                ref_columns_str.split(',').map(|s| s.to_string()).collect();

            foreign_keys.push(ForeignKey {
                name: row.get("constraint_name"),
                columns,
                referenced_schema: row.get("referenced_table_schema"),
                referenced_table: row.get("referenced_table_name"),
                referenced_columns,
                on_delete: "NO ACTION".to_string(), // MySQLではさらに詳細なクエリが必要
                on_update: "NO ACTION".to_string(),
            });
        }

        Ok(foreign_keys)
    }

    async fn get_foreign_key_references(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ForeignKeyReference>, String> {
        let query = r#"
            SELECT
                CAST(TABLE_SCHEMA AS CHAR) as source_schema,
                CAST(TABLE_NAME AS CHAR) as source_table,
                CAST(GROUP_CONCAT(DISTINCT COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as source_columns,
                CAST(GROUP_CONCAT(DISTINCT REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as target_columns,
                CAST(CONSTRAINT_NAME AS CHAR) as constraint_name
            FROM information_schema.key_column_usage
            WHERE REFERENCED_TABLE_SCHEMA = ?
              AND REFERENCED_TABLE_NAME = ?
            GROUP BY TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get foreign key references: {}", e))?;

        let references = rows
            .iter()
            .map(|row| {
                let source_columns_str: String = row.get("source_columns");
                let source_columns: Vec<String> = source_columns_str
                    .split(',')
                    .map(|s| s.to_string())
                    .collect();

                let target_columns_str: String = row.get("target_columns");
                let target_columns: Vec<String> = target_columns_str
                    .split(',')
                    .map(|s| s.to_string())
                    .collect();

                ForeignKeyReference {
                    source_schema: row.get("source_schema"),
                    source_table: row.get("source_table"),
                    source_columns,
                    target_columns,
                    constraint_name: row.get("constraint_name"),
                }
            })
            .collect();

        Ok(references)
    }

    async fn get_all_foreign_keys(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<TableForeignKey>, String> {
        let schema_name = schema.unwrap_or(&self.database_name);
        let tables = self.get_tables(schema_name).await?;

        let mut all_fks = Vec::new();
        for table in tables {
            let table_name = table.name.clone();
            for fk in table.foreign_keys {
                all_fks.push(TableForeignKey {
                    schema: schema_name.to_string(),
                    table: table_name.clone(),
                    foreign_key: fk,
                });
            }
        }

        Ok(all_fks)
    }

    async fn get_table_summaries(&self) -> Result<Vec<SchemaSummary>, String> {
        let schemas_query = r#"
            SELECT
                CAST(SCHEMA_NAME AS CHAR) as name,
                CASE
                    WHEN SCHEMA_NAME IN ('mysql', 'information_schema', 'performance_schema', 'sys')
                    THEN 1
                    ELSE 0
                END as is_system
            FROM information_schema.schemata
            ORDER BY
                CASE WHEN SCHEMA_NAME = ? THEN 0 ELSE 1 END,
                SCHEMA_NAME
        "#;

        let schema_rows = sqlx::query(schemas_query)
            .bind(&self.database_name)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get schema summaries: {}", e))?;

        let mut schemas = Vec::new();
        let mut schema_index = HashMap::new();
        for row in schema_rows {
            let name: String = row.get("name");
            let is_system_int: i32 = row.get("is_system");
            let index = schemas.len();
            schema_index.insert(name.clone(), index);
            schemas.push(SchemaSummary {
                name,
                is_system: is_system_int != 0,
                tables: Vec::new(),
                views: Vec::new(),
            });
        }

        let tables_query = r#"
            SELECT
                CAST(TABLE_SCHEMA AS CHAR) as schema_name,
                CAST(TABLE_NAME AS CHAR) as table_name,
                CAST(TABLE_TYPE AS CHAR) as table_type,
                CAST(TABLE_COMMENT AS CHAR) as comment,
                CAST(TABLE_ROWS AS SIGNED) as estimated_rows
            FROM information_schema.tables
            WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
            ORDER BY
                CASE WHEN TABLE_SCHEMA = ? THEN 0 ELSE 1 END,
                TABLE_SCHEMA,
                TABLE_NAME
        "#;

        let table_rows = sqlx::query(tables_query)
            .bind(&self.database_name)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get table summaries: {}", e))?;

        for row in table_rows {
            let schema_name: String = row.get("schema_name");
            let table_type: String = row.get("table_type");
            let comment: Option<String> = row.get("comment");
            let summary = TableSummary {
                name: row.get("table_name"),
                schema: schema_name.clone(),
                comment: if comment.as_ref().map_or(true, |value| value.is_empty()) {
                    None
                } else {
                    comment
                },
                estimated_row_count: row.try_get("estimated_rows").ok(),
            };

            if let Some(idx) = schema_index.get(&schema_name) {
                if table_type == "VIEW" {
                    schemas[*idx].views.push(summary);
                } else {
                    schemas[*idx].tables.push(summary);
                }
            }
        }

        Ok(schemas)
    }

    async fn get_database_structure(&self) -> Result<DatabaseStructure, String> {
        let schemas = self.get_schemas().await?;

        Ok(DatabaseStructure {
            connection_id: String::new(), // 呼び出し元で設定
            database_name: self.database_name.clone(),
            database_type: "mysql".to_string(),
            schemas,
            fetched_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}
