# クエリビルダー機能 詳細仕様

**バージョン**: 1.1
**作成日**: 2025年12月29日
**最終更新**: 2026年1月17日
**状態**: ✅ 完了（Phase 1〜5）

---

## 1. 機能概要

GUIを通じてSQLクエリを視覚的に構築する機能。ドラッグ&ドロップでテーブルを選択し、条件設定UIでWHERE/GROUP BY/ORDER BYなどを設定する。

---

## 2. レイアウト構成

### 2.1 3カラムレイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ 環境識別ヘッダー + ツールバー                                │
├───────────┬─────────────────────────┬───────────────────────┤
│ 左パネル  │     中央パネル          │    右パネル           │
│ (20%)    │     (50%)               │    (30%)              │
│          │                         │                       │
│ DBツリー  │  テーブル関係エリア      │  SQLプレビュー         │
│          │  (上部)                  │                       │
│          │                         │  クエリ情報            │
│          │  条件設定タブ            │                       │
│          │  (下部)                  │                       │
├───────────┴─────────────────────────┴───────────────────────┤
│ 結果パネル（実行結果表示、ページネーション、エクスポート）      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 パネル構成

| パネル | コンポーネント | 説明 |
|--------|--------------|------|
| 左パネル | `LeftPanel.vue` | データベース構造ツリー |
| 中央パネル | `CenterPanel.vue` | テーブル関係図 + 条件設定タブ |
| 右パネル | `RightPanel.vue` | SQLプレビュー + クエリ情報 |
| 結果パネル | `ResultPanel.vue` | クエリ実行結果・ページネーション・エクスポート |

---

## 3. データモデル

### 3.1 QueryModel（クエリ定義）

```typescript
interface QueryModel {
  id?: string
  name?: string
  description?: string
  connectionId: string
  select: SelectClause
  from: FromClause
  joins: JoinClause[]
  whereClause?: WhereClause
  groupBy?: GroupByClause
  having?: HavingClause
  orderBy?: OrderByClause
  limit: LimitClause | null
}
```

### 3.2 主要な句の構造

#### SelectClause
```typescript
interface SelectClause {
  distinct: boolean
  columns: SelectColumn[]
}

interface SelectColumn {
  type: 'column' | 'expression' | 'aggregate' | 'all'
  tableAlias?: string
  columnName?: string
  aggregate?: AggregateFunction
  alias?: string | null
}
```

#### WhereClause
```typescript
interface WhereClause {
  logic: 'AND' | 'OR'
  conditions: WhereConditionItem[]
}

type WhereConditionItem = WhereCondition | WhereConditionGroup

interface WhereCondition {
  type: 'condition'
  id: string
  column: { tableAlias: string; columnName: string }
  operator: WhereOperator
  value: WhereValue
}

interface WhereConditionGroup {
  type: 'group'
  id: string
  logic: 'AND' | 'OR'
  conditions: WhereConditionItem[]
}
```

---

## 4. 条件設定タブ

### 4.1 SELECTタブ

**コンポーネント**: `SelectTab.vue`

#### 機能
- 選択可能なカラム一覧（テーブルごとにグループ化）
- チェックボックスによる選択
- 選択順序の変更（ドラッグ&ドロップ）
- カラムエイリアスの設定
- DISTINCT設定

### 4.2 WHEREタブ

**コンポーネント**: `WhereTab.vue`

#### 機能
- 条件行の追加・削除
- カラム選択（ドロップダウン）
- 演算子選択（=, !=, >, <, LIKE, IN, BETWEEN, IS NULL, 等）
- 値入力（型に応じた入力UI）
- AND/OR切り替え
- 条件グループ（ネスト対応）

#### 対応演算子
| 演算子 | 値の入力UI | 説明 |
|--------|-----------|------|
| =, !=, <, <=, >, >= | 単一値 | 比較演算子 |
| LIKE, NOT LIKE | 単一値（%使用可） | パターンマッチ |
| ILIKE, NOT ILIKE | 単一値（PostgreSQL専用） | 大文字小文字無視 |
| IN, NOT IN | 複数値 | リスト内包含 |
| BETWEEN, NOT BETWEEN | 範囲（from-to） | 範囲指定 |
| IS NULL, IS NOT NULL | なし | NULL判定 |

### 4.3 GROUP BYタブ

**コンポーネント**: `GroupByTab.vue`

#### 機能
- グループ化カラムの選択
- 複数カラム対応
- 順序変更

### 4.4 ORDER BYタブ

**コンポーネント**: `OrderByTab.vue`

#### 機能
- ソートカラムの選択
- ASC/DESC設定
- 複数カラム対応（優先順位順）
- 順序変更

