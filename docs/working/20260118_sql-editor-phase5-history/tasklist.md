# タスクリスト - SQLエディタ Phase 5: クエリ履歴機能

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 9 |

## タスク一覧

### P5-1: 履歴モデル定義（Rust）

**見積**: 1h

**対象ファイル**: `src-tauri/src/models/sql_editor_history.rs` (新規作成)

- [ ] `SqlEditorHistoryEntry` 構造体を定義
  - `id`, `connection_id`, `sql`, `executed_at`, `execution_time_ms`, `status`, `row_count`, `error_message`
- [ ] `ExecutionStatus` enumを定義（Success, Error）
- [ ] `AddSqlEditorHistoryRequest` 構造体を定義
- [ ] `SearchSqlEditorHistoryRequest` 構造体を定義
- [ ] serde derive（Serialize, Deserialize）を適用
- [ ] `#[serde(rename_all = "camelCase")]` を適用（TypeScriptとの互換性）
- [ ] ドキュメントコメントを追加

**完了条件**:
- 型定義がコンパイルエラーなく動作する
- TypeScript側の型定義と一致する（camelCase）

**参考**:
- `src-tauri/src/models/query_history.rs` - Query Builder用履歴モデル（参考のみ、流用しない）

---

### P5-2: 履歴サービス実装（Rust）

**見積**: 2h

**対象ファイル**: `src-tauri/src/services/sql_editor_history.rs` (新規作成)

- [ ] `SqlEditorHistoryService` 構造体を実装
- [ ] `new(path_manager: &PathManager)` メソッドを実装
  - `sql_editor_histories_dir()` でディレクトリパスを取得
  - ディレクトリが存在しない場合は作成
- [ ] `add_history(request: AddSqlEditorHistoryRequest)` メソッドを実装
  - UUID生成（`uuid` クレート）
  - 実行日時を現在時刻に設定（`chrono::Utc::now().to_rfc3339()`）
  - JSON Lines形式でファイル末尾に追記
  - 追記後、`cleanup_if_needed()` を呼び出し
- [ ] `get_histories(request: SearchSqlEditorHistoryRequest)` メソッドを実装
  - JSON Linesファイルを行単位で読み込み
  - キーワード検索（SQL文の部分一致）
  - 成功のみフィルタ
  - 新しい順に並び替え（ファイルは古い順なのでリバース）
  - 件数制限（limit）
- [ ] `delete_history(connection_id: &str, id: &str)` メソッドを実装
  - 全履歴を読み込み、対象を除外
  - ファイルを再作成
- [ ] `cleanup_if_needed(connection_id: &str)` メソッドを実装
  - 履歴件数が1000件を超えた場合、古いものから削除
  - ファイルを再作成
- [ ] ユニットテストを作成
  - `test_add_history`
  - `test_get_histories`
  - `test_cleanup_if_needed`

**完了条件**:
- 履歴の追加・取得・削除が動作する
- JSON Lines形式でファイル保存される
- 1000件を超えると古いものから自動削除される
- ユニットテストがすべてパスする

**技術的な検討事項**:
- JSON Lines vs 単一JSON配列 → JSON Linesを採用（追記が高速）
- 最大件数の扱い → 1000件固定（将来的に設定可能にする）

---

### P5-3: Tauriコマンド追加

**見積**: 1h

**対象ファイル**: `src-tauri/src/commands/sql_editor.rs`

- [ ] `add_sql_editor_history` コマンドを実装
  - `request: AddSqlEditorHistoryRequest` を受け取り
  - `SqlEditorHistoryService::add_history()` を呼び出し
  - `Result<SqlEditorHistoryEntry, String>` を返す
- [ ] `get_sql_editor_histories` コマンドを実装
  - `request: SearchSqlEditorHistoryRequest` を受け取り
  - `SqlEditorHistoryService::get_histories()` を呼び出し
  - `Result<Vec<SqlEditorHistoryEntry>, String>` を返す
