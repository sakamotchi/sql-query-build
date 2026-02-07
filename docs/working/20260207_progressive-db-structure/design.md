# 設計書 - データベース構造の段階的取得（パフォーマンス改善）

## ベンチマーク結果

### 測定環境

- **OS**: macOS（開発環境）
- **測定ツール**: Rust `std::time::Instant`、フロントエンド `performance.now()`

### Before（改善前）

| 測定項目 | 測定値 | 測定日 | 備考 |
|---------|--------|--------|------|
| PostgreSQL 全構造取得（100テーブル） | 5-10秒 | - | スキーマ単位一括クエリ（最適化済み） |
| MySQL 全構造取得（100テーブル） | 20-60秒 | - | テーブルごと5クエリ × 100 = 500クエリ |
| SQLite 全構造取得（100テーブル） | 2-5秒 | - | テーブルごと個別クエリ（ローカル） |
| テーブル名補完が利用可能になるまで | 上記と同じ | - | 全構造取得完了後にのみ利用可能 |

### 測定方法

```rust
// Rustでのベンチマークコード
use std::time::Instant;

let start = Instant::now();
let structure = inspector.get_database_structure().await?;
let duration = start.elapsed();
println!("[Benchmark] get_database_structure: {:?}", duration);
```

```typescript
// フロントエンドでの測定
const start = performance.now()
await databaseStructureStore.fetchDatabaseStructure(connectionId)
const duration = performance.now() - start
console.log(`[Benchmark] fetchDatabaseStructure: ${duration.toFixed(0)}ms`)
```

## ボトルネック分析

### 特定されたボトルネック

1. **MySQL の N+1 クエリ問題**
   - **箇所**: `src-tauri/src/database/mysql_inspector.rs` `get_tables` メソッド
   - **原因**: テーブルごとに `get_columns`, `get_indexes`, `get_foreign_keys`, `get_foreign_key_references`, `get_primary_key` の5クエリを個別実行
   - **影響**: 100テーブルで500クエリ実行 → 20-60秒の遅延
   - **証拠**: PostgreSQL は同等規模でバッチクエリにより5-10秒で完了

2. **全構造の一括取得による初期表示遅延**
   - **箇所**: `app/pages/sql-editor.vue` の `watch(connection)` 内
   - **原因**: `fetchDatabaseStructure()` が全スキーマ・全テーブル・全カラム・全インデックス・全外部キーの取得完了を待つ
   - **影響**: コードアシストでテーブル名が使えるまで全取得完了を待つ必要がある
   - **証拠**: 補完機能（`useSqlCompletion.ts`）は `structures[connectionId]` がセットされるまでテーブル候補を返せない

3. **システムスキーマの不要な取得**
   - **箇所**: 各インスペクターの `get_schemas` メソッド
   - **原因**: `information_schema`, `pg_catalog` 等のシステムスキーマも取得対象
   - **影響**: 余分なクエリ実行とデータ転送

## 最適化方針

### 概要

「段階的取得（Progressive Loading）」アプローチを採用し、データの必要度に応じて3フェーズに分けて取得する。

```
接続確立
    │
    ▼
Phase 1: テーブル名一覧の高速取得（1-2クエリ、2秒以内）
    │  → テーブル名補完が即座に利用可能
    │
    ▼ (バックグラウンド)
Phase 2: カラム情報の順次取得（テーブルごとに取得）
    │  → 取得済みテーブルから順次カラム補完が利用可能
    │
    ▼ (オンデマンド)
Phase 3: ユーザー要求による優先取得（`.` 入力時）
       → 未取得テーブルのカラムを即座に取得
```

### 最適化戦略

#### 戦略1: テーブル名一覧の軽量取得API新設

- **対象**: ボトルネック2（全構造の一括取得による初期表示遅延）
- **手法**: テーブル名・スキーマ名・コメント・推定行数のみを返す新しいTauriコマンドを追加
- **期待効果**: テーブル名補完が2秒以内に利用可能（現状5-60秒）
- **リスク**: 新旧APIの並存による保守コスト増（後方互換を維持するため許容）

#### 戦略2: MySQLバッチクエリ化

- **対象**: ボトルネック1（MySQL の N+1 クエリ問題）
- **手法**: PostgreSQL実装と同様に、`information_schema` から1クエリでスキーマ全体の情報を一括取得しHashMapで管理
- **期待効果**: MySQL 全構造取得時間を20-60秒 → 5秒以内に短縮
- **リスク**: `information_schema` のクエリ権限が不足する環境でのフォールバックが必要