### 4.5 LIMITタブ

**コンポーネント**: `LimitTab.vue`

#### 機能
- 件数制限の設定
- OFFSET設定

---

## 5. SQL生成エンジン

### 5.1 概要

フロントエンドで構築した`QueryModel`をRustバックエンドに送信し、DBダイアレクトに応じたSQLを生成する。

### 5.2 DB方言対応

| DB種別 | ダイアレクト | 特記事項 |
|--------|------------|---------|
| PostgreSQL | `PostgresDialect` | ILIKE対応、NULLS FIRST/LAST対応 |
| MySQL | `MysqlDialect` | バッククォート使用 |
| SQLite | `SqliteDialect` | LIMIT OFFSET構文 |

### 5.3 生成処理フロー

```
QueryModel (フロントエンド)
    ↓ invoke("generate_sql", { query, dialect })
QueryModel (Rust)
    ↓ SqlBuilder::build()
SQL文字列
    ↓
フロントエンドでプレビュー表示
```

### 5.4 関連Rustモジュール

| モジュール | パス | 説明 |
|-----------|------|------|
| sql_generator/builder.rs | SQL生成のメインロジック |
| sql_generator/dialect.rs | DB方言トレイト |
| sql_generator/dialects/ | 各DB方言の実装 |
| sql_generator/clause/ | 各句（SELECT, WHERE等）の生成 |

---

## 6. データベース構造取得

### 6.1 API

```rust
#[tauri::command]
async fn get_database_structure(connection_id: String) -> Result<DatabaseStructure, Error>
```

### 6.2 返却データ構造

```typescript
interface DatabaseStructure {
  schemas: Schema[]
}

interface Schema {
  name: string
  tables: Table[]
  views: View[]
}

interface Table {
  name: string
  columns: Column[]
}

interface Column {
  name: string
  dataType: string
  nullable: boolean
  primaryKey: boolean
  foreignKey?: ForeignKeyInfo
}
```

---

## 7. 関連コンポーネント

### 7.1 レイアウト系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| QueryBuilderLayout | `components/query-builder/QueryBuilderLayout.vue` | 全体レイアウト |
| LeftPanel | `components/query-builder/LeftPanel.vue` | 左パネル |
| CenterPanel | `components/query-builder/CenterPanel.vue` | 中央パネル |
| RightPanel | `components/query-builder/RightPanel.vue` | 右パネル |
| ResizablePanel | `components/query-builder/ResizablePanel.vue` | リサイズ可能パネル |

### 7.2 ツリー系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| DatabaseTree | `components/query-builder/DatabaseTree.vue` | DBツリー全体 |
| SchemaNode | `components/query-builder/tree/SchemaNode.vue` | スキーマノード |
| TableNode | `components/query-builder/tree/TableNode.vue` | テーブルノード |
| ColumnNode | `components/query-builder/tree/ColumnNode.vue` | カラムノード |

### 7.3 テーブル選択系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| TableRelationArea | `components/query-builder/TableRelationArea.vue` | テーブル配置エリア |
| DropZone | `components/query-builder/table/DropZone.vue` | ドロップゾーン |
| TableCard | `components/query-builder/table/TableCard.vue` | テーブルカード |

### 7.4 条件設定系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| ConditionTabs | `components/query-builder/ConditionTabs.vue` | タブコンテナ |
| SelectTab | `components/query-builder/select/SelectTab.vue` | SELECTタブ |
| WhereTab | `components/query-builder/where/WhereTab.vue` | WHEREタブ |
| ConditionRow | `components/query-builder/where/ConditionRow.vue` | 条件行 |
| ConditionGroup | `components/query-builder/where/ConditionGroup.vue` | 条件グループ |
| GroupByTab | `components/query-builder/group-by/GroupByTab.vue` | GROUP BYタブ |
| OrderByTab | `components/query-builder/order-by/OrderByTab.vue` | ORDER BYタブ |
| LimitTab | `components/query-builder/limit/LimitTab.vue` | LIMITタブ |

---

## 8. クエリ実行機能

### 8.1 概要

構築したSQLクエリをデータベースに対して実行し、結果を表形式で表示する機能。

### 8.2 実行フロー

```
SQLクエリ
    ↓ invoke("execute_query", { connectionId, sql, limit, offset })
QueryExecutor (Rust)
    ↓ DB接続・実行
QueryResult
    ↓
ResultTable.vue で表示
```

