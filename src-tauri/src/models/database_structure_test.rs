use super::*;

#[test]
fn test_database_structure_serialization() {
    let structure = DatabaseStructure {
        connection_id: "test-conn-123".to_string(),
        database_name: "testdb".to_string(),
        database_type: "postgresql".to_string(),
        schemas: vec![],
        fetched_at: "2024-01-01T00:00:00Z".to_string(),
    };

    let json = serde_json::to_string(&structure).unwrap();
    let deserialized: DatabaseStructure = serde_json::from_str(&json).unwrap();

    assert_eq!(structure.connection_id, deserialized.connection_id);
    assert_eq!(structure.database_name, deserialized.database_name);
    assert_eq!(structure.database_type, deserialized.database_type);
}

#[test]
fn test_schema_with_tables_and_views() {
    let schema = Schema {
        name: "public".to_string(),
        is_system: false,
        tables: vec![Table {
            name: "users".to_string(),
            schema: "public".to_string(),
            comment: Some("User accounts table".to_string()),
            estimated_row_count: Some(1000),
            columns: vec![],
            primary_key: None,
            indexes: vec![],
            foreign_keys: vec![],
            referenced_by: vec![],
        }],
        views: vec![View {
            name: "active_users".to_string(),
            schema: "public".to_string(),
            comment: None,
            columns: vec![],
            definition: Some("SELECT * FROM users WHERE active = true".to_string()),
        }],
    };

    assert_eq!(schema.tables.len(), 1);
    assert_eq!(schema.views.len(), 1);
    assert_eq!(schema.tables[0].name, "users");
    assert_eq!(schema.views[0].name, "active_users");
}

#[test]
fn test_column_properties() {
    let column = Column {
        name: "id".to_string(),
        data_type: "integer".to_string(),
        display_type: "integer".to_string(),
        nullable: false,
        default_value: Some("nextval('users_id_seq')".to_string()),
        is_primary_key: true,
        is_foreign_key: false,
        is_unique: true,
        is_auto_increment: true,
        ordinal_position: 1,
        comment: Some("Primary key".to_string()),
    };

    assert_eq!(column.name, "id");
    assert!(!column.nullable);
    assert!(column.is_primary_key);
    assert!(!column.is_foreign_key);
    assert!(column.is_unique);
    assert!(column.is_auto_increment);
}

#[test]
fn test_primary_key_structure() {
    let pk = PrimaryKey {
        name: "users_pkey".to_string(),
        columns: vec!["id".to_string()],
    };

    assert_eq!(pk.name, "users_pkey");
    assert_eq!(pk.columns.len(), 1);
    assert_eq!(pk.columns[0], "id");
}

#[test]
fn test_composite_primary_key() {
    let pk = PrimaryKey {
        name: "user_roles_pkey".to_string(),
        columns: vec!["user_id".to_string(), "role_id".to_string()],
    };

    assert_eq!(pk.columns.len(), 2);
    assert_eq!(pk.columns[0], "user_id");
    assert_eq!(pk.columns[1], "role_id");
}

#[test]
fn test_index_structure() {
    let index = Index {
        name: "idx_users_email".to_string(),
        is_unique: true,
        is_primary: false,
        columns: vec!["email".to_string()],
        index_type: "btree".to_string(),
    };

    assert_eq!(index.name, "idx_users_email");
    assert!(index.is_unique);
    assert!(!index.is_primary);
    assert_eq!(index.index_type, "btree");
}

#[test]
fn test_foreign_key_structure() {
    let fk = ForeignKey {
        name: "fk_posts_user_id".to_string(),
        columns: vec!["user_id".to_string()],
        referenced_schema: "public".to_string(),
        referenced_table: "users".to_string(),
        referenced_columns: vec!["id".to_string()],
        on_delete: "CASCADE".to_string(),
        on_update: "NO ACTION".to_string(),
    };

    assert_eq!(fk.name, "fk_posts_user_id");
    assert_eq!(fk.columns[0], "user_id");
    assert_eq!(fk.referenced_table, "users");
    assert_eq!(fk.referenced_columns[0], "id");
    assert_eq!(fk.on_delete, "CASCADE");
    assert_eq!(fk.on_update, "NO ACTION");
}