#### 戦略3: バックグラウンド＋オンデマンド取得

- **対象**: ボトルネック2（初期表示遅延）の補完的解決
- **手法**: Phase 1 完了後にバックグラウンドでカラム情報を順次取得。ユーザーが `.` を入力した場合は優先的に取得
- **期待効果**: ユーザーが操作を開始する頃にはほとんどのカラム情報が取得済み
- **リスク**: バックグラウンド取得とオンデマンド取得の競合（排他制御で対処）

### 実装計画

1. **Phase 1: バックエンド - 軽量API + MySQLバッチ化**
   - 軽量構造体の型定義（Rust）
   - `DatabaseInspector` トレイトに新メソッド追加
   - 各DB種別のテーブル名高速取得実装
   - MySQLのバッチクエリ化
   - Tauriコマンド追加

2. **Phase 2: フロントエンド - 段階的ロード対応**
   - TypeScript型定義・API追加
   - ストアの段階的ロード状態管理
   - 補完機能のサマリーデータ対応
   - オンデマンドカラム取得

3. **Phase 3: UI改善・統合**
   - ローディング状態のUI表示
   - 他画面との統合確認
   - 総合テスト

## データ構造の変更

### 新規型定義（Rust）

```rust
// src-tauri/src/models/database_structure.rs に追加

/// テーブル名一覧取得用の軽量構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStructureSummary {
    pub connection_id: String,
    pub database_name: String,
    pub database_type: String,
    pub schemas: Vec<SchemaSummary>,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaSummary {
    pub name: String,
    pub is_system: bool,
    pub tables: Vec<TableSummary>,
    pub views: Vec<TableSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSummary {
    pub name: String,
    pub schema: String,
    pub comment: Option<String>,
    pub estimated_row_count: Option<i64>,
}
```

### 新規型定義（TypeScript）

```typescript
// app/types/database-structure.ts に追加

export interface DatabaseStructureSummary {
  connectionId: string
  databaseName: string
  databaseType: 'postgresql' | 'mysql' | 'sqlite'
  schemas: SchemaSummary[]
  fetchedAt: string
}

export interface SchemaSummary {
  name: string
  isSystem: boolean
  tables: TableSummary[]
  views: TableSummary[]
}

export interface TableSummary {
  name: string
  schema: string
  comment: string | null
  estimatedRowCount: number | null
}
```

### ストアの状態拡張

```typescript
// app/stores/database-structure.ts の state 拡張

interface DatabaseStructureState {
  // 既存（後方互換のため維持）
  structures: Record<string, DatabaseStructure>
  loadingIds: Set<string>
  errors: Record<string, string>

  // 新規: 段階的ロード用
  summaries: Record<string, DatabaseStructureSummary>
  columnCache: Record<string, Record<string, Column[]>>  // connectionId -> tableName -> columns
  summaryLoadingIds: Set<string>
  backgroundProgress: Record<string, { loaded: number; total: number }>
  columnLoadingKeys: Set<string>  // "connectionId:schema:table" 形式
}
```

## API変更

### 新規Tauriコマンド

| コマンド名 | パラメータ | 戻り値 | 説明 |
|-----------|----------|--------|------|
| `get_database_structure_summary` | `connection_id: String` | `DatabaseStructureSummary` | テーブル名一覧の軽量取得 |

### 既存コマンド（変更なし・後方互換維持）

| コマンド名 | 状態 | 備考 |
|-----------|------|------|
| `get_database_structure` | 維持 | クエリビルダー等で引き続き使用 |
| `get_schemas` | 維持 | 未使用だが将来のため維持 |
| `get_tables` | 維持 | 未使用だが将来のため維持 |
| `get_columns` | 維持 | オンデマンドカラム取得で活用 |

### 新規フロントエンドAPI

```typescript
// app/api/database-structure.ts に追加

export const databaseStructureApi = {
  // 既存メソッド（維持）
  async getDatabaseStructure(connectionId: string): Promise<DatabaseStructure> { ... },
  async getSchemas(connectionId: string): Promise<Schema[]> { ... },
  async getTables(connectionId: string, schema: string): Promise<Table[]> { ... },
  async getColumns(connectionId: string, schema: string, table: string): Promise<Column[]> { ... },

  // 新規メソッド
  async getDatabaseStructureSummary(connectionId: string): Promise<DatabaseStructureSummary> {
    return invoke('get_database_structure_summary', { connectionId })
  },
}
```

