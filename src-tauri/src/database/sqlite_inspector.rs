use crate::connection::{ConnectionConfig, ConnectionInfo};
use crate::models::database_structure::*;
use crate::services::database_inspector::{DatabaseInspector, TableForeignKey};
use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

pub struct SqliteInspector {
    pool: SqlitePool,
    database_name: String,
}

impl SqliteInspector {
    pub async fn new(connection: &ConnectionInfo) -> Result<Self, String> {
        let connection_string = connection
            .build_connection_string(None)
            .map_err(|e| format!("Failed to build connection string: {}", e))?;

        let pool = SqlitePool::connect(&connection_string)
            .await
            .map_err(|e| format!("Failed to connect: {}", e))?;

        let database_name = match &connection.connection {
            ConnectionConfig::File(cfg) => cfg.file_path.clone(),
            _ => return Err("Invalid connection config for SQLite".to_string()),
        };

        Ok(Self {
            pool,
            database_name,
        })
    }

    async fn get_primary_key(
        &self,
        _schema: &str,
        table: &str,
    ) -> Result<Option<PrimaryKey>, String> {
        let query = format!("PRAGMA table_info({})", table);

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get primary key: {}", e))?;

        let mut pk_columns = Vec::new();
        for row in rows {
            let pk: i32 = row.get("pk");
            if pk > 0 {
                let name: String = row.get("name");
                pk_columns.push(name);
            }
        }

        if pk_columns.is_empty() {
            Ok(None)
        } else {
            Ok(Some(PrimaryKey {
                name: "PRIMARY".to_string(),
                columns: pk_columns,
            }))
        }
    }
}

#[async_trait]
impl DatabaseInspector for SqliteInspector {
    async fn get_schemas(&self) -> Result<Vec<Schema>, String> {
        // SQLiteはスキーマが「main」のみ
        let tables = self.get_tables("main").await?;
        let views = self.get_views("main").await?;

        Ok(vec![Schema {
            name: "main".to_string(),
            is_system: false,
            tables,
            views,
        }])
    }

    async fn get_tables(&self, _schema: &str) -> Result<Vec<Table>, String> {
        let query = r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get tables: {}", e))?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.get("name");

            let columns = self.get_columns("main", &name).await?;
            let indexes = self.get_indexes("main", &name).await?;
            let foreign_keys = self.get_foreign_keys("main", &name).await?;
            let referenced_by = self.get_foreign_key_references("main", &name).await?;
            let primary_key = self.get_primary_key("main", &name).await?;

            tables.push(Table {
                name,
                schema: "main".to_string(),
                comment: None,
                estimated_row_count: None,
                columns,
                primary_key,
                indexes,
                foreign_keys,
                referenced_by,
            });
        }

