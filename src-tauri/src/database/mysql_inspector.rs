use crate::connection::{ConnectionConfig, ConnectionInfo};
use crate::models::database_structure::*;
use crate::services::database_inspector::{DatabaseInspector, TableForeignKey};
use async_trait::async_trait;
use sqlx::mysql::MySqlPool;
use sqlx::Row;

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

    async fn get_primary_key(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Option<PrimaryKey>, String> {
        let query = r#"
            SELECT
                CAST(CONSTRAINT_NAME AS CHAR) as constraint_name,
                CAST(GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS CHAR) as columns
            FROM information_schema.key_column_usage
            WHERE CONSTRAINT_NAME = 'PRIMARY'
              AND TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
            GROUP BY CONSTRAINT_NAME
        "#;

        let row = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get primary key: {}", e))?;

        if let Some(row) = row {
            let columns_str: String = row.get("columns");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            Ok(Some(PrimaryKey {
                name: row.get("constraint_name"),
                columns,
            }))
        } else {
            Ok(None)
        }
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

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.get("table_name");
            let comment: Option<String> = row.get("comment");
            let estimated_row_count: Option<i64> = row.try_get("estimated_rows").ok();

            let columns = self.get_columns(schema, &name).await?;
            let indexes = self.get_indexes(schema, &name).await?;
            let foreign_keys = self.get_foreign_keys(schema, &name).await?;
            let referenced_by = self.get_foreign_key_references(schema, &name).await?;
            let primary_key = self.get_primary_key(schema, &name).await?;

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

        let mut views = Vec::new();
        for row in rows {
            let name: String = row.get("table_name");
            let definition: Option<String> = row.get("definition");

            let columns = self.get_columns(schema, &name).await?;

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