- [ ] `delete_sql_editor_history` コマンドを実装
  - `connection_id: String, id: String` を受け取り
  - `SqlEditorHistoryService::delete_history()` を呼び出し
  - `Result<(), String>` を返す
- [ ] `src-tauri/src/lib.rs` にコマンドを登録
- [ ] `src-tauri/src/storage/path_manager.rs` に `sql_editor_histories_dir()` メソッドを追加

**完了条件**:
- Tauriコマンドがフロントエンドから呼び出し可能
- エラーハンドリングが適切に実装されている

**依存関係**:
- P5-1（モデル定義）完了
- P5-2（サービス実装）完了

---

### P5-4: フロントエンドAPI追加

**見積**: 1h

**対象ファイル**: `app/api/sql-editor.ts`

- [ ] `addSqlEditorHistory(request: AddSqlEditorHistoryRequest)` 関数を実装
  - Tauriの `invoke('add_sql_editor_history', { request })` を呼び出し
  - `Promise<SqlEditorHistoryEntry>` を返す
- [ ] `getSqlEditorHistories(request: SearchSqlEditorHistoryRequest)` 関数を実装
  - Tauriの `invoke('get_sql_editor_histories', { request })` を呼び出し
  - `Promise<SqlEditorHistoryEntry[]>` を返す
- [ ] `deleteSqlEditorHistory(connectionId: string, id: string)` 関数を実装
  - Tauriの `invoke('delete_sql_editor_history', { connectionId, id })` を呼び出し
  - `Promise<void>` を返す
- [ ] エラーハンドリングを追加（try-catch、エラーメッセージの変換）

**完了条件**:
- APIがストアから呼び出し可能
- TypeScript型安全性が保たれている
- エラーハンドリングが適切に実装されている

**依存関係**:
- P5-3（Tauriコマンド）完了
- P5-5（型定義）完了

---

### P5-5: 型定義追加

**見積**: 0.5h

**対象ファイル**: `app/types/sql-editor.ts`

- [ ] `SqlEditorHistoryEntry` インターフェースを定義
  - `id`, `connectionId`, `sql`, `executedAt`, `executionTimeMs`, `status`, `rowCount`, `errorMessage`
- [ ] `AddSqlEditorHistoryRequest` インターフェースを定義
- [ ] `SearchSqlEditorHistoryRequest` インターフェースを定義
- [ ] ドキュメントコメントを追加
  - 「Query Builder用の QueryHistory とは別の型です」と明記

**完了条件**:
- 型定義がRust側と一致している
- TypeScriptコンパイルエラーがない
- JSDocコメントが適切に記載されている

**依存関係**:
- P5-1（Rustモデル定義）完了

---

### P5-6: 履歴パネルコンポーネント

**見積**: 2.5h

**対象ファイル**: `app/components/sql-editor/SqlEditorHistoryPanel.vue` (新規作成)

- [ ] コンポーネントの基本構造を作成
  - 検索ボックス（`UInput`）
  - 成功のみフィルタチェックボックス（`UCheckbox`）
  - 履歴一覧（`UCard` × N）
- [ ] ストアからのデータ取得
  - `onMounted` で `store.fetchHistories()` を呼び出し
  - `store.filteredHistories` を表示
- [ ] 各履歴カードのUI実装
  - ステータスバッジ（`UBadge`、成功: 緑、失敗: 赤）
  - 実行日時（相対時間表示: 「5分前」「今日 14:32」）
  - SQL文（先頭1-2行を省略表示、最大80文字、`line-clamp-2`）
  - 実行時間（「0.123秒」）
  - 結果行数（成功時のみ、「100行」）
  - エラーメッセージ（失敗時のみ）
- [ ] インタラクション実装
  - カードクリックで `handleLoad(history)` を呼び出し
  - ホバー時に再実行・削除ボタンを表示
  - 再実行ボタンで `handleReExecute(history)` を呼び出し
  - 削除ボタンで確認ダイアログ表示後、`handleDelete(history)` を呼び出し