        Ok(tables)
    }

    async fn get_views(&self, _schema: &str) -> Result<Vec<View>, String> {
        let query = r#"
            SELECT name, sql
            FROM sqlite_master
            WHERE type = 'view'
            ORDER BY name
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get views: {}", e))?;

        let mut views = Vec::new();
        for row in rows {
            let name: String = row.get("name");
            let definition: Option<String> = row.get("sql");

            let columns = self.get_columns("main", &name).await?;

            views.push(View {
                name,
                schema: "main".to_string(),
                comment: None,
                columns,
                definition,
            });
        }

        Ok(views)
    }

    async fn get_columns(&self, _schema: &str, table: &str) -> Result<Vec<Column>, String> {
        let query = format!("PRAGMA table_info({})", table);

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get columns: {}", e))?;

        let columns = rows
            .iter()
            .enumerate()
            .map(|(idx, row)| {
                let name: String = row.get("name");
                let data_type: String = row.get("type");
                let notnull: i32 = row.get("notnull");
                let default_value: Option<String> = row.get("dflt_value");
                let pk: i32 = row.get("pk");

                Column {
                    name,
                    data_type: data_type.clone(),
                    display_type: data_type,
                    nullable: notnull == 0,
                    default_value,
                    is_primary_key: pk > 0,
                    is_foreign_key: false,    // 外部キー情報は別途取得
                    is_unique: false,         // インデックス情報から判定が必要
                    is_auto_increment: false, // AUTOINCREMENT判定が必要
                    ordinal_position: (idx + 1) as i32,
                    comment: None,
                }
            })
            .collect();

        Ok(columns)
    }

    async fn get_indexes(&self, _schema: &str, table: &str) -> Result<Vec<Index>, String> {
        let query = format!("PRAGMA index_list({})", table);

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get indexes: {}", e))?;

        let mut indexes = Vec::new();
        for row in rows {
            let index_name: String = row.get("name");
            let unique: i32 = row.get("unique");
            let origin: String = row.get("origin");

            // インデックスのカラムを取得
            let column_query = format!("PRAGMA index_info({})", index_name);
            let column_rows = sqlx::query(&column_query)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| format!("Failed to get index columns: {}", e))?;

            let columns: Vec<String> = column_rows.iter().map(|r| r.get("name")).collect();

            indexes.push(Index {
                name: index_name,
                is_unique: unique != 0,
                is_primary: origin == "pk",
                columns,
                index_type: "btree".to_string(),
            });
        }

        Ok(indexes)
    }

    async fn get_foreign_keys(
        &self,
        _schema: &str,
        table: &str,
    ) -> Result<Vec<ForeignKey>, String> {
        let query = format!("PRAGMA foreign_key_list({})", table);

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get foreign keys: {}", e))?;

        // SQLiteの外部キーは複合キーの場合、複数行で返される
        let mut fk_map: std::collections::HashMap<i32, ForeignKey> =
            std::collections::HashMap::new();

        for row in rows {
            let id: i32 = row.get("id");
            let from_col: String = row.get("from");
            let to_table: String = row.get("table");
            let to_col: String = row.get("to");
            let on_update: String = row.get("on_update");
            let on_delete: String = row.get("on_delete");

            let fk = fk_map.entry(id).or_insert_with(|| ForeignKey {
                name: format!("fk_{}", id),
                columns: Vec::new(),
                referenced_schema: "main".to_string(),
                referenced_table: to_table,
                referenced_columns: Vec::new(),
                on_delete,
                on_update,
            });

            fk.columns.push(from_col);
            fk.referenced_columns.push(to_col);
        }

        Ok(fk_map.into_values().collect())
    }

    async fn get_foreign_key_references(
        &self,
        _schema: &str,
        target_table: &str,
    ) -> Result<Vec<ForeignKeyReference>, String> {
        // SQLiteではすべてのテーブルの外部キーを調べる必要がある
        let query = r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
        "#;

        let table_rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get tables for references: {}", e))?;

        let mut references = Vec::new();

        for table_row in table_rows {
            let source_table: String = table_row.get("name");
            let fk_query = format!("PRAGMA foreign_key_list({})", source_table);

            let fk_rows = sqlx::query(&fk_query)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| format!("Failed to get foreign keys for references: {}", e))?;

            let mut fk_map: std::collections::HashMap<i32, (Vec<String>, Vec<String>)> =
                std::collections::HashMap::new();

            for fk_row in fk_rows {
                let referenced_table: String = fk_row.get("table");
                if referenced_table != target_table {
                    continue;
                }

                let id: i32 = fk_row.get("id");
                let from_col: String = fk_row.get("from");
                let to_col: String = fk_row.get("to");

                let (source_cols, target_cols) =
                    fk_map.entry(id).or_insert_with(|| (Vec::new(), Vec::new()));
                source_cols.push(from_col);
                target_cols.push(to_col);
            }

            for (id, (source_columns, target_columns)) in fk_map {
                references.push(ForeignKeyReference {
                    source_schema: "main".to_string(),
                    source_table: source_table.clone(),
                    source_columns,
                    target_columns,
                    constraint_name: format!("fk_{}", id),
                });
            }
        }

        Ok(references)
    }

    async fn get_all_foreign_keys(
        &self,
        _schema: Option<&str>,
    ) -> Result<Vec<TableForeignKey>, String> {
        let schema_name = "main";
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
            database_type: "sqlite".to_string(),
            schemas,
            fetched_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}
