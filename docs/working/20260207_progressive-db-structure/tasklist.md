# タスクリスト - データベース構造の段階的取得

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 22 |

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成
- [x] 設計書の作成
- [ ] レビュー完了

### T-2: 軽量テーブル一覧用の型定義追加（Rust）

- [ ] `TableSummary` 構造体の定義（name, schema, comment, estimated_row_count）
- [ ] `SchemaSummary` 構造体の定義（name, is_system, tables, views）
- [ ] `DatabaseStructureSummary` 構造体の定義（connection_id, database_name, database_type, schemas, fetched_at）
- [ ] Serialize/Deserialize derive と camelCase serde rename の設定
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/models/database_structure.rs`

### T-3: DatabaseInspectorトレイトに新メソッド追加

- [ ] `get_table_summaries` メソッドをトレイトに追加
- [ ] デフォルト実装またはシグネチャのみ定義
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/inspector.rs`
**依存**: T-2

### T-4: PostgreSQLインスペクター - テーブル名高速取得

- [ ] スキーマ一覧を1クエリで取得するSQL実装
- [ ] テーブル名・コメント・推定行数を1クエリで取得するSQL実装
- [ ] ビュー名も同様に取得
- [ ] システムスキーマ（pg_catalog, information_schema, pg_toast）の判定
- [ ] `get_table_summaries` メソッドの実装
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/postgresql_inspector.rs`
**依存**: T-3

### T-5: MySQLインスペクター - テーブル名高速取得

- [ ] `information_schema.tables` から1クエリでテーブル名一覧を取得するSQL実装
- [ ] ビュー名も同様に取得
- [ ] システムスキーマ（information_schema, performance_schema, mysql, sys）の判定
- [ ] `get_table_summaries` メソッドの実装
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`
**依存**: T-3

### T-6: SQLiteインスペクター - テーブル名高速取得

- [ ] `sqlite_master` から1クエリでテーブル名一覧を取得
- [ ] ビュー名も取得（`type='view'`）
- [ ] システムテーブル（`sqlite_%`）の除外
- [ ] `get_table_summaries` メソッドの実装
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/sqlite_inspector.rs`
**依存**: T-3

### T-7: Tauriコマンド追加 - テーブル名一覧取得

- [ ] `get_database_structure_summary` コマンドの実装
- [ ] コマンドの登録（lib.rs）
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/commands/database_structure.rs`, `src-tauri/src/lib.rs`
**依存**: T-4, T-5, T-6

### T-8: MySQLバッチクエリ - カラム一括取得

- [ ] `get_all_columns_in_schema` メソッドの実装
- [ ] `information_schema.COLUMNS` から1クエリでスキーマ全体のカラムを取得
- [ ] `HashMap<String, Vec<Column>>` への変換
- [ ] nullable, default, is_primary_key等の既存情報を維持
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`

### T-9: MySQLバッチクエリ - インデックス一括取得

- [ ] `get_all_indexes_in_schema` メソッドの実装
- [ ] `information_schema.STATISTICS` から1クエリで取得
- [ ] `HashMap<String, Vec<Index>>` への変換
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`

### T-10: MySQLバッチクエリ - 外部キー一括取得

- [ ] `get_all_foreign_keys_in_schema` メソッドの実装
- [ ] `get_all_foreign_key_references_in_schema` メソッドの実装
- [ ] `information_schema.KEY_COLUMN_USAGE` + `REFERENTIAL_CONSTRAINTS` から取得
- [ ] on_delete, on_update アクションの正しい取得
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`

### T-11: MySQLバッチクエリ - プライマリキー一括取得

- [ ] `get_all_primary_keys_in_schema` メソッドの実装
- [ ] `information_schema.TABLE_CONSTRAINTS` + `KEY_COLUMN_USAGE` から取得
- [ ] `HashMap<String, PrimaryKey>` への変換
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`

### T-12: MySQL get_tables をバッチ方式に統合

- [ ] 既存の `get_tables` メソッドをバッチ取得メソッドを使用する方式に書き換え
- [ ] テーブルごとの個別クエリを廃止
- [ ] PostgreSQLの `get_tables` 実装パターンを参考に統合
- [ ] 既存の `get_database_structure` が正常動作することを確認
- [ ] 動作確認

**対象ファイル**: `src-tauri/src/database/mysql_inspector.rs`
**依存**: T-8, T-9, T-10, T-11

### T-13: バックエンドのユニットテスト

- [ ] 軽量構造体の型テスト
- [ ] 各DB種別の `get_table_summaries` テスト
- [ ] MySQLバッチクエリのテスト
- [ ] 既存テストが壊れていないことを確認

**対象ファイル**: `src-tauri/src/` 配下のテストファイル
**依存**: T-7, T-12

### T-14: フロントエンド型定義・API追加

- [ ] `DatabaseStructureSummary`, `SchemaSummary`, `TableSummary` のTypeScript型定義
- [ ] `databaseStructureApi.getDatabaseStructureSummary()` メソッド追加
- [ ] 動作確認

**対象ファイル**: `app/types/database-structure.ts`, `app/api/database-structure.ts`
**依存**: T-7

