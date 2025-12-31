# タスクリスト: 6C - JOIN設定インテリジェント機能

**作成日**: 2025-12-31
**最終更新**: 2025-12-31

---

## タスク概要

| タスクID | タスク名 | 状態 | 担当 | 開始日 | 完了日 |
|---------|---------|------|------|--------|--------|
| 6C.1 | 外部キー情報取得API拡張 | 📝 未着手 | - | - | - |
| 6C.2 | JOIN提案エンジン実装 | 📝 未着手 | - | - | - |
| 6C.3 | 提案UI実装 | 📝 未着手 | - | - | - |
| 6C.4 | ワンクリックJOIN適用 | 📝 未着手 | - | - | - |

---

## 6C.1: 外部キー情報取得API拡張

**依存**: Phase 6A完了
**完了条件**: データベース構造から外部キー情報を取得できる

### サブタスク

- [ ] **6C.1.1**: `TableForeignKey`構造体定義
  - ファイル: `src-tauri/src/services/database_inspector.rs`
  - 内容: `TableForeignKey { schema, table, foreign_key }`を定義
  - 注: `ForeignKey`型は既存（`src-tauri/src/models/database_structure.rs`）を使用

- [ ] **6C.1.2**: `DatabaseInspector`トレイトに`get_all_foreign_keys()`追加
  - ファイル: `src-tauri/src/services/database_inspector.rs`
  - 内容: `async fn get_all_foreign_keys(&self, schema: Option<&str>) -> Result<Vec<TableForeignKey>, String>`
  - 注: 既存の`get_foreign_keys(schema, table)`とは別メソッド

- [ ] **6C.1.3**: PostgreSQL `get_all_foreign_keys()`実装
  - ファイル: `src-tauri/src/database/postgresql_inspector.rs`
  - 実装: 既存の`get_tables()`と`get_foreign_keys()`を組み合わせてスキーマ全体の外部キーを取得

- [ ] **6C.1.4**: MySQL `get_all_foreign_keys()`実装
  - ファイル: `src-tauri/src/database/mysql_inspector.rs`
  - 実装: 既存メソッドを活用してスキーマ全体の外部キーを取得

- [ ] **6C.1.5**: SQLite `get_all_foreign_keys()`実装
  - ファイル: `src-tauri/src/database/sqlite_inspector.rs`
  - 実装: 既存メソッドを活用して全テーブルの外部キーを取得

- [ ] **6C.1.6**: 外部キー取得の単体テスト作成
  - テストDB接続で実際の外部キー情報が取得できることを確認
  - PostgreSQL、MySQL、SQLite各DBでテスト

---

## 6C.2: JOIN提案エンジン実装

**依存**: 6C.1完了
**完了条件**: 外部キーベースの提案ロジックが動作する

### サブタスク

- [ ] **6C.2.1**: `JoinSuggestion`モデル定義
  - ファイル: `src-tauri/src/models/join_suggestion.rs`
  - 内容: from_table, to_table, join_type, conditions, confidence, reason

- [ ] **6C.2.2**: `JoinSuggestionEngine`構造体作成
  - ファイル: `src-tauri/src/services/join_suggestion_engine.rs`
  - フィールド: `foreign_keys: Vec<TableForeignKey>`, `table_columns: HashMap<String, Vec<Column>>`
  - 注: `DatabaseStructure`全体ではなく、必要なテーブルのカラムのみ保持

- [ ] **6C.2.3**: `suggest_by_foreign_keys()`実装
  - 外部キー制約からJOIN候補を生成
  - 信頼度: 1.0（最高）
  - 複合外部キー対応（複数カラムのJOIN条件）

- [ ] **6C.2.4**: `suggest_by_column_names()`実装
  - カラム名の一致パターンからJOIN候補を生成
  - パターン: 完全一致（0.7）、`user_id`↔`id`（0.8）

- [ ] **6C.2.5**: `suggest_joins()`メインロジック実装
  - 外部キーベース + カラム名ベースを統合
  - 信頼度順にソート

- [ ] **6C.2.6**: `get_join_suggestions` Tauriコマンド実装
  - ファイル: `src-tauri/src/commands/join_suggestions.rs`
  - 内容: `connection_id`, `from_table`, `to_table`, `schema`を受け取り、提案を返す
  - 注: `DatabaseInspectorFactory::create()`で`password`パラメータ必要

- [ ] **6C.2.7**: `main.rs`にコマンド登録
  - `.invoke_handler`に`get_join_suggestions`を追加

- [ ] **6C.2.8**: 提案エンジンの単体テスト作成

以下のサブタスクに分割:

- [ ] **6C.2.8a**: 外部キーベースの提案テスト
  - `test_suggest_by_foreign_keys()`を実装
  - 単一カラムと複合外部キーの両方をテスト

- [ ] **6C.2.8b**: カラム名ベースの提案テスト
  - `test_suggest_by_column_names()`を実装
  - 完全一致、パターンマッチをテスト

- [ ] **6C.2.8c**: 提案のソート順テスト
  - `test_suggest_joins_sorting()`を実装
  - 信頼度順にソートされることを確認

---

## 6C.3: 提案UI実装

**依存**: 6C.2完了
**完了条件**: JoinConfigDialogに提案が表示される

### サブタスク

- [ ] **6C.3.1**: TypeScript型定義作成
  - ファイル: `app/types/join-suggestion.ts`
  - 内容: JoinSuggestion, JoinConditionインターフェース