## 最適化コード例

### バックエンド: テーブル名一覧の高速取得（PostgreSQL）

```rust
// src-tauri/src/database/postgresql_inspector.rs

impl PostgresqlInspector {
    /// テーブル名一覧を高速取得（1-2クエリ）
    async fn get_table_summaries(&self) -> Result<Vec<SchemaSummary>, AppError> {
        // スキーマ一覧を取得
        let schemas = sqlx::query_as::<_, (String,)>(
            "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"
        )
        .fetch_all(&self.pool)
        .await?;

        // 全スキーマのテーブル名・コメント・推定行数を1クエリで取得
        let tables = sqlx::query_as::<_, (String, String, String, Option<String>, Option<i64>)>(
            "SELECT
                t.table_schema,
                t.table_name,
                t.table_type,
                obj_description(c.oid) as comment,
                c.reltuples::bigint as estimated_row_count
            FROM information_schema.tables t
            LEFT JOIN pg_class c ON c.relname = t.table_name
                AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.table_schema)
            WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY t.table_schema, t.table_name"
        )
        .fetch_all(&self.pool)
        .await?;

        // スキーマごとに集約
        // ...
    }
}
```

### バックエンド: MySQLバッチクエリ化

```rust
// src-tauri/src/database/mysql_inspector.rs

impl MysqlInspector {
    /// スキーマ全体のカラム情報を1クエリで取得
    async fn get_all_columns_in_schema(&self, schema: &str) -> Result<HashMap<String, Vec<Column>>, AppError> {
        let rows = sqlx::query(
            "SELECT
                TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE,
                IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY,
                EXTRA, ORDINAL_POSITION, COLUMN_COMMENT,
                CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION"
        )
        .bind(schema)
        .fetch_all(&self.pool)
        .await?;

        let mut columns_map: HashMap<String, Vec<Column>> = HashMap::new();
        for row in rows {
            let table_name: String = row.get("TABLE_NAME");
            let column = Column {
                name: row.get("COLUMN_NAME"),
                data_type: row.get("DATA_TYPE"),
                display_type: row.get("COLUMN_TYPE"),
                nullable: row.get::<String, _>("IS_NULLABLE") == "YES",
                default_value: row.get("COLUMN_DEFAULT"),
                is_primary_key: row.get::<String, _>("COLUMN_KEY") == "PRI",
                is_foreign_key: row.get::<String, _>("COLUMN_KEY") == "MUL",
                is_unique: row.get::<String, _>("COLUMN_KEY") == "UNI",
                is_auto_increment: row.get::<String, _>("EXTRA").contains("auto_increment"),
                ordinal_position: row.get("ORDINAL_POSITION"),
                comment: row.get("COLUMN_COMMENT"),
            };
            columns_map.entry(table_name).or_default().push(column);
        }
        Ok(columns_map)
    }
}
```

### フロントエンド: 段階的ロードストア

```typescript
// app/stores/database-structure.ts

export const useDatabaseStructureStore = defineStore('database-structure', {
  actions: {
    // Phase 1: テーブル名一覧の高速取得
    async fetchDatabaseStructureSummary(connectionId: string) {
      if (this.summaryLoadingIds.has(connectionId)) return
      this.summaryLoadingIds.add(connectionId)
      try {
        const summary = await databaseStructureApi.getDatabaseStructureSummary(connectionId)
        this.summaries[connectionId] = summary
      } finally {
        this.summaryLoadingIds.delete(connectionId)
      }
    },

    // Phase 2: カラム情報のオンデマンド取得
    async fetchColumnsForTable(connectionId: string, schema: string, table: string) {
      const key = `${connectionId}:${schema}:${table}`
      if (this.columnLoadingKeys.has(key)) return
      if (this.columnCache[connectionId]?.[`${schema}.${table}`]) return

      this.columnLoadingKeys.add(key)
      try {
        const columns = await databaseStructureApi.getColumns(connectionId, schema, table)
        if (!this.columnCache[connectionId]) {
          this.columnCache[connectionId] = {}
        }
        this.columnCache[connectionId][`${schema}.${table}`] = columns
      } finally {
        this.columnLoadingKeys.delete(key)
      }
    },

    // Phase 3: バックグラウンド詳細取得
    async startBackgroundFetch(connectionId: string) {
      const summary = this.summaries[connectionId]
      if (!summary) return

      const allTables = summary.schemas
        .filter(s => !s.isSystem)
        .flatMap(s => s.tables.map(t => ({ schema: s.name, table: t.name })))

      this.backgroundProgress[connectionId] = { loaded: 0, total: allTables.length }

      for (const { schema, table } of allTables) {
        if (!this.columnCache[connectionId]?.[`${schema}.${table}`]) {
          await this.fetchColumnsForTable(connectionId, schema, table)
        }
        this.backgroundProgress[connectionId].loaded++
        // UIをブロックしないよう小さなディレイ
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    },
  },
})
```