### T-15: ストア - 段階的ロード状態管理の実装

- [ ] `summaries` ステート追加（接続IDごとのサマリーデータ）
- [ ] `columnCache` ステート追加（テーブルごとのカラムキャッシュ）
- [ ] `fetchDatabaseStructureSummary` アクション実装
- [ ] `fetchColumnsForTable` アクション実装（オンデマンド取得用）
- [ ] `startBackgroundFetch` アクション実装（バックグラウンド取得用）
- [ ] ローディング状態管理（summaryLoadingIds, backgroundProgress, columnLoadingKeys）
- [ ] 既存の `structures` / `fetchDatabaseStructure` を後方互換のため維持
- [ ] 動作確認

**対象ファイル**: `app/stores/database-structure.ts`
**依存**: T-14

### T-16: 補完機能 - テーブル名のみでの補完対応

- [ ] `getTableCompletions` がサマリーデータからテーブル名候補を生成できるようにする
- [ ] サマリーのみの場合でもテーブルコメント・推定行数を表示
- [ ] 詳細データ取得済みの場合はそちらを優先使用
- [ ] 動作確認

**対象ファイル**: `app/composables/useSqlCompletion.ts`
**依存**: T-15

### T-17: 補完機能 - オンデマンドカラム取得の実装

- [ ] `.` 入力時にカラムが未キャッシュの場合 `fetchColumnsForTable` を呼び出す
- [ ] カラム取得中は "Loading columns..." 等のローディング候補を表示
- [ ] カラム取得完了後に補完候補を自動更新
- [ ] 取得済みカラムはキャッシュから返却（再取得しない）
- [ ] 動作確認

**対象ファイル**: `app/composables/useSqlCompletion.ts`
**依存**: T-15

### T-18: SQLエディタページ - フェーズ1取得への切り替え

- [ ] 接続確立時に `fetchDatabaseStructureSummary` を呼び出す
- [ ] サマリー取得完了後に `startBackgroundFetch` を呼び出す
- [ ] 既存の `fetchDatabaseStructure` 呼び出しを置き換え
- [ ] 動作確認

**対象ファイル**: `app/pages/sql-editor.vue`
**依存**: T-15

### T-19: バックグラウンド詳細取得ロジックの実装

- [ ] テーブルを順番にバッチ処理でカラム情報を取得
- [ ] UIブロック防止の適切なディレイ挿入
- [ ] オンデマンド取得要求テーブルの優先処理
- [ ] 進捗状態（完了数/総数）のストア管理
- [ ] 接続切断・ページ遷移時の取得キャンセル処理
- [ ] 動作確認

**対象ファイル**: `app/stores/database-structure.ts`
**依存**: T-15

### T-20: ローディング状態のUI表示

- [ ] フェーズ1取得中のローディングインジケーター表示
- [ ] バックグラウンド取得の進捗表示（例: "30/100 tables loaded"）
- [ ] 全取得完了時の進捗表示消去
- [ ] 取得エラー時のエラー状態表示
- [ ] 動作確認

**対象ファイル**: `app/components/sql-editor/` 配下
**依存**: T-19

### T-21: クエリビルダー・ミューテーションビルダーとの統合確認

- [ ] クエリビルダーのDatabaseTreeが正常にテーブル一覧を表示
- [ ] ミューテーションビルダーのTableSelectorが正常に動作
- [ ] 既存の `fetchDatabaseStructure` 使用画面の正常動作確認
- [ ] 必要に応じた修正

**対象ファイル**: `app/components/query-builder/DatabaseTree.vue`, `app/components/mutation-builder/TableSelector.vue`
**依存**: T-15

### T-22: フロントエンドのユニットテスト

- [ ] ストアの段階的ロード動作テスト
- [ ] 補完機能のサマリーデータ対応テスト
- [ ] オンデマンド取得テスト
- [ ] 既存テストが壊れていないことを確認

**対象ファイル**: `app/stores/__tests__/`, `app/composables/__tests__/`
**依存**: T-16, T-17, T-18

### T-23: 総合テスト・動作確認

- [ ] `npm run test:run` が全て通る
- [ ] `npm run typecheck` が通る
- [ ] PostgreSQL, MySQL, SQLite の各DB種別で補完が正常動作
- [ ] テーブル数が多いDBで体感速度の改善を確認
- [ ] クエリビルダー・ミューテーションビルダーの正常動作

**依存**: All

### T-24: 永続化ドキュメント更新

- [ ] `docs/steering/03_architecture_specifications.md` のTauriコマンド一覧に新コマンドを追加
- [ ] `docs/steering/features/query-builder.md` に段階的ロードの仕様を反映
- [ ] `docs/steering/04_repository_structure.md` に新ファイルがあれば追加

**依存**: T-23

## 完了条件

- [ ] 全タスクが完了
- [ ] テストがすべてパス（`npm run test:run`, `npm run typecheck`）
- [ ] 永続化ドキュメントが更新済み
- [ ] 100テーブル規模のDBでテーブル名補完が2秒以内に利用可能
