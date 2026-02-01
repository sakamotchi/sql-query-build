# 設計書 - MySQLデータベース選択機能の制限対応

## 概要

本設計書では、MySQLの技術的制約（sqlxライブラリが`USE`ステートメントをサポートしない）に対応するため、データベースタイプに応じて異なるUI/動作を提供する設計を行います。

## アーキテクチャ設計

### データフロー

```
┌──────────────────────────────────────────────────────────────┐
│                    SQLエディタ画面起動                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  sql-editor.ts: setConnectionId()                            │
│  - windowStore.currentConnectionIdから接続IDを取得            │
│  - connectionStore.getConnectionById()で接続情報を取得        │
│  - connection.typeで分岐                                      │
│    - MySQL: connection.databaseをselectedDatabaseに設定       │
│    - PostgreSQL: デフォルトスキーマ('public')を設定           │
│    - SQLite: nullを設定                                       │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  SqlEditorToolbar.vue                                        │
│  - connection.typeで表示を分岐                                │
│    - MySQL: 読み取り専用でデータベース名を表示                │
│    - PostgreSQL: USelectMenuでスキーマ選択可能                │
│    - SQLite: 非表示                                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ MySQL            │          │ PostgreSQL       │
│ - USE不可        │          │ - SET可能        │
│ - デフォルトDB   │          │ - スキーマ切替    │
└──────────────────┘          └──────────────────┘
```

## UI設計

### SqlEditorToolbar.vue の変更

#### 現状

現在の `SqlEditorToolbar.vue` にはデータベースセレクターは存在しません。
ツールバーには以下のボタンのみが配置されています：

- 実行ボタン
- 停止ボタン
- フォーマットボタン
- 左パネル表示/非表示ボタン
- 保存ボタン
- ダークモード切り替えボタン

**この実装で、データベースセレクターを新規追加します。**

#### 変更後

```vue
<!-- MySQL: 読み取り専用表示 -->
<div
  v-if="connectionType === 'mysql' && defaultDatabase"
  class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
  :title="$t('sqlEditor.toolbar.database.mysqlReadonlyTooltip')"
>
  <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-gray-500" />
  <span class="text-gray-700 dark:text-gray-300">{{ defaultDatabase }}</span>
  <UIcon name="i-heroicons-lock-closed" class="w-3 h-3 text-gray-400" />
</div>

<!-- PostgreSQL: スキーマ選択可能 -->
<USelectMenu
  v-else-if="connectionType === 'postgresql' && availableDatabases.length > 0"
  v-model="currentDatabase"
  :items="availableDatabases"
  value-key="value"
  :placeholder="$t('sqlEditor.toolbar.database.placeholder')"
  class="w-40"
  size="sm"
  searchable
  clearable
/>

<!-- SQLite: 非表示（何も表示しない） -->
```

### 多言語対応

#### i18n/locales/ja.json

```json
{
  "sqlEditor": {
    "toolbar": {
      "database": {
        "placeholder": "スキーマを選択",
        "mysqlReadonlyTooltip": "MySQLではデフォルトデータベースのみ使用可能です。他のデータベースにアクセスする場合は、完全修飾名（database.table）を使用してください。"
      }
    }
  }
}
```

#### i18n/locales/en.json

```json
{
  "sqlEditor": {
    "toolbar": {
      "database": {
        "placeholder": "Select schema",
        "mysqlReadonlyTooltip": "MySQL uses the default database specified in the connection. To access other databases, use fully qualified names (database.table)."
      }
    }
  }
}
```

## データ構造設計

### 型定義の変更

**ファイル**: `app/types/sql-editor.ts`

#### SqlEditorState インターフェースに追加

```typescript
export interface SqlEditorState {
  // ... 既存のフィールド ...

  /** 選択中のデータベース（コンテキスト） */
  selectedDatabase: string | null  // ← 追加

  // ... 既存のフィールド ...
}
```

**追加位置**: `connectionId` の後ろに追加することを推奨

#### SqlEditorTab インターフェースに追加

