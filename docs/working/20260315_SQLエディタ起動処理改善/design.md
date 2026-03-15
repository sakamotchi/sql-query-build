# 設計書：SQLエディタ起動処理改善

## 変更概要

### Before（現状）

```
フロントエンド                         Rust (Tauri)              DB
│                                       │                          │
│ startBackgroundFetch()                │                          │
│   for each table (N件):              │                          │
│     get_columns(schema, table) ──────>│ get_columns()            │
│                                       │   connect()             │
│                                       │   SELECT ... WHERE      │
│                                       │   table_name = ? ──────>│
│                                       │<────────────────────────│
│<──────────────────────────────────────│                          │
│     (次のテーブルへ) ...              │                          │
│                                       │                          │
│  ※ N回のRound-trip発生               │                          │
```

### After（改修後）

```
フロントエンド                         Rust (Tauri)              DB
│                                       │                          │
│ startBackgroundFetch()                │                          │
│   for each schema (M件):             │                          │
│     get_columns_by_schema(schema) ───>│ get_columns_by_schema()  │
│                                       │   connect()             │
│                                       │   SELECT ... WHERE      │
│                                       │   schema = ? ──────────>│
│                                       │ (全テーブル分一括返却)  │
│                                       │<────────────────────────│
│<──────────────────────────────────────│                          │
│     columnCache に一括格納           │                          │
│     (次のスキーマへ) ...             │                          │
│                                       │                          │
│  ※ M回のRound-trip（M << N）         │                          │
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/commands/database_structure.rs` | `get_columns_by_schema` コマンドを追加 |
| `src-tauri/src/database/postgresql_inspector.rs` | `get_columns_by_schema()` メソッド実装（既存 `get_all_columns_in_schema()` を流用） |
| `src-tauri/src/database/mysql_inspector.rs` | `get_columns_by_schema()` メソッド実装 |
| `src-tauri/src/database/sqlite_inspector.rs` | `get_columns_by_schema()` メソッド実装 |
| `src-tauri/src/services/database_inspector.rs` | `DatabaseInspector` トレイトに `get_columns_by_schema()` を追加 |
| `src-tauri/src/lib.rs` | `get_columns_by_schema` をTauriコマンドに登録 |
| `app/api/database-structure.ts` | `getColumnsBySchema()` を追加 |
| `app/stores/database-structure.ts` | `startBackgroundFetch()` をスキーマ単位一括取得に変更 |

---

## Rust側の実装

### 1. `DatabaseInspector` トレイトへのメソッド追加

**`src-tauri/src/services/database_inspector.rs`**

```rust
/// スキーマ内の全テーブルのカラムを一括取得
/// キー: テーブル名, 値: カラム一覧
async fn get_columns_by_schema(
    &self,
    schema: &str,
) -> Result<HashMap<String, Vec<Column>>, String>;
```

### 2. PostgreSQL実装

**`src-tauri/src/database/postgresql_inspector.rs`**

既存の `get_all_columns_in_schema()` を呼び出すだけなので実装コストは低い。

```rust
async fn get_columns_by_schema(
    &self,
    schema: &str,
) -> Result<HashMap<String, Vec<Column>>, String> {
    self.get_all_columns_in_schema(schema).await
}
```

`get_all_columns_in_schema()` は既に以下のような単一クエリで実装済み：

```sql
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    pgd.description as comment
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st ON st.relname = c.table_name
LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid
    AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema = $1
ORDER BY c.table_name, c.ordinal_position
```

### 3. MySQL実装

**`src-tauri/src/database/mysql_inspector.rs`**

同様に既存の `get_all_columns_in_schema()` を流用する。

```rust
async fn get_columns_by_schema(
    &self,
    schema: &str,
) -> Result<HashMap<String, Vec<Column>>, String> {
    self.get_all_columns_in_schema(schema).await
}
```

### 4. SQLite実装

SQLiteはスキーマが1つ（`main`）のみ。既存の `get_columns()` を全テーブルに適用する形で実装する。

```rust
async fn get_columns_by_schema(
    &self,
    _schema: &str,
) -> Result<HashMap<String, Vec<Column>>, String> {
    // テーブル一覧を取得してから各テーブルのカラムをまとめる
    // ※ SQLiteはPRAGMAを使うため完全バッチ化は難しいが、1スキーマのみなので実用上問題なし
    let tables = self.get_table_names().await?;
    let mut result = HashMap::new();
    for table_name in tables {
        let columns = self.get_columns("main", &table_name).await?;
        result.insert(table_name, columns);
    }
    Ok(result)
}
```

### 5. 新規Tauriコマンド

