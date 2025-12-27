use async_trait::async_trait;
use sqlx::postgres::PgPool;
use sqlx::Row;
use crate::connection::{ConnectionConfig, ConnectionInfo};
use crate::models::database_structure::*;
use crate::services::database_inspector::DatabaseInspector;

pub struct PostgresqlInspector {
    pool: PgPool,
    database_name: String,
}

impl PostgresqlInspector {
    pub async fn new(connection: &ConnectionInfo, password: Option<&str>) -> Result<Self, String> {
        let connection_string = connection
            .build_connection_string(password)
            .map_err(|e| format!("Failed to build connection string: {}", e))?;

        let pool = PgPool::connect(&connection_string)
            .await
            .map_err(|e| format!("Failed to connect: {}", e))?;

        let database_name = match &connection.connection {
            ConnectionConfig::Network(cfg) => cfg.database.clone(),
            _ => return Err("Invalid connection config for PostgreSQL".to_string()),
        };

        Ok(Self {
            pool,
            database_name,
        })
    }

    async fn get_primary_key(&self, schema: &str, table: &str) -> Result<Option<PrimaryKey>, String> {
        let query = r#"
            SELECT
                tc.constraint_name,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2
            GROUP BY tc.constraint_name
        "#;

        let row = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get primary key: {}", e))?;

        if let Some(row) = row {
            Ok(Some(PrimaryKey {
                name: row.get("constraint_name"),
                columns: row.get("columns"),
            }))
        } else {
            Ok(None)
        }
    }
}

