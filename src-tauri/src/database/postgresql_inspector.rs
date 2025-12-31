use crate::connection::{ConnectionConfig, ConnectionInfo};
use crate::models::database_structure::*;
use crate::services::database_inspector::{DatabaseInspector, TableForeignKey};
use async_trait::async_trait;
use sqlx::postgres::PgPool;
use sqlx::Row;
use std::collections::HashMap;

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

    /// スキーマ全体のカラム情報を一括取得
    async fn get_all_columns_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<Column>>, String> {
        let query = r#"
            SELECT
                c.table_name,
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
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_primary_key,
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_foreign_key,
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'UNIQUE'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_unique,
                COALESCE(c.column_default LIKE '%nextval%', false) as is_auto_increment,
                c.ordinal_position,
                col_description(
                    (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
                    c.ordinal_position
                ) as comment
            FROM information_schema.columns c
            WHERE c.table_schema = $1
            ORDER BY c.table_name, c.ordinal_position
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all columns: {}", e))?;

        let mut columns_map: HashMap<String, Vec<Column>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let column = Column {
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
            };

            columns_map.entry(table_name).or_insert_with(Vec::new).push(column);
        }

        Ok(columns_map)
    }

    /// スキーマ全体のインデックス情報を一括取得
    async fn get_all_indexes_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<Index>>, String> {
        let query = r#"
            SELECT
                t.relname::TEXT as table_name,
                i.relname::TEXT as index_name,
                ix.indisunique as is_unique,
                ix.indisprimary as is_primary,
                am.amname::TEXT as index_type,
                array_agg(a.attname::TEXT ORDER BY array_position(ix.indkey, a.attnum)) as columns
            FROM pg_index ix
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_am am ON am.oid = i.relam
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE n.nspname = $1
            GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary, am.amname
            ORDER BY t.relname, i.relname
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all indexes: {}", e))?;

        let mut indexes_map: HashMap<String, Vec<Index>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let index = Index {
                name: row.get("index_name"),
                is_unique: row.get("is_unique"),
                is_primary: row.get("is_primary"),
                columns: row.get("columns"),
                index_type: row.get("index_type"),
            };

            indexes_map.entry(table_name).or_insert_with(Vec::new).push(index);
        }

        Ok(indexes_map)
    }

    /// スキーマ全体の外部キー情報を一括取得
    async fn get_all_foreign_keys_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<ForeignKey>>, String> {
        let query = r#"
            SELECT
                tc.table_name::TEXT,
                tc.constraint_name::TEXT,
                array_agg(kcu.column_name::TEXT ORDER BY kcu.ordinal_position) as columns,
                ccu.table_schema::TEXT as referenced_schema,
                ccu.table_name::TEXT as referenced_table,
                array_agg(ccu.column_name::TEXT ORDER BY kcu.ordinal_position) as referenced_columns,
                rc.delete_rule::TEXT as on_delete,
                rc.update_rule::TEXT as on_update
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
            GROUP BY tc.table_name, tc.constraint_name, ccu.table_schema, ccu.table_name,
                     rc.delete_rule, rc.update_rule
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all foreign keys: {}", e))?;

        let mut fks_map: HashMap<String, Vec<ForeignKey>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let fk = ForeignKey {
                name: row.get("constraint_name"),
                columns: row.get("columns"),
                referenced_schema: row.get("referenced_schema"),
                referenced_table: row.get("referenced_table"),
                referenced_columns: row.get("referenced_columns"),
                on_delete: row.get("on_delete"),
                on_update: row.get("on_update"),
            };

            fks_map.entry(table_name).or_insert_with(Vec::new).push(fk);
        }

        Ok(fks_map)
    }

    /// スキーマ全体の外部キー参照情報を一括取得
    async fn get_all_foreign_key_references_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, Vec<ForeignKeyReference>>, String> {
        let query = r#"
            SELECT
                ccu.table_name::TEXT as target_table,
                tc.table_schema::TEXT as source_schema,
                tc.table_name::TEXT as source_table,
                array_agg(kcu.column_name::TEXT ORDER BY kcu.ordinal_position) as source_columns,
                array_agg(ccu.column_name::TEXT ORDER BY kcu.ordinal_position) as target_columns,
                tc.constraint_name::TEXT
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_schema = $1
            GROUP BY ccu.table_name, tc.table_schema, tc.table_name, tc.constraint_name
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all foreign key references: {}", e))?;

        let mut refs_map: HashMap<String, Vec<ForeignKeyReference>> = HashMap::new();
        for row in rows {
            let target_table: String = row.get("target_table");
            let fk_ref = ForeignKeyReference {
                source_schema: row.get("source_schema"),
                source_table: row.get("source_table"),
                source_columns: row.get("source_columns"),
                target_columns: row.get("target_columns"),
                constraint_name: row.get("constraint_name"),
            };

            refs_map.entry(target_table).or_insert_with(Vec::new).push(fk_ref);
        }

        Ok(refs_map)
    }

    /// スキーマ全体のプライマリキー情報を一括取得
    async fn get_all_primary_keys_in_schema(
        &self,
        schema: &str,
    ) -> Result<HashMap<String, PrimaryKey>, String> {
        let query = r#"
            SELECT
                tc.table_name::TEXT,
                tc.constraint_name::TEXT,
                array_agg(kcu.column_name::TEXT ORDER BY kcu.ordinal_position) as columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
            GROUP BY tc.table_name, tc.constraint_name
        "#;

        let rows = sqlx::query(query)
            .bind(schema)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all primary keys: {}", e))?;

        let mut pks_map: HashMap<String, PrimaryKey> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("table_name");
            let pk = PrimaryKey {
                name: row.get("constraint_name"),
                columns: row.get("columns"),
            };

            pks_map.insert(table_name, pk);
        }

        Ok(pks_map)
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

        // スキーマ全体の情報を一括取得
        let columns_map = self.get_all_columns_in_schema(schema).await?;
        let indexes_map = self.get_all_indexes_in_schema(schema).await?;
        let fks_map = self.get_all_foreign_keys_in_schema(schema).await?;
        let refs_map = self.get_all_foreign_key_references_in_schema(schema).await?;
        let pks_map = self.get_all_primary_keys_in_schema(schema).await?;

        let mut tables = Vec::new();
        for (name, comment, estimated_row_count) in rows {
            let columns = columns_map.get(&name).cloned().unwrap_or_default();
            let indexes = indexes_map.get(&name).cloned().unwrap_or_default();
            let foreign_keys = fks_map.get(&name).cloned().unwrap_or_default();
            let referenced_by = refs_map.get(&name).cloned().unwrap_or_default();
            let primary_key = pks_map.get(&name).cloned();

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

        // ビュー用のカラム情報を一括取得
        let columns_map = self.get_all_columns_in_schema(schema).await?;

        let mut views = Vec::new();
        for (name, comment, definition) in rows {
            let columns = columns_map.get(&name).cloned().unwrap_or_default();

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
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_primary_key,
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_foreign_key,
                EXISTS (
                    SELECT 1 FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                      ON kcu.constraint_name = tc.constraint_name
                     AND kcu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'UNIQUE'
                      AND kcu.table_schema = c.table_schema
                      AND kcu.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) as is_unique,
                COALESCE(c.column_default LIKE '%nextval%', false) as is_auto_increment,
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
            .map(|row| Column {
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
            })
            .collect();

        Ok(columns)
    }

    async fn get_indexes(&self, schema: &str, table: &str) -> Result<Vec<Index>, String> {
        let query = r#"
            SELECT
                i.relname::TEXT as index_name,
                ix.indisunique as is_unique,
                ix.indisprimary as is_primary,
                am.amname::TEXT as index_type,
                array_agg(a.attname::TEXT ORDER BY array_position(ix.indkey, a.attnum)) as columns
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
            .map(|row| Index {
                name: row.get("index_name"),
                is_unique: row.get("is_unique"),
                is_primary: row.get("is_primary"),
                columns: row.get("columns"),
                index_type: row.get("index_type"),
            })
            .collect();

        Ok(indexes)
    }

    async fn get_foreign_keys(&self, schema: &str, table: &str) -> Result<Vec<ForeignKey>, String> {
        let query = r#"
            SELECT
                tc.constraint_name::TEXT,
                array_agg(kcu.column_name::TEXT ORDER BY kcu.ordinal_position) as columns,
                ccu.table_schema::TEXT as referenced_schema,
                ccu.table_name::TEXT as referenced_table,
                array_agg(ccu.column_name::TEXT ORDER BY kcu.ordinal_position) as referenced_columns,
                rc.delete_rule::TEXT as on_delete,
                rc.update_rule::TEXT as on_update
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
            .map(|row| ForeignKey {
                name: row.get("constraint_name"),
                columns: row.get("columns"),
                referenced_schema: row.get("referenced_schema"),
                referenced_table: row.get("referenced_table"),
                referenced_columns: row.get("referenced_columns"),
                on_delete: row.get("on_delete"),
                on_update: row.get("on_update"),
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
                tc.table_schema::TEXT as source_schema,
                tc.table_name::TEXT as source_table,
                array_agg(kcu.column_name::TEXT ORDER BY kcu.ordinal_position) as source_columns,
                array_agg(ccu.column_name::TEXT ORDER BY kcu.ordinal_position) as target_columns,
                tc.constraint_name::TEXT
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
            .map(|row| ForeignKeyReference {
                source_schema: row.get("source_schema"),
                source_table: row.get("source_table"),
                source_columns: row.get("source_columns"),
                target_columns: row.get("target_columns"),
                constraint_name: row.get("constraint_name"),
            })
            .collect();

        Ok(references)
    }

    async fn get_all_foreign_keys(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<TableForeignKey>, String> {
        let schema_name = schema.unwrap_or("public");
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
            database_type: "postgresql".to_string(),
            schemas,
            fetched_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}