### フロントエンド: 補完機能のサマリーデータ対応

```typescript
// app/composables/useSqlCompletion.ts

function getTableCompletions(context: CompletionContext) {
  const items: CompletionItem[] = []

  // まずサマリーデータからテーブル名候補を生成
  const summary = databaseStructureStore.summaries[context.connectionId]
  if (summary) {
    for (const schema of summary.schemas) {
      if (schema.isSystem) continue
      for (const table of schema.tables) {
        items.push({
          label: `${table.name} (${schema.name})`,
          insertText: `${table.name} AS ${generateTableAlias(table.name)}`,
          detail: table.comment || `Table (${table.estimatedRowCount || 0} rows)`,
          kind: monaco.languages.CompletionItemKind.Class,
        })
      }
    }
  }

  // 詳細データがある場合はそちらを優先（より豊富な情報）
  const structure = databaseStructureStore.structures[context.connectionId]
  if (structure) {
    // 既存のロジックで上書き
  }

  return items
}
```

## パフォーマンステスト

### ベンチマークテスト例

```typescript
import { describe, it, expect } from 'vitest'

describe('Database Structure Performance', () => {
  it('should return table summaries quickly', async () => {
    const start = performance.now()
    // getDatabaseStructureSummary のモックテスト
    const summary = await mockGetDatabaseStructureSummary('test-connection')
    const duration = performance.now() - start

    expect(summary.schemas).toBeDefined()
    expect(duration).toBeLessThan(100) // モックなので100ms以内
  })
})
```

### Rustベンチマーク例

```rust
#[cfg(test)]
mod benchmarks {
    use super::*;
    use std::time::Instant;

    #[tokio::test]
    async fn bench_get_table_summaries() {
        // テスト用DBプールの準備
        let inspector = create_test_inspector().await;

        let start = Instant::now();
        let summaries = inspector.get_table_summaries().await.unwrap();
        let duration = start.elapsed();

        println!("get_table_summaries: {:?}", duration);
        assert!(!summaries.is_empty());
        // 軽量取得なのでフルの構造取得より高速であること
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 | 選択理由 |
|---------|------|--------|---------|
| 新しい軽量APIを新設 | テーブル名のみの高速取得を実現するため | 既存APIにフィルタパラメータを追加 | 既存APIの後方互換を完全に維持できる |
| サマリーとカラムキャッシュを分離管理 | Phase 1 のみでテーブル名補完を動作させるため | 既存の `structures` に段階的にマージ | 状態管理が明確でデバッグしやすい |
| バックグラウンド取得にディレイを挿入 | UIスレッドのブロックを防止するため | Web Worker を使用 | 実装がシンプルで、Tauri IPC は非同期のため十分 |
| 既存の `get_columns` コマンドを活用 | オンデマンド取得に既存APIをそのまま利用できるため | 新しい軽量カラム取得APIを新設 | 追加実装が不要で既にテスト済み |

## 未解決事項

- [ ] バックグラウンド取得の最適なバッチサイズ（1テーブルずつ vs 複数テーブルまとめて）
- [ ] ローディングUIの具体的なデザイン（ステータスバー vs インライン表示）
- [ ] 接続切り替え時のバックグラウンド取得キャンセルの実装方法

## After（改善後の目標）

| 測定項目 | 目標値 | 測定日 | 達成状況 |
|---------|--------|--------|---------|
| テーブル名補完が利用可能になるまで | 2秒以内 | - | 未測定 |
| MySQL全構造取得（100テーブル） | 5秒以内 | - | 未測定 |
| オンデマンドカラム取得（1テーブル） | 500ms以内 | - | 未測定 |

**注**: このセクションは実装完了後に実測値で更新してください。