**`src-tauri/src/commands/database_structure.rs`**

```rust
/// スキーマ内の全テーブルのカラムを一括取得
#[tauri::command]
pub async fn get_columns_by_schema(
    connection_id: String,
    schema: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<HashMap<String, Vec<Column>>, String> {
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    inspector.get_columns_by_schema(&schema).await
}
```

**`src-tauri/src/lib.rs`** — コマンド登録

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        // ... 既存コマンド ...
        commands::database_structure::get_columns_by_schema,  // 追加
    ])
```

---

## フロントエンド側の実装

### 1. API層の追加

**`app/api/database-structure.ts`**

```typescript
async getColumnsBySchema(
  connectionId: string,
  schema: string
): Promise<Record<string, Column[]>> {
  return invoke('get_columns_by_schema', { connectionId, schema })
},
```

### 2. ストアの `startBackgroundFetch()` 改修

**`app/stores/database-structure.ts`**

#### 現状のロジック（テーブル単位ループ）

```typescript
for (const target of pendingTargets) {
  await this.fetchColumnsForTable(connectionId, target.schema, target.table)
  // 10ms待機
}
```

#### 改修後のロジック（スキーマ単位一括）

```typescript
async startBackgroundFetch(connectionId: string): Promise<void> {
  const summary = this.summaries[connectionId]
  if (!summary) return

  const token = Date.now()
  this.backgroundFetchTokens[connectionId] = token

  const nonSystemSchemas = summary.schemas.filter((schema) => !schema.isSystem)

  const totalTables = nonSystemSchemas.reduce(
    (sum, schema) => sum + schema.tables.length,
    0
  )

  if (totalTables === 0) {
    delete this.backgroundProgress[connectionId]
    return
  }

  let loaded = 0
  this.backgroundProgress[connectionId] = { loaded, total: totalTables }

  for (const schema of nonSystemSchemas) {
    if (this.backgroundFetchTokens[connectionId] !== token) return

    // キャッシュ済みテーブルが全件あればスキーマをスキップ
    const uncachedTables = schema.tables.filter(
      (t) => !this.getCachedColumns(connectionId, schema.name, t.name)
    )

    if (uncachedTables.length === 0) {
      loaded += schema.tables.length
      this.backgroundProgress[connectionId] = { loaded, total: totalTables }
      continue
    }

    try {
      // スキーマ内の全テーブルのカラムを1回のRustコマンドで取得
      const columnsMap = await databaseStructureApi.getColumnsBySchema(
        connectionId,
        schema.name
      )

      if (!this.columnCache[connectionId]) {
        this.columnCache[connectionId] = {}
      }

      for (const table of schema.tables) {
        const columns = columnsMap[table.name] ?? []
        const cacheKey = buildColumnCacheKey(schema.name, table.name)
        this.columnCache[connectionId][cacheKey] = columns
        this.applyColumnsToStructure(connectionId, schema.name, table.name, columns)
      }
    } catch (error) {
      console.warn(
        `[database-structure store] Background column fetch failed for schema: ${schema.name}`,
        error
      )
    }

    loaded += schema.tables.length
    this.backgroundProgress[connectionId] = { loaded, total: totalTables }

    // UIブロッキング回避
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  if (this.backgroundFetchTokens[connectionId] === token) {
    delete this.backgroundProgress[connectionId]
  }
}
```

### 変更のポイント

| 項目 | 変更前 | 変更後 |
|-----|-------|-------|
| ループ単位 | テーブル（N件） | スキーマ（M件） |
| Rustコマンド呼び出し回数 | N回 | M回 |
| 進捗更新タイミング | テーブル1件完了ごと | スキーマ1件完了ごと（テーブル数を一括加算） |
| フォールバック | なし（エラー時はwarningのみ） | 変更なし |
| キャンセル制御 | トークン比較 | 変更なし（スキーマループ先頭でチェック） |

---

## 想定パフォーマンス改善

| 条件 | 変更前 | 変更後 |
|-----|-------|-------|
| ローカル接続、100テーブル | ~1秒 | ~0.1秒 |
| RDS ポートフォワード(RTT=100ms)、100テーブル/1スキーマ | ~10秒 | ~0.1秒 |
| RDS ポートフォワード(RTT=100ms)、100テーブル/3スキーマ | ~10秒 | ~0.3秒 |

---

## 後方互換性

- `get_columns`（テーブル単体取得）は削除しない。オンデマンド取得（補完トリガーなど）で引き続き使用される。
- `fetchColumnsForTable()` も削除しない。外部から呼ばれる可能性があるため。
- `startBackgroundFetch()` の戻り値・シグネチャは変更なし。