#[test]
fn test_foreign_key_reference_structure() {
    let fk_ref = ForeignKeyReference {
        source_schema: "public".to_string(),
        source_table: "posts".to_string(),
        source_columns: vec!["user_id".to_string()],
        target_columns: vec!["id".to_string()],
        constraint_name: "fk_posts_user_id".to_string(),
    };

    assert_eq!(fk_ref.source_table, "posts");
    assert_eq!(fk_ref.source_columns[0], "user_id");
    assert_eq!(fk_ref.target_columns[0], "id");
}

#[test]
fn test_table_with_full_metadata() {
    let table = Table {
        name: "users".to_string(),
        schema: "public".to_string(),
        comment: Some("User accounts".to_string()),
        estimated_row_count: Some(5000),
        columns: vec![
            Column {
                name: "id".to_string(),
                data_type: "integer".to_string(),
                display_type: "integer".to_string(),
                nullable: false,
                default_value: None,
                is_primary_key: true,
                is_foreign_key: false,
                is_unique: true,
                is_auto_increment: true,
                ordinal_position: 1,
                comment: None,
            },
            Column {
                name: "email".to_string(),
                data_type: "varchar".to_string(),
                display_type: "varchar(255)".to_string(),
                nullable: false,
                default_value: None,
                is_primary_key: false,
                is_foreign_key: false,
                is_unique: true,
                is_auto_increment: false,
                ordinal_position: 2,
                comment: Some("User email address".to_string()),
            },
        ],
        primary_key: Some(PrimaryKey {
            name: "users_pkey".to_string(),
            columns: vec!["id".to_string()],
        }),
        indexes: vec![Index {
            name: "idx_users_email".to_string(),
            is_unique: true,
            is_primary: false,
            columns: vec!["email".to_string()],
            index_type: "btree".to_string(),
        }],
        foreign_keys: vec![],
        referenced_by: vec![],
    };

    assert_eq!(table.name, "users");
    assert_eq!(table.columns.len(), 2);
    assert!(table.primary_key.is_some());
    assert_eq!(table.indexes.len(), 1);
    assert_eq!(table.estimated_row_count, Some(5000));
}

#[test]
fn test_view_structure() {
    let view = View {
        name: "active_users_view".to_string(),
        schema: "public".to_string(),
        comment: Some("View of active users only".to_string()),
        columns: vec![Column {
            name: "id".to_string(),
            data_type: "integer".to_string(),
            display_type: "integer".to_string(),
            nullable: false,
            default_value: None,
            is_primary_key: false,
            is_foreign_key: false,
            is_unique: false,
            is_auto_increment: false,
            ordinal_position: 1,
            comment: None,
        }],
        definition: Some("SELECT id, email FROM users WHERE active = true".to_string()),
    };

    assert_eq!(view.name, "active_users_view");
    assert_eq!(view.columns.len(), 1);
    assert!(view.definition.is_some());
}

#[test]
fn test_complete_database_structure() {
    let structure = DatabaseStructure {
        connection_id: "conn-123".to_string(),
        database_name: "myapp".to_string(),
        database_type: "postgresql".to_string(),
        schemas: vec![
            Schema {
                name: "public".to_string(),
                is_system: false,
                tables: vec![Table {
                    name: "users".to_string(),
                    schema: "public".to_string(),
                    comment: None,
                    estimated_row_count: Some(100),
                    columns: vec![],
                    primary_key: None,
                    indexes: vec![],
                    foreign_keys: vec![],
                    referenced_by: vec![],
                }],
                views: vec![],
            },
            Schema {
                name: "pg_catalog".to_string(),
                is_system: true,
                tables: vec![],
                views: vec![],
            },
        ],
        fetched_at: "2024-01-01T12:00:00Z".to_string(),
    };

    assert_eq!(structure.schemas.len(), 2);
    assert_eq!(structure.schemas[0].name, "public");
    assert!(!structure.schemas[0].is_system);
    assert_eq!(structure.schemas[1].name, "pg_catalog");
    assert!(structure.schemas[1].is_system);
}