```typescript
export interface SqlEditorTab {
  // ... 既存のフィールド ...

  /** 選択中のデータベース/スキーマ */
  selectedDatabase?: string  // ← 追加

  // ... 既存のフィールド ...
}
```

**追加位置**: `savedQueryId` の後ろに追加することを推奨

## 実装方針

### フロントエンド

#### 1. SqlEditorToolbar.vue の変更

**ファイル**: `app/components/sql-editor/SqlEditorToolbar.vue`

##### 1.1 computed プロパティの追加

```typescript
// 接続タイプを取得
const connectionType = computed(() => {
  return activeConnection.value?.type || null
})

// MySQLのデフォルトデータベース名を取得
const defaultDatabase = computed(() => {
  if (connectionType.value === 'mysql') {
    return activeConnection.value?.database || null
  }
  return null
})
```

##### 1.2 availableDatabases computed の追加

```typescript
// 利用可能なデータベース/スキーマ一覧を取得
const availableDatabases = computed(() => {
  const connectionId = sqlEditorStore.connectionId
  if (!connectionId) return []

  const structure = databaseStructureStore.structures[connectionId]
  if (!structure) return []

  return structure.schemas
    .filter(schema => !schema.isSystem)
    .map(schema => ({
      label: schema.name,
      value: schema.name,
    }))
})

// 選択中のデータベース（v-model用）
const currentDatabase = computed({
  get: () => sqlEditorStore.selectedDatabase,
  set: (value) => {
    sqlEditorStore.setSelectedDatabase(value)
  },
})
```

##### 1.3 テンプレートの変更

`<div class="flex-1" />` の**前**（保存ボタンの左側）に、データベースセレクターを追加します。

```vue
<!-- line 130付近: <div class="flex-1" /> の前に追加 -->

<!-- MySQL: 読み取り専用表示 -->
<div
  v-if="connectionType === 'mysql' && defaultDatabase"
  class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
  :title="$t('sqlEditor.toolbar.database.mysqlReadonlyTooltip')"
>
  <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-gray-500" />
  <span class="text-gray-700 dark:text-gray-300">{{ defaultDatabase }}</span>
  <UIcon name="i-heroicons-lock-closed" class="w-3 h-3 text-gray-400" />
</div>

<!-- PostgreSQL: スキーマ選択可能 -->
<USelectMenu
  v-else-if="connectionType === 'postgresql' && availableDatabases.length > 0"
  v-model="currentDatabase"
  :items="availableDatabases"
  value-key="value"
  :placeholder="$t('sqlEditor.toolbar.database.placeholder')"
  class="w-40"
  size="sm"
  searchable
  clearable
/>

<!-- SQLite: 非表示（何も表示しない） -->

<div class="flex-1" />
```

**注意**: `useDatabaseStructureStore` のimportも追加が必要です。

```typescript
import { useDatabaseStructureStore } from '~/stores/database-structure'
// ...
const databaseStructureStore = useDatabaseStructureStore()
```

#### 2. sql-editor.ts の変更

**ファイル**: `app/stores/sql-editor.ts`

##### 2.0 state に selectedDatabase を追加

```typescript
export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => {
    const initialTab = createEditorTab('Untitled 1')

    return {
      connectionId: null,
      selectedDatabase: null,  // ← 追加
      sql: initialTab.sql,
      // ... その他のフィールド ...
    }
  },
  // ...
})
```

また、`createEditorTab` 関数にも追加：

```typescript
const createEditorTab = (name: string): SqlEditorTab => ({
  id: createTabId(),
  name,
  sql: '',
  isDirty: false,
  result: null,
  error: null,
  selectionSql: null,
  currentQuery: null,
  selectedDatabase: undefined,  // ← 追加
  createdAt: new Date().toISOString(),
})
```

##### 2.1 setSelectedDatabase() アクションの追加

```typescript
/**
 * 選択中のデータベース/スキーマを設定
 */
setSelectedDatabase(database: string | null) {
  this.selectedDatabase = database

  // アクティブタブにも反映
  const tab = this.activeTab
  if (tab) {
    tab.selectedDatabase = database ?? undefined
  }
},
```