- [ ] **6C.3.2**: API層実装
  - ファイル: `app/api/join-suggestions.ts`
  - 内容: `getJoinSuggestions(connectionId, fromTable, toTable, schema?)`
  - 注: `schema`パラメータはオプショナル

- [ ] **6C.3.3**: Piniaストアに提案関連state追加
  - ファイル: `app/stores/query-builder.ts`
  - state: `joinSuggestions`, `isLoadingSuggestions`

- [ ] **6C.3.4**: `fetchJoinSuggestions()`実装
  - Piniaストア内のアクション
  - バックエンドAPIを呼び出して提案を取得

- [ ] **6C.3.5**: `JoinSuggestionItem.vue`コンポーネント作成
  - ファイル: `app/components/query-builder/join/JoinSuggestionItem.vue`
  - 内容: 1つの提案を表示（信頼度の星、理由、ON条件、適用ボタン）

- [ ] **6C.3.6**: `JoinSuggestionList.vue`コンポーネント作成
  - ファイル: `app/components/query-builder/join/JoinSuggestionList.vue`
  - 内容: 提案のリストを表示、ローディング状態、0件メッセージ

- [ ] **6C.3.7**: `JoinConfigDialog.vue`に提案セクションを統合
  - ファイル: `app/components/query-builder/dialog/JoinConfigDialog.vue`
  - 内容: テーブル選択時に提案を自動取得して表示

- [ ] **6C.3.8**: UIコンポーネントの単体テスト作成
  - `JoinSuggestionItem.vue`のテスト
  - `JoinSuggestionList.vue`のテスト

---

## 6C.4: ワンクリックJOIN適用

**依存**: 6C.3完了
**完了条件**: 提案をワンクリックで適用できる

### サブタスク

- [ ] **6C.4.1**: `applyJoinSuggestion()`実装
  - Piniaストア内のアクション
  - 提案から`Omit<JoinClause, 'id'>`オブジェクトを生成
  - 文字列形式（"table.column"）を`JoinCondition`型に変換
  - 注: `QueryJoin`ではなく`JoinClause`型を使用

- [ ] **6C.4.2**: 提案適用後のUI更新
  - JoinConfigDialogのON条件欄に反映
  - ユーザーが手動編集できることを確認

- [ ] **6C.4.3**: 適用機能のE2Eテスト
  - 提案をクリック→JOIN条件が設定される→SQLが正しく生成される

- [ ] **6C.4.4**: PostgreSQL実機テスト
  - 参照: `testing.md` の TC-6C-001〜003
  - サンプルDBで外部キーベースの提案が表示される
  - 提案を適用してクエリ実行できる

- [ ] **6C.4.5**: MySQL実機テスト
  - 参照: `testing.md` の TC-6C-004
  - サンプルDBで外部キーベースの提案が表示される
  - 提案を適用してクエリ実行できる

- [ ] **6C.4.6**: SQLite実機テスト
  - 参照: `testing.md` の TC-6C-005〜006
  - サンプルDBで外部キーベースの提案が表示される（または0件）
  - カラム名ベースの提案が表示される
  - 提案を適用してクエリ実行できる

- [ ] **6C.4.7**: ドキュメント更新
  - `docs/features/query-builder.md`に提案機能の説明を追加
  - WBS完了状態を更新

---

## 進捗状況

```
全体進捗: 0/4タスク完了（0%）

6C.1: 外部キー情報取得API拡張    [          ] 0/6
6C.2: JOIN提案エンジン実装        [          ] 0/10 (2.8を3つに分割)
6C.3: 提案UI実装                  [          ] 0/8
6C.4: ワンクリックJOIN適用        [          ] 0/7

合計サブタスク: 31個
```

---

## リスク・課題

| リスクID | 内容 | 影響度 | 対策 | 状態 |
|---------|------|--------|------|------|
| R6C-001 | SQLiteで外部キー情報が不完全 | 中 | カラム名ベースの提案で補完 | 📝 未対応 |
| R6C-002 | 提案精度が低い可能性 | 低 | ユーザーフィードバックを収集し改善 | 📝 未対応 |
| R6C-003 | 大量のテーブル間で提案が遅い | 中 | キャッシュ機構を実装 | 📝 未対応 |

---

## メモ・備考

- **優先度**: 低（Phase 6Aが完了後に着手）
- **Phase 6Aとの関係**: JoinConfigDialogが実装済みであることが前提
- **Phase 6Bとの関係**: ビジュアル表現機能とは独立（並行開発可能）

---

## 完了チェックリスト

### 機能要件
- [ ] 外部キー制約からJOIN条件が自動提案される
- [ ] 提案をワンクリックで適用できる
- [ ] 複数テーブル間の最適なJOINパスを提案できる（将来拡張）

### 非機能要件
- [ ] 外部キー情報の取得が5秒以内に完了する
- [ ] JOIN提案の計算が1秒以内に完了する（10テーブル以下）

### DB対応
- [ ] PostgreSQLで提案機能が動作する
- [ ] MySQLで提案機能が動作する
- [ ] SQLiteで提案機能が動作する（外部キーまたはカラム名ベース）

### ドキュメント
- [ ] 永続化ドキュメント（`docs/features/query-builder.md`）が更新されている
- [ ] WBS v3が完了状態に更新されている
