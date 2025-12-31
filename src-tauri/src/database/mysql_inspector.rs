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
                constraint_name,
                GROUP_CONCAT(column_name ORDER BY ordinal_position SEPARATOR ',') as columns
            FROM information_schema.key_column_usage
            WHERE constraint_name = 'PRIMARY'
              AND table_schema = ?
              AND table_name = ?
            GROUP BY constraint_name
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
                schema_name,
                CASE
                    WHEN schema_name IN ('mysql', 'information_schema', 'performance_schema', 'sys')
                    THEN 1
                    ELSE 0
                END as is_system
            FROM information_schema.schemata
            ORDER BY
                CASE WHEN schema_name = ? THEN 0 ELSE 1 END,
                schema_name
        "#;

        let rows = sqlx::query(query)
            .bind(&self.database_name)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get schemas: {}", e))?;

        let mut schemas = Vec::new();
        for row in rows {
            let name: String = row.get("schema_name");
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
                t.table_name,
                t.table_comment as comment,
                t.table_rows as estimated_rows
            FROM information_schema.tables t
            WHERE t.table_schema = ?
              AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
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
                table_name,
                '' as comment,
                view_definition as definition
            FROM information_schema.views
            WHERE table_schema = ?
            ORDER BY table_name
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
                column_name,
                data_type,
                column_type as display_type,
                is_nullable = 'YES' as nullable,
                column_default,
                column_key = 'PRI' as is_primary_key,
                column_key = 'MUL' as is_foreign_key,
                column_key = 'UNI' as is_unique,
                extra LIKE '%auto_increment%' as is_auto_increment,
                ordinal_position,
                column_comment as comment
            FROM information_schema.columns
            WHERE table_schema = ?
              AND table_name = ?
            ORDER BY ordinal_position
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
                index_name,
                non_unique = 0 as is_unique,
                index_name = 'PRIMARY' as is_primary,
                index_type,
                GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') as columns
            FROM information_schema.statistics
            WHERE table_schema = ?
              AND table_name = ?
            GROUP BY index_name, non_unique, index_type
            ORDER BY index_name
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
                constraint_name,
                GROUP_CONCAT(DISTINCT column_name ORDER BY ordinal_position SEPARATOR ',') as columns,
                referenced_table_schema,
                referenced_table_name,
                GROUP_CONCAT(DISTINCT referenced_column_name ORDER BY ordinal_position SEPARATOR ',') as referenced_columns
            FROM information_schema.key_column_usage
            WHERE table_schema = ?
              AND table_name = ?
              AND referenced_table_name IS NOT NULL
            GROUP BY constraint_name, referenced_table_schema, referenced_table_name
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
                table_schema as source_schema,
                table_name as source_table,
                GROUP_CONCAT(DISTINCT column_name ORDER BY ordinal_position SEPARATOR ',') as source_columns,
                GROUP_CONCAT(DISTINCT referenced_column_name ORDER BY ordinal_position SEPARATOR ',') as target_columns,
                constraint_name
            FROM information_schema.key_column_usage
            WHERE referenced_table_schema = ?
              AND referenced_table_name = ?
            GROUP BY table_schema, table_name, constraint_name
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