##### 2.2 setConnectionId() の修正

```typescript
setConnectionId(connectionId: string | null) {
  this.connectionId = connectionId

  // 接続情報を取得
  if (connectionId) {
    const connection = this.currentConnection
    if (connection) {
      // データベースタイプに応じて初期値を設定
      if (connection.type === 'mysql') {
        // MySQLの場合、接続のデフォルトデータベースを設定
        this.selectedDatabase = connection.database || null
      } else if (connection.type === 'postgresql') {
        // PostgreSQLの場合、デフォルトスキーマを設定（通常はpublic）
        this.selectedDatabase = 'public'
      } else {
        // SQLiteの場合、nullを設定
        this.selectedDatabase = null
      }

      // アクティブタブにも反映
      const tab = this.activeTab
      if (tab) {
        tab.selectedDatabase = this.selectedDatabase ?? undefined
      }
    }
  }
},
```

##### 2.3 generateContextSql() の修正

```typescript
generateContextSql(database: string): string | null {
  const connection = this.currentConnection
  if (!connection) {
    return null
  }

  switch (connection.type) {
    case 'mysql':
      // MySQLではUSE文が使えないため、nullを返す
      // デフォルトデータベースがそのまま使われる
      return null

    case 'postgresql':
      // PostgreSQLはSET search_pathが使用可能
      return `SET search_path TO "${database.replace(/"/g, '""')}";`

    case 'sqlite':
      // SQLiteはデータベース切り替えの概念がない
      return null

    default:
      return null
  }
},
```

##### 2.4 executeSqlText() の修正

```typescript
async executeSqlText(sqlToExecute: string, emptyMessage = '実行するSQLが空です') {
  // ... 既存のバリデーション ...

  const trimmedSql = sqlToExecute.trim()
  if (!trimmedSql) {
    // ... エラー処理 ...
    return
  }

  // PostgreSQLの場合のみ、コンテキストSQLを追加
  let finalSql = trimmedSql
  if (this.selectedDatabase) {
    const contextSql = this.generateContextSql(this.selectedDatabase)
    if (contextSql) {
      // PostgreSQLの場合のみ、SET search_path文を追加
      const upperSql = trimmedSql.toUpperCase()
      const hasSetSearchPath = upperSql.includes('SET SEARCH_PATH')

      if (!hasSetSearchPath) {
        finalSql = `${contextSql}\n${trimmedSql}`
      }
    }
  }

  // クエリ実行
  try {
    const response = await queryApi.executeQuery({
      connectionId: this.connectionId,
      sql: finalSql,
      timeoutSeconds: 30,
    })
    // ... 結果処理 ...
  } catch (error) {
    // ... エラー処理 ...
  }
},
```

### バックエンド

#### 1. mysql_executor.rs の変更

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

##### 1.1 USE文分割実行ロジックの削除

```rust
impl QueryExecutor for MysqlExecutor {
    async fn execute(&self, sql: &str, _context: Option<&str>) -> Result<QueryResult, QueryError> {
        let start = Instant::now();

        // USE文の分割実行ロジックを削除
        // シンプルにそのまま実行する
        let rows = sqlx::query(sql)
            .fetch_all(&self.pool)
            .await
            .map_err(Self::map_error)?;

        let execution_time_ms = start.elapsed().as_millis() as u64;
        Ok(self.build_query_result(rows, execution_time_ms))
    }