#[async_trait]
impl DatabaseInspector for PostgresqlInspector {
    async fn get_schemas(&self) -> Result<Vec<Schema>, String> {
        let query = r#"
            SELECT
                schema_name,
                CASE
                    WHEN schema_name IN ('pg_catalog', 'information_schema', 'pg_toast')
                    THEN true
                    ELSE false
                END as is_system
            FROM information_schema.schemata
            WHERE schema_name NOT LIKE 'pg_temp_%'
              AND schema_name NOT LIKE 'pg_toast_temp_%'
            ORDER BY
                CASE WHEN schema_name = 'public' THEN 0 ELSE 1 END,
                schema_name
        "#;

        let rows = sqlx::query_as::<_, (String, bool)>(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get schemas: {}", e))?;

        let mut schemas = Vec::new();
        for (name, is_system) in rows {
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
                obj_description(
                    (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
                ) as comment,
                (
                    SELECT reltuples::bigint
                    FROM pg_class
                    WHERE oid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
                ) as estimated_rows
            FROM information_schema.tables t
            WHERE t.table_schema = $1
              AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
        "#;

        let rows = sqlx::query_as::<_, (String, Option<String>, Option<i64>)>(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get tables: {}", e))?;

        let mut tables = Vec::new();
        for (name, comment, estimated_row_count) in rows {
            let columns = self.get_columns(schema, &name).await?;
            let indexes = self.get_indexes(schema, &name).await?;
            let foreign_keys = self.get_foreign_keys(schema, &name).await?;
            let referenced_by = self.get_foreign_key_references(schema, &name).await?;
            let primary_key = self.get_primary_key(schema, &name).await?;

            tables.push(Table {
                name,
                schema: schema.to_string(),
                comment,
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
                v.table_name,
                obj_description(
                    (quote_ident(v.table_schema) || '.' || quote_ident(v.table_name))::regclass
                ) as comment,
                pg_get_viewdef(
                    (quote_ident(v.table_schema) || '.' || quote_ident(v.table_name))::regclass
                ) as definition
            FROM information_schema.views v
            WHERE v.table_schema = $1
            ORDER BY v.table_name
        "#;

        let rows = sqlx::query_as::<_, (String, Option<String>, Option<String>)>(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get views: {}", e))?;

        let mut views = Vec::new();
        for (name, comment, definition) in rows {
            let columns = self.get_columns(schema, &name).await?;

            views.push(View {
                name,
                schema: schema.to_string(),
                comment,
                columns,
                definition,
            });
        }

        Ok(views)
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<Column>, String> {
        let query = r#"
            SELECT
                c.column_name,
                c.data_type,
                CASE
                    WHEN c.character_maximum_length IS NOT NULL
                    THEN c.data_type || '(' || c.character_maximum_length || ')'
                    WHEN c.numeric_precision IS NOT NULL AND c.numeric_scale IS NOT NULL
                    THEN c.data_type || '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                    ELSE c.data_type
                END as display_type,
                c.is_nullable = 'YES' as nullable,
                c.column_default,
                COALESCE(
                    (SELECT true FROM information_schema.key_column_usage kcu
                     JOIN information_schema.table_constraints tc
                       ON kcu.constraint_name = tc.constraint_name
                      AND kcu.table_schema = tc.table_schema
                     WHERE tc.constraint_type = 'PRIMARY KEY'
                       AND kcu.table_schema = c.table_schema
                       AND kcu.table_name = c.table_name
                       AND kcu.column_name = c.column_name),
                    false
                ) as is_primary_key,
                COALESCE(
                    (SELECT true FROM information_schema.key_column_usage kcu
                     JOIN information_schema.table_constraints tc
                       ON kcu.constraint_name = tc.constraint_name
                      AND kcu.table_schema = tc.table_schema
                     WHERE tc.constraint_type = 'FOREIGN KEY'
                       AND kcu.table_schema = c.table_schema
                       AND kcu.table_name = c.table_name
                       AND kcu.column_name = c.column_name),
                    false
                ) as is_foreign_key,
                COALESCE(
                    (SELECT true FROM information_schema.key_column_usage kcu
                     JOIN information_schema.table_constraints tc
                       ON kcu.constraint_name = tc.constraint_name
                      AND kcu.table_schema = tc.table_schema
                     WHERE tc.constraint_type = 'UNIQUE'
                       AND kcu.table_schema = c.table_schema
                       AND kcu.table_name = c.table_name
                       AND kcu.column_name = c.column_name),
                    false
                ) as is_unique,
                c.column_default LIKE '%nextval%' as is_auto_increment,
                c.ordinal_position,
                col_description(
                    (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
                    c.ordinal_position
                ) as comment
            FROM information_schema.columns c
            WHERE c.table_schema = $1
              AND c.table_name = $2
            ORDER BY c.ordinal_position
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
                Column {
                    name: row.get("column_name"),
                    data_type: row.get("data_type"),
                    display_type: row.get("display_type"),
                    nullable: row.get("nullable"),
                    default_value: row.get("column_default"),
                    is_primary_key: row.get("is_primary_key"),
                    is_foreign_key: row.get("is_foreign_key"),
                    is_unique: row.get("is_unique"),
                    is_auto_increment: row.get("is_auto_increment"),
                    ordinal_position: row.get("ordinal_position"),
                    comment: row.get("comment"),
                }
            })
            .collect();

        Ok(columns)
    }

    async fn get_indexes(&self, schema: &str, table: &str) -> Result<Vec<Index>, String> {
        let query = r#"
            SELECT
                i.relname as index_name,
                ix.indisunique as is_unique,
                ix.indisprimary as is_primary,
                am.amname as index_type,
                array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns
            FROM pg_index ix
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_am am ON am.oid = i.relam
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE n.nspname = $1
              AND t.relname = $2
            GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
            ORDER BY i.relname
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
                Index {
                    name: row.get("index_name"),
                    is_unique: row.get("is_unique"),
                    is_primary: row.get("is_primary"),
                    columns: row.get("columns"),
                    index_type: row.get("index_type"),
                }
            })
            .collect();

        Ok(indexes)
    }

    async fn get_foreign_keys(&self, schema: &str, table: &str) -> Result<Vec<ForeignKey>, String> {
        let query = r#"
            SELECT
                tc.constraint_name,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
                ccu.table_schema as referenced_schema,
                ccu.table_name as referenced_table,
                array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
                rc.delete_rule as on_delete,
                rc.update_rule as on_update
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            JOIN information_schema.referential_constraints rc
              ON tc.constraint_name = rc.constraint_name
             AND tc.table_schema = rc.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2
            GROUP BY tc.constraint_name, ccu.table_schema, ccu.table_name,
                     rc.delete_rule, rc.update_rule
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .bind(table)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get foreign keys: {}", e))?;

        let foreign_keys = rows
            .iter()
            .map(|row| {
                ForeignKey {
                    name: row.get("constraint_name"),
                    columns: row.get("columns"),
                    referenced_schema: row.get("referenced_schema"),
                    referenced_table: row.get("referenced_table"),
                    referenced_columns: row.get("referenced_columns"),
                    on_delete: row.get("on_delete"),
                    on_update: row.get("on_update"),
                }
            })
            .collect();

        Ok(foreign_keys)
    }

    async fn get_foreign_key_references(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ForeignKeyReference>, String> {
        let query = r#"
            SELECT
                tc.table_schema as source_schema,
                tc.table_name as source_table,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as source_columns,
                array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as target_columns,
                tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_schema = $1
              AND ccu.table_name = $2
            GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
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
                ForeignKeyReference {
                    source_schema: row.get("source_schema"),
                    source_table: row.get("source_table"),
                    source_columns: row.get("source_columns"),
                    target_columns: row.get("target_columns"),
                    constraint_name: row.get("constraint_name"),
                }
            })
            .collect();

        Ok(references)
    }

    async fn get_database_structure(&self) -> Result<DatabaseStructure, String> {
        let schemas = self.get_schemas().await?;

        Ok(DatabaseStructure {
            connection_id: String::new(), // 呼び出し元で設定
            database_name: self.database_name.clone(),
            database_type: "postgresql".to_string(),
            schemas,
            fetched_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}