#[test]
fn test_json_serialization_with_optional_fields() {
    let table = Table {
        name: "test_table".to_string(),
        schema: "public".to_string(),
        comment: None,
        estimated_row_count: None,
        columns: vec![],
        primary_key: None,
        indexes: vec![],
        foreign_keys: vec![],
        referenced_by: vec![],
    };

    let json = serde_json::to_string(&table).unwrap();
    let deserialized: Table = serde_json::from_str(&json).unwrap();

    assert_eq!(table.name, deserialized.name);
    assert!(deserialized.comment.is_none());
    assert!(deserialized.estimated_row_count.is_none());
    assert!(deserialized.primary_key.is_none());
}

#[test]
fn test_column_default_value_types() {
    // Numeric default
    let col1 = Column {
        name: "count".to_string(),
        data_type: "integer".to_string(),
        display_type: "integer".to_string(),
        nullable: false,
        default_value: Some("0".to_string()),
        is_primary_key: false,
        is_foreign_key: false,
        is_unique: false,
        is_auto_increment: false,
        ordinal_position: 1,
        comment: None,
    };

    // String default
    let col2 = Column {
        name: "status".to_string(),
        data_type: "varchar".to_string(),
        display_type: "varchar(20)".to_string(),
        nullable: false,
        default_value: Some("'active'".to_string()),
        is_primary_key: false,
        is_foreign_key: false,
        is_unique: false,
        is_auto_increment: false,
        ordinal_position: 2,
        comment: None,
    };

    // Function default
    let col3 = Column {
        name: "created_at".to_string(),
        data_type: "timestamp".to_string(),
        display_type: "timestamp".to_string(),
        nullable: false,
        default_value: Some("CURRENT_TIMESTAMP".to_string()),
        is_primary_key: false,
        is_foreign_key: false,
        is_unique: false,
        is_auto_increment: false,
        ordinal_position: 3,
        comment: None,
    };

    assert_eq!(col1.default_value, Some("0".to_string()));
    assert_eq!(col2.default_value, Some("'active'".to_string()));
    assert_eq!(col3.default_value, Some("CURRENT_TIMESTAMP".to_string()));
}

#[test]
fn test_database_structure_summary_serialization() {
    let summary = DatabaseStructureSummary {
        connection_id: "conn-summary-1".to_string(),
        database_name: "sample_db".to_string(),
        database_type: "postgresql".to_string(),
        schemas: vec![SchemaSummary {
            name: "public".to_string(),
            is_system: false,
            tables: vec![TableSummary {
                name: "users".to_string(),
                schema: "public".to_string(),
                comment: Some("users table".to_string()),
                estimated_row_count: Some(42),
            }],
            views: vec![TableSummary {
                name: "active_users".to_string(),
                schema: "public".to_string(),
                comment: None,
                estimated_row_count: None,
            }],
        }],
        fetched_at: "2026-02-07T00:00:00Z".to_string(),
    };

    let json = serde_json::to_string(&summary).unwrap();
    let deserialized: DatabaseStructureSummary = serde_json::from_str(&json).unwrap();

    assert_eq!(summary.connection_id, deserialized.connection_id);
    assert_eq!(summary.database_name, deserialized.database_name);
    assert_eq!(summary.schemas.len(), 1);
    assert_eq!(summary.schemas[0].tables[0].name, "users");
    assert_eq!(summary.schemas[0].views[0].name, "active_users");
}