- [ ] ローディング状態の表示（`store.isLoadingHistories`）
- [ ] 空状態の表示（「履歴がありません」）
- [ ] トースト通知（成功・失敗）
- [ ] スタイリング（Tailwind CSS）

**完了条件**:
- 履歴が時系列で一覧表示される
- 検索・フィルタリングが動作する
- クリックでエディタに読み込まれる
- 再実行・削除が動作する
- ローディング・空状態が適切に表示される

**参考**:
- `app/components/query-builder/QueryHistorySlideover.vue` - UIデザインの参考

**依存関係**:
- P5-7（ストア実装）完了

---

### P5-7: 自動保存ロジック

**見積**: 1h

**対象ファイル**: `app/stores/sql-editor.ts`

- [ ] ストアにstate追加
  - `histories: SqlEditorHistoryEntry[]`
  - `isLoadingHistories: boolean`
  - `historySearchKeyword: string`
  - `historySuccessOnly: boolean`
- [ ] `filteredHistories` getterを実装
  - `historySearchKeyword` でフィルタ（SQL文の部分一致）
  - `historySuccessOnly` でフィルタ（成功のみ）
- [ ] `executeQuery()` アクション更新
  - クエリ実行の前に開始時刻を記録
  - 実行成功時に `addHistory()` を呼び出し（非同期、エラー無視）
  - 実行失敗時に `addHistory()` を呼び出し（非同期、エラー無視）
- [ ] `addHistory(request: AddSqlEditorHistoryRequest)` アクションを実装
  - `addSqlEditorHistory(request)` APIを呼び出し
  - 履歴を `histories` の先頭に追加
  - エラーは無視（コンソールログのみ）
- [ ] `fetchHistories()` アクションを実装
  - `getSqlEditorHistories({ connectionId })` APIを呼び出し
  - `histories` を更新
- [ ] `loadHistory(id: string)` アクションを実装
  - 履歴を `histories` から検索
  - 未保存の変更がある場合は警告（実装は簡易版）
  - `sql` を更新、`isDirty` を false に設定
- [ ] `deleteHistory(id: string)` アクションを実装
  - `deleteSqlEditorHistory(connectionId, id)` APIを呼び出し
  - `histories` から削除
- [ ] `setHistorySearchKeyword(keyword: string)` アクションを実装
- [ ] `setHistorySuccessOnly(value: boolean)` アクションを実装
- [ ] ユニットテストを作成
  - `test_add_history_after_successful_query`
  - `test_filter_histories_by_keyword`
  - `test_filter_histories_by_success_status`

**完了条件**:
- クエリ実行時に履歴が自動保存される
- 履歴保存失敗時もクエリ実行は成功する
- 検索・フィルタリングが動作する
- ユニットテストがすべてパスする

**依存関係**:
- P5-4（フロントエンドAPI）完了
- P5-5（型定義）完了

---

### P5-8: 履歴からの再実行・コピー

**見積**: 1h

**対象ファイル**:
- `app/components/sql-editor/SqlEditorHistoryPanel.vue`
- `app/stores/sql-editor.ts`

- [ ] `handleReExecute(history)` メソッドを実装
  - 現在のSQLを一時保存
  - `store.sql` を履歴のSQLに変更
  - `store.executeQuery()` を呼び出し
  - 実行後、元のSQLに戻す
- [ ] 再実行時のローディング状態表示
- [ ] 再実行時のエラーハンドリング
- [ ] トースト通知（再実行開始・成功・失敗）

**完了条件**:
- 履歴から直接再実行できる
- エディタの内容が変更されない
- 再実行結果が結果パネルに表示される
- 再実行自体も新しい履歴として記録される

**依存関係**:
- P5-6（履歴パネルコンポーネント）完了
- P5-7（自動保存ロジック）完了

---

