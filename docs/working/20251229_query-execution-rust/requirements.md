# 要件定義書: クエリ実行基盤（Rust）

## 概要

WBS Phase 2.1で定義されている「クエリ実行基盤（Rust）」の実装を行う。
フロントエンドから生成されたSQLを実際にデータベースで実行し、結果を返却する機能をRustバックエンドで実装する。

## 背景

- Phase 1.6までにクエリビルダー基盤が完成しており、SQL生成エンジンでSELECT文の生成が可能
- 現在は`generate_sql`コマンドでSQLを生成するのみで、実際の実行機能はない
- ユーザーが生成したSQLを実行して結果を確認できるようにする必要がある

## 実現したいこと

1. **各データベースでのクエリ実行**
   - PostgreSQL、MySQL、SQLiteの3種類のデータベースでSELECT文を実行可能にする
   - 既存のDatabaseInspectorパターンを参考に、QueryExecutorトレイトを定義

2. **フロントエンドからの呼び出し**
   - Tauriコマンド`execute_query`を提供し、フロントエンドからクエリ実行を可能にする
   - 実行結果は構造化されたデータとして返却

3. **接続の効率的な管理**
   - 接続プールを使用して接続の再利用を実現
   - 接続のライフサイクル管理

4. **長時間クエリへの対応**
   - タイムアウト機能でハングを防止
   - キャンセル機能で実行中のクエリを中断可能

## 機能要件

### FR-1: QueryExecutorトレイト定義

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1.1 | 各DB共通のクエリ実行インターフェースを定義 | 必須 |
| FR-1.2 | SELECT文の実行をサポート | 必須 |
| FR-1.3 | 実行結果をQueryResult型で返却 | 必須 |

### FR-2: 各DBのQueryExecutor実装

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-2.1 | PostgresqlExecutorを実装 | 必須 |
| FR-2.2 | MysqlExecutorを実装 | 必須 |
| FR-2.3 | SqliteExecutorを実装 | 必須 |

### FR-3: Tauriコマンド

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-3.1 | `execute_query`コマンドを提供 | 必須 |
| FR-3.2 | 接続IDとSQL文字列を受け取る | 必須 |
| FR-3.3 | 実行結果またはエラーを返却 | 必須 |

### FR-4: 接続プール管理

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-4.1 | 接続プールを使用して接続を再利用 | 必須 |
| FR-4.2 | 接続のライフサイクル管理 | 必須 |
| FR-4.3 | 未使用接続の自動クローズ | 推奨 |

### FR-5: タイムアウト・キャンセル

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-5.1 | クエリ実行のタイムアウト設定 | 必須 |
| FR-5.2 | 実行中クエリのキャンセル機能 | 必須 |
| FR-5.3 | キャンセル時のリソース解放 | 必須 |

## 非機能要件

| ID | 要件 | 内容 |
|----|------|------|
| NFR-1 | パフォーマンス | 接続プールにより接続確立のオーバーヘッドを削減 |
| NFR-2 | 信頼性 | タイムアウト・キャンセルでリソースリークを防止 |
| NFR-3 | 拡張性 | トレイトベースの設計で新規DB対応が容易 |

## 制約事項

- 現時点ではSELECT文のみをサポート（UPDATE/DELETE/DROPはPhase 3で対応）
- パスワード取得は既存のCredentialStorageを使用
- 接続情報は既存のConnectionServiceを使用

## 参照資料

- WBS: `docs/sql_editor_wbs_v3.md` Phase 2.1
- 既存パターン: `src-tauri/src/services/database_inspector.rs`
- PostgreSQL接続パターン: `src-tauri/src/database/postgresql_inspector.rs`

## 成果物

- `src-tauri/src/services/query_executor.rs` - QueryExecutorトレイト
- `src-tauri/src/database/postgresql_executor.rs` - PostgreSQL実装
- `src-tauri/src/database/mysql_executor.rs` - MySQL実装
- `src-tauri/src/database/sqlite_executor.rs` - SQLite実装
- `src-tauri/src/commands/query.rs` - execute_queryコマンド追加
