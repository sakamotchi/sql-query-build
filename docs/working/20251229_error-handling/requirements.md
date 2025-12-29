# 要件定義書: エラーハンドリング

## 概要

WBS Phase 2.3で定義されている「エラーハンドリング」の実装を行う。
クエリ実行時のエラーを適切に分類し、ユーザーにわかりやすく表示する機能を実装する。

## 背景

- Phase 2.1でクエリ実行基盤（Rust）が完成
- Phase 2.2で結果表示UIが完成
- 現状、エラー発生時は単純なメッセージ表示のみ
- 構文エラーの位置特定や、エラー種別に応じた対処法の提示が必要

## 実現したいこと

1. **エラーの分類と識別**
   - 接続エラー、構文エラー、権限エラーなどを識別
   - エラーコードに基づく適切な分類

2. **わかりやすいエラーメッセージ表示**
   - エラー種別に応じたアイコン表示
   - 日本語でのエラーメッセージ表示
   - 対処法の提示（可能な場合）

3. **構文エラー位置の可視化**
   - エラー発生行・列の特定
   - SQLプレビュー内でのエラー位置ハイライト

## 機能要件

### FR-1: QueryError型の拡充

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1.1 | エラーコードの分類を拡充（Rust側） | 必須 |
| FR-1.2 | PostgreSQLエラーコードのマッピング | 必須 |
| FR-1.3 | MySQLエラーコードのマッピング | 必須 |
| FR-1.4 | SQLiteエラーコードのマッピング | 必須 |
| FR-1.5 | エラー位置情報の取得（行・列） | 推奨 |

### FR-2: エラー表示UI

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-2.1 | QueryErrorDisplay.vueコンポーネント作成 | 必須 |
| FR-2.2 | エラー種別に応じたアイコン表示 | 必須 |
| FR-2.3 | エラーメッセージの日本語化 | 必須 |
| FR-2.4 | エラー詳細の展開表示 | 推奨 |
| FR-2.5 | 対処法・ヒントの表示 | 推奨 |

### FR-3: 構文エラーハイライト

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-3.1 | エラー位置の取得とパース | 必須 |
| FR-3.2 | SQLプレビュー内でのエラー行ハイライト | 必須 |
| FR-3.3 | エラー箇所への波線下線表示 | 推奨 |
| FR-3.4 | エラー箇所クリックで詳細表示 | 推奨 |

### FR-4: ResultPanel統合

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-4.1 | ResultPanel.vueのエラー表示を拡充 | 必須 |
| FR-4.2 | エラー時のリトライボタン | 推奨 |
| FR-4.3 | エラー履歴の保持 | 推奨 |

## 非機能要件

| ID | 要件 | 内容 |
|----|------|------|
| NFR-1 | ユーザビリティ | エラーメッセージが技術者でなくても理解可能 |
| NFR-2 | 一貫性 | 全DBタイプで同一のエラー表示形式 |
| NFR-3 | アクセシビリティ | エラー表示にaria-live属性を付与 |

## 制約事項

- 全DBのエラーコードを完全にカバーすることは困難（主要なものを優先）
- 構文エラー位置はDBからの情報に依存（取得できない場合もある）
- SQLプレビューはCodeMirrorなどのリッチエディタではない（シンプルなハイライトのみ）

## WBSタスク対応

| タスクID | タスク名 | 対応要件 |
|---------|---------|---------|
| 2.3.1 | QueryError型定義 | FR-1.* |
| 2.3.2 | エラー表示UI | FR-2.*, FR-4.* |
| 2.3.3 | 構文エラーハイライト | FR-3.* |

## 参照資料

- WBS: `docs/sql_editor_wbs_v3.md` Phase 2.3
- Rust側QueryError: `src-tauri/src/models/query_result.rs`
- PostgreSQL Executor: `src-tauri/src/database/postgresql_executor.rs`
- MySQL Executor: `src-tauri/src/database/mysql_executor.rs`
- SQLite Executor: `src-tauri/src/database/sqlite_executor.rs`
- 既存ResultPanel: `app/components/query-builder/ResultPanel.vue`
- 既存QueryExecuteError型: `app/types/query-result.ts`

## 成果物

- `src-tauri/src/models/query_result.rs` - QueryError拡充
- `src-tauri/src/database/*_executor.rs` - エラーマッピング強化
- `app/types/query-result.ts` - フロントエンドエラー型拡充
- `app/components/query-builder/error/QueryErrorDisplay.vue` - エラー表示コンポーネント
- `app/components/query-builder/error/ErrorHint.vue` - エラーヒント表示
- `app/components/query-builder/SqlPreview.vue` - エラーハイライト追加
- `app/components/query-builder/ResultPanel.vue` - エラー表示統合
- `app/utils/error-messages.ts` - エラーメッセージマッピング