### P5-9: 動作確認・テスト

**見積**: 1.5h

**対象**:
- 全機能の統合テスト
- エッジケースの確認
- パフォーマンステスト

**チェック項目**:
- [ ] クエリ実行時に履歴が自動保存される
  - SELECT成功時
  - SELECT失敗時
  - INSERT/UPDATE/DELETE成功時
  - INSERT/UPDATE/DELETE失敗時
- [ ] 履歴パネルに実行履歴が時系列で表示される
  - 新しい順に表示される
  - 日時・SQL・ステータス・実行時間・結果行数が正しく表示される
- [ ] 履歴をクリックするとエディタに読み込まれる
  - 未保存の変更がある場合は警告が出る（簡易実装確認）
  - 読み込み後、`isDirty` がfalseになる
- [ ] 履歴から直接再実行できる
  - エディタの内容が変更されない
  - 再実行結果が結果パネルに表示される
  - 再実行自体も履歴として記録される
- [ ] 履歴を検索できる
  - SQL文の部分一致検索が動作する
  - 大文字・小文字を区別しない
- [ ] 履歴を削除できる
  - 削除確認ダイアログが表示される
  - 削除後、一覧から消える
  - ファイルからも削除される
- [ ] 1000件を超える履歴の自動削除
  - 1001件目を追加すると最古の履歴が削除される
  - 1000件が維持される
- [ ] アプリ再起動後も履歴が維持される
  - アプリを再起動
  - 履歴パネルを開く
  - 以前の履歴が表示される
- [ ] Query Builder用履歴機能に影響を与えない
  - Query Builderでクエリを実行
  - Query Builder用履歴が正しく保存される
  - SQLエディタ用履歴と混在しない
- [ ] パフォーマンステスト
  - 1000件の履歴表示が1秒以内
  - 検索レスポンスが200ms以内
  - 履歴保存がクエリ実行を遅延させない

**完了条件**:
- すべてのチェック項目がパスする
- エッジケースでもエラーが発生しない
- パフォーマンス要件を満たす

**依存関係**:
- P5-1 ~ P5-8 すべて完了

---

## レイアウト統合タスク（任意）

### P5-10: レイアウトに履歴パネルを統合

**見積**: 0.5h

**対象ファイル**: `app/components/sql-editor/SqlEditorLayout.vue`

- [ ] 履歴パネルを右側に配置
- [ ] リサイズ可能にする（既存のResizablePanelを使用）
- [ ] 履歴パネルの開閉状態を管理
- [ ] ツールバーに履歴パネル開閉ボタンを追加（任意）

**完了条件**:
- 履歴パネルが右側に表示される
- パネル幅をリサイズできる
- レイアウトが崩れない

**依存関係**:
- P5-6（履歴パネルコンポーネント）完了

---

## 完了条件（Phase 5全体）

- [ ] すべてのタスク（P5-1 ~ P5-9）が完了
- [ ] WBSの完了条件をすべて満たす
  - [x] クエリ実行時に履歴が自動保存される
  - [x] 履歴パネルに実行履歴が時系列で表示される
  - [x] 履歴をクリックするとエディタに読み込まれる
  - [x] 履歴から直接再実行できる
  - [x] 履歴を検索できる
  - [x] 古い履歴を削除できる
- [ ] ユニットテストがすべてパスする
- [ ] パフォーマンス要件を満たす
- [ ] Query Builder用履歴機能に影響を与えない（リグレッションテスト）
- [ ] ドキュメントが最新の状態に更新されている

## 推奨実装順序

1. **バックエンド基盤**: P5-1 → P5-2 → P5-3
2. **フロントエンド基盤**: P5-5 → P5-4
3. **ストア実装**: P5-7
4. **UI実装**: P5-6
5. **機能追加**: P5-8
6. **統合テスト**: P5-9
7. **レイアウト統合**: P5-10（任意）

この順序により、依存関係を満たしながら段階的に実装を進められます。