### 8.3 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| ResultPanel | `components/query-builder/ResultPanel.vue` | 結果パネル全体 |
| ResultTable | `components/query-builder/result/ResultTable.vue` | 結果テーブル |
| ResultRow | `components/query-builder/result/ResultRow.vue` | 結果行 |
| ResultColumnHeader | `components/query-builder/result/ResultColumnHeader.vue` | カラムヘッダー |
| ResultPagination | `components/query-builder/result/ResultPagination.vue` | ページネーション |
| QueryErrorDisplay | `components/query-builder/error/QueryErrorDisplay.vue` | エラー表示 |

---

## 9. 安全機能

### 9.1 概要

危険なクエリ（UPDATE/DELETE/DROP/TRUNCATE）の実行前に確認ダイアログを表示する機能。

### 9.2 クエリ分析

```rust
#[tauri::command]
async fn analyze_query(sql: String) -> Result<QueryAnalysis, Error>
```

### 9.3 QueryAnalysis構造

```typescript
interface QueryAnalysis {
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DROP' | 'TRUNCATE' | 'OTHER'
  isDangerous: boolean
  affectedTables: string[]
  hasWhereClause: boolean
}
```

### 9.4 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| DangerousQueryDialog | `components/query-builder/dialog/DangerousQueryDialog.vue` | 確認ダイアログ |

---

## 10. クエリ保存・履歴機能

### 10.1 クエリ保存

作成したクエリを名前をつけて保存し、後から読み込む機能。

#### API

```rust
#[tauri::command]
async fn save_query(query: SavedQuery) -> Result<(), Error>

#[tauri::command]
async fn get_saved_queries(connection_id: String) -> Result<Vec<SavedQuery>, Error>

#[tauri::command]
async fn delete_saved_query(query_id: String) -> Result<(), Error>
```

#### 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| SaveQueryDialog | `components/query-builder/dialog/SaveQueryDialog.vue` | 保存ダイアログ |
| SavedQuerySlideover | `components/query-builder/SavedQuerySlideover.vue` | 保存済みクエリ一覧 |

### 10.2 クエリ履歴

実行したクエリの履歴を管理する機能。

#### API

```rust
#[tauri::command]
async fn get_query_history(connection_id: String) -> Result<Vec<QueryHistory>, Error>

#[tauri::command]
async fn add_query_history(history: QueryHistory) -> Result<(), Error>

#[tauri::command]
async fn clear_query_history(connection_id: String) -> Result<(), Error>
```

#### 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| QueryHistorySlideover | `components/query-builder/QueryHistorySlideover.vue` | 履歴一覧 |

---

## 11. エクスポート機能

### 11.1 概要

クエリ実行結果を各種フォーマットでエクスポートする機能。

### 11.2 対応フォーマット

| フォーマット | 拡張子 | 説明 |
|------------|--------|------|
| CSV | .csv | カンマ区切りテキスト |
| Excel | .xlsx | Microsoft Excel形式 |
| JSON | .json | JSON配列形式 |

### 11.3 API

```rust
#[tauri::command]
async fn export_to_csv(data: ExportData, path: String) -> Result<(), Error>

#[tauri::command]
async fn export_to_excel(data: ExportData, path: String) -> Result<(), Error>

#[tauri::command]
async fn export_to_json(data: ExportData, path: String) -> Result<(), Error>
```

### 11.4 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| ExportDialog | `components/query-builder/dialog/ExportDialog.vue` | エクスポートダイアログ |

---

## 12. JOIN提案機能

### 12.1 概要

外部キー情報に基づいて、関連テーブルとのJOIN条件を提案する機能。

### 12.2 API

```rust
#[tauri::command]
async fn get_join_suggestions(
    connection_id: String,
    table_alias: String,
    schema: String,
    table_name: String
) -> Result<Vec<JoinSuggestion>, Error>
```

### 12.3 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| JoinSuggestionList | `components/query-builder/join/JoinSuggestionList.vue` | JOIN提案一覧 |
| JoinSuggestionItem | `components/query-builder/join/JoinSuggestionItem.vue` | JOIN提案アイテム |
| JoinConfigDialog | `components/query-builder/dialog/JoinConfigDialog.vue` | JOIN設定ダイアログ |

---

## 13. ストア

| ストア | パス | 説明 |
|--------|------|------|
| queryBuilderStore | `stores/query-builder.ts` | クエリビルダー状態管理 |
| databaseStructureStore | `stores/database-structure.ts` | DB構造キャッシュ |
| queryHistoryStore | `stores/query-history.ts` | クエリ履歴管理 |
| savedQueryStore | `stores/saved-query.ts` | 保存済みクエリ管理 |
| safetyStore | `stores/safety.ts` | 安全設定管理 |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
| 2026-01-17 | 1.1 | Phase 2-5の実装完了を反映（クエリ実行、安全機能、履歴・保存、エクスポート、JOIN提案） |