    async fn execute_mutation(
        &self,
        sql: &str,
        _context: Option<&str>,
    ) -> Result<MutationResult, QueryError> {
        let start = Instant::now();

        // USE文の分割実行ロジックを削除
        // シンプルにそのまま実行する
        let result = sqlx::query(sql)
            .execute(&self.pool)
            .await
            .map_err(Self::map_error)?;

        Ok(MutationResult {
            affected_rows: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    // execute_with_timeout, close メソッドは変更なし
}
```

##### 1.2 接続文字列の変更（変更なし）

```rust
pub async fn new(
    connection: &ConnectionInfo,
    password: Option<&str>,
) -> Result<Self, QueryError> {
    let connection_string =
        connection
            .build_connection_string(password)
            .map_err(|e| QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("Failed to build connection string: {}", e),
                details: None,
                native_code: None,
            })?;

    let pool = MySqlPool::connect(&connection_string)
        .await
        .map_err(|e| QueryError {
            code: QueryErrorCode::ConnectionFailed,
            message: format!("Failed to connect: {}", e),
            details: None,
            native_code: None,
        })?;

    Ok(Self { pool })
}
```

#### 2. postgresql_executor.rs の確認

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

PostgreSQLの`SET search_path`ロジックは変更せず、そのまま維持します。
現在のコードが正しく動作しているか確認のみ行います。

#### 3. query.rs のデバッグログ削除

**ファイル**: `src-tauri/src/commands/query.rs`

```rust
// タイムアウト設定
let timeout = Duration::from_secs(request.timeout_seconds.unwrap_or(30) as u64);

// クエリ実行（contextパラメータはフロントエンドでSQLに埋め込まれるため不要）
let result = tokio::select! {
    result = executor.execute_with_timeout(&request.sql, None, timeout) => result,
    _ = cancel_token.cancelled() => {
        Err(QueryError {
            code: QueryErrorCode::QueryCancelled,
            message: "Query was cancelled".to_string(),
            details: None,
            native_code: None,
        })
    }
};
```

## テストコード

本実装では、操作による動作確認を優先します。
testing.mdで詳細な手順を記載します。

## セキュリティ考慮事項

- データベース名のエスケープ処理は既存のロジックを維持
- PostgreSQLの`SET search_path`では二重引用符のエスケープ処理を実施（`replace(/"/g, '""')`）
- SQL注入対策は既存のsqlxのプリペアドステートメントで対応

## パフォーマンス考慮事項

- USE文の分割実行ロジックを削除することで、シンプルな実装となり、パフォーマンスが向上
- PostgreSQLの`SET search_path`は既存の実装を維持（パフォーマンス影響なし）

## 将来の拡張性

### 完全修飾テーブル名への自動書き換え（Future）

将来的に、MySQLで他のデータベースにアクセスしやすくするため、SQLを解析してテーブル名を自動的に完全修飾名に書き換える機能を追加する余地を残します。

例：
```sql
-- 入力
SELECT * FROM carts WHERE user_id = 1

-- 選択されたDB: benchmark_small の場合
SELECT * FROM benchmark_small.carts WHERE user_id = 1
```

この機能は以下の理由から本実装では対象外とします：
- SQLパーサーの実装が複雑
- すべてのSQLパターンに対応するのが困難
- 誤変換のリスク

## 削除対象コード一覧

### フロントエンド

- なし（既存コードを修正するのみ）

### バックエンド

**mysql_executor.rs**:
- USE文の分割実行ロジック（`if sql_upper.starts_with("USE ")` ブロック全体）
- デバッグ用println!マクロ
- 不要になった`build_query_result()`ヘルパーメソッドは残す（使用しているため）

**query.rs**:
- デバッグ用println!マクロ

## リファクタリング後の構成

### フロントエンド

```
app/
├── components/
│   └── sql-editor/
│       └── SqlEditorToolbar.vue  ← 修正
├── stores/
│   └── sql-editor.ts             ← 修正
└── types/
    └── sql-editor.ts             ← 変更なし
```

### バックエンド

```
src-tauri/src/
├── database/
│   ├── mysql_executor.rs         ← 削除（USE文ロジック）
│   └── postgresql_executor.rs    ← 変更なし
└── commands/
    └── query.rs                  ← 削除（デバッグログ）
```

## 実装順序

1. バックエンドのクリーンアップ（USE文ロジック削除、デバッグログ削除）
2. フロントエンドのストア修正（`generateContextSql()`, `setConnectionId()`）
3. UIコンポーネント修正（`SqlEditorToolbar.vue`）
4. 多言語対応（`i18n/locales/*.json`）
5. 動作確認（testing.mdの手順に従う）
