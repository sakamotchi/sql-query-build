# タスクリスト - SQLエディタ Phase 4: クエリ保存機能

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 10 |

**総見積**: 19時間（2ファイル管理対応のため +0.5h）

## タスク一覧

### T-1: バックエンド - SQLエディタ専用モデル作成

**見積**: 1.5h

- [ ] `src-tauri/src/models/sql_editor_query.rs` を新規作成
  - [ ] `SqlEditorQuery` 構造体を定義（`sql: String` フィールドを持つ）
  - [ ] `SqlEditorQueryMetadata` 構造体を定義
  - [ ] `SaveSqlEditorQueryRequest` 構造体を定義
  - [ ] `SearchSqlEditorQueryRequest` 構造体を定義
- [ ] `src-tauri/src/models/mod.rs` にモジュール追加
- [ ] 既存の `SavedQuery`（クエリビルダー用）は変更しない
- [ ] `src-tauri/src/storage/path_manager.rs` に `saved_editor_dir()` メソッドを追加
  - [ ] `{data_dir}/queries/saved_editor/` を返す
  - [ ] `initialize_directories()` で `saved_editor_dir()` も作成
- [ ] Rustコンパイルエラーがないか確認

**成果物**:
- `src-tauri/src/models/sql_editor_query.rs` (新規)
- `src-tauri/src/storage/path_manager.rs` (更新)

**依存**:
- なし（独立して開始可能）

---

### T-2: バックエンド - SQLエディタ専用ストレージサービス作成

**見積**: 3h（2ファイル管理のため +0.5h）

- [ ] `src-tauri/src/services/sql_editor_query_storage.rs` を新規作成
  - [ ] `SqlEditorQueryStorage` 構造体を定義
  - [ ] `saved_editor/` ディレクトリのパス管理
  - [ ] `save_query()` メソッド実装:
    - [ ] UUID生成、日時設定
    - [ ] メタデータを `{id}.json` に保存（pretty-print）
    - [ ] SQL本文を `{id}.sql` に保存（UTF-8プレーンテキスト）
  - [ ] `load_query()` メソッド実装:
    - [ ] `{id}.json` からメタデータ読み込み
    - [ ] `{id}.sql` からSQL本文読み込み
    - [ ] `SqlEditorQuery` に結合して返す
  - [ ] `delete_query()` メソッド実装:
    - [ ] `{id}.json` と `{id}.sql` の両方を削除
  - [ ] `list_queries()` メソッド実装:
    - [ ] `.json` ファイルのみ列挙・読み込み（SQL本文は読まない）
    - [ ] 更新日時順（降順）にソート
  - [ ] `search_queries()` メソッド実装:
    - [ ] メタデータで検索（名前、説明、タグ）
    - [ ] SQL本文も検索する場合は `.sql` ファイルを読み込み
- [ ] `src-tauri/src/services/mod.rs` にモジュール追加
- [ ] Rustのユニットテストを追加
  - [ ] `test_save_and_load_query` - 2ファイル保存・読み込み
  - [ ] `test_list_queries` - JSON一覧取得
  - [ ] `test_search_queries` - SQL本文検索含む
  - [ ] `test_delete_query` - 2ファイル削除確認
- [ ] `cargo test` でテストが通ることを確認

**成果物**:
- `src-tauri/src/services/sql_editor_query_storage.rs` (新規)

**依存**:
- T-1（モデル作成完了後）

---

### T-3: バックエンド - Tauriコマンド実装

**見積**: 1.5h

- [ ] `src-tauri/src/commands/sql_editor.rs` を新規作成
- [ ] 以下のコマンドを実装:
  - [ ] `save_sql_query(request: SaveSqlEditorQueryRequest) -> Result<SqlEditorQuery, String>`
    - SqlEditorQueryStorage.save_query() を呼び出し
  - [ ] `load_sql_query(id: String) -> Result<SqlEditorQuery, String>`
    - SqlEditorQueryStorage.load_query() を呼び出し
  - [ ] `list_sql_queries(connection_id: Option<String>) -> Result<Vec<SqlEditorQueryMetadata>, String>`
    - SqlEditorQueryStorage.list_queries() を呼び出し
    - connection_idが指定されていればフィルタリング
  - [ ] `search_sql_queries(request: SearchSqlEditorQueryRequest) -> Result<Vec<SqlEditorQueryMetadata>, String>`
    - SqlEditorQueryStorage.search_queries() を呼び出し
  - [ ] `delete_sql_query(id: String) -> Result<(), String>`
    - SqlEditorQueryStorage.delete_query() を呼び出し
- [ ] `src-tauri/src/lib.rs` にコマンドを登録
- [ ] ビルドエラーがないか確認

**成果物**:
- `src-tauri/src/commands/sql_editor.rs` (新規)
- `src-tauri/src/lib.rs` (更新)

**依存**:
- T-2（ストレージサービス作成完了後）

---

### T-4: フロントエンド - 型定義追加

**見積**: 0.5h

- [ ] `app/types/sql-editor.ts` に以下の型を追加:
  - [ ] `SavedQuery` インターフェース
  - [ ] `SavedQueryMetadata` インターフェース
  - [ ] `SaveQueryRequest` インターフェース
  - [ ] `SearchQueryRequest` インターフェース
- [ ] TypeScriptコンパイルエラーがないか確認

**成果物**:
- `app/types/sql-editor.ts` (更新)

**依存**:
- なし（T-1と並行可能）

---

### T-5: フロントエンド - API作成

**見積**: 1.5h

- [ ] `app/api/sql-editor.ts` を新規作成
- [ ] 以下のAPI関数を実装:
  - [ ] `saveQuery(request: SaveQueryRequest): Promise<SavedQuery>`
  - [ ] `loadQuery(id: string): Promise<SavedQuery>`
  - [ ] `listQueries(connectionId?: string): Promise<SavedQueryMetadata[]>`
  - [ ] `searchQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]>`
  - [ ] `deleteQuery(id: string): Promise<void>`
- [ ] Tauriコマンドとの型整合性を確認
- [ ] エラーハンドリングを実装（try-catchでラップ）

**成果物**:
- `app/api/sql-editor.ts` (新規)

**依存**:
- T-3（Tauriコマンド実装完了後）
- T-4（型定義追加完了後）

---

### T-6: フロントエンド - Piniaストア拡張

**見積**: 1.5h

- [ ] `app/stores/sql-editor.ts` に保存クエリ管理ロジックを追加
- [ ] 以下のstateを追加:
  - [ ] `savedQueries: SavedQueryMetadata[]`
  - [ ] `currentQuery: SavedQuery | null`
- [ ] 以下のactionsを追加:
  - [ ] `loadSavedQueries()` - 保存クエリ一覧を読み込み
  - [ ] `saveCurrentQuery(request: SaveQueryRequest)` - クエリを保存
  - [ ] `loadSavedQuery(id: string)` - 保存クエリをエディタに読み込み
  - [ ] `updateSavedQuery(id: string, request: SaveQueryRequest)` - クエリを更新
  - [ ] `deleteSavedQuery(id: string)` - クエリを削除
- [ ] 各actionでトースト通知を表示（成功/失敗）
- [ ] ユニットテストを作成（`app/tests/stores/sql-editor.test.ts`）

**成果物**:
- `app/stores/sql-editor.ts` (更新)
- `app/tests/stores/sql-editor.test.ts` (新規または更新)

**依存**:
- T-5（API作成完了後）

---

### T-7: フロントエンド - 保存ダイアログコンポーネント

**見積**: 2h

- [ ] `app/components/sql-editor/SaveQueryDialog.vue` を新規作成
- [ ] 以下のフォームフィールドを実装:
  - [ ] クエリ名（UFormField + UInput、必須、最大100文字）
  - [ ] 説明（UFormField + UTextarea、任意、最大500文字）
  - [ ] タグ（UFormField + UInput、カンマ区切り入力）
- [ ] バリデーションを実装:
  - [ ] クエリ名が空でないか
  - [ ] 文字数制限チェック
- [ ] 保存ボタン/キャンセルボタンを実装
- [ ] ダイアログの開閉状態管理（v-model:open）
- [ ] 保存成功時にダイアログを閉じる
- [ ] Nuxt UI v4 の記法を使用（UFormField、items属性等）

**成果物**:
- `app/components/sql-editor/SaveQueryDialog.vue` (新規)

**依存**:
- T-6（ストア拡張完了後）

---

### T-8: フロントエンド - 保存クエリパネルコンポーネント

**見積**: 3h

- [ ] `app/components/sql-editor/SavedQueryPanel.vue` を新規作成
- [ ] 検索ボックスを実装（UFormField + UInput）
- [ ] クエリ一覧を実装:
  - [ ] クエリ名、タグ、更新日時を表示
  - [ ] クエリ名が長い場合は省略表示（CSSでtext-overflow: ellipsis）
  - [ ] 更新日時を相対表示（例: 2時間前、昨日）
- [ ] クライアントサイド検索機能を実装:
  - [ ] 検索ワードで名前、説明、タグ、SQL本文を絞り込み（computed）
  - [ ] タグクリックでフィルタリング
- [ ] クエリアイテムのホバーアクション:
  - [ ] 実行ボタン（i-heroicons-play）- 直接実行
  - [ ] 編集ボタン（i-heroicons-pencil）- 編集ダイアログ表示
  - [ ] 削除ボタン（i-heroicons-trash）- 確認後削除
- [ ] クエリクリックでエディタに読み込み
  - [ ] 未保存変更がある場合は警告ダイアログ表示
- [ ] 空状態の表示（クエリがない場合）
- [ ] Nuxt UI v4 の記法を使用

**成果物**:
- `app/components/sql-editor/SavedQueryPanel.vue` (新規)

**依存**:
- T-6（ストア拡張完了後）
- T-7と並行可能

---

### T-9: フロントエンド - レイアウト・ツールバー統合

**見積**: 1h

- [ ] `app/components/sql-editor/SqlEditorToolbar.vue` を更新
  - [ ] 保存ボタンを追加（アイコン: i-heroicons-bookmark）
  - [ ] Ctrl/Cmd+S キーボードショートカットを実装
  - [ ] ボタンクリックで SaveQueryDialog を表示
- [ ] `app/components/sql-editor/SqlEditorLayout.vue` を更新
  - [ ] SavedQueryPanel をサイドパネルとして配置
  - [ ] パネルのリサイズ対応（ResizablePanelがあれば適用）
  - [ ] サイドパネルの表示/非表示トグル（将来対応でもOK）
- [ ] レイアウトの動作確認（レスポンシブ含む）

**成果物**:
- `app/components/sql-editor/SqlEditorToolbar.vue` (更新)
- `app/components/sql-editor/SqlEditorLayout.vue` (更新)

**依存**:
- T-7（保存ダイアログ完了後）
- T-8（保存クエリパネル完了後）

---

### T-10: 動作確認・テスト

**見積**: 2h

- [ ] エンドツーエンド動作確認:
  - [ ] クエリを保存できるか
  - [ ] 保存したクエリが一覧に表示されるか
  - [ ] クエリをクリックしてエディタに読み込めるか
  - [ ] 検索で絞り込めるか
  - [ ] タグでフィルタできるか
  - [ ] クエリを編集できるか
  - [ ] クエリを削除できるか
  - [ ] アプリ再起動後も保存クエリが残るか
- [ ] エラーケースの確認:
  - [ ] クエリ名が空の場合のバリデーション
  - [ ] 保存失敗時のエラー表示
  - [ ] 削除確認ダイアログの動作
- [ ] Rustのユニットテストを実行（`cargo test`）
- [ ] フロントエンドのユニットテストを実行（`npm run test:run`）
- [ ] バグ修正

**成果物**:
- 動作確認済みの機能
- バグ修正コミット

**依存**:
- T-1 〜 T-9 すべて完了後

---

## 完了条件

- [ ] 全タスク（T-1 〜 T-10）が完了
- [ ] 要件定義書の受け入れ条件がすべて満たされている
  - [ ] F-1: クエリの保存
  - [ ] F-2: 保存クエリの一覧表示
  - [ ] F-3: 保存クエリの検索・フィルタリング
  - [ ] F-4: 保存クエリの読み込み
  - [ ] F-5: 保存クエリの編集
  - [ ] F-6: 保存クエリの削除
  - [ ] F-7: 保存クエリの直接実行（推奨機能）
- [ ] ユニットテストがすべてパス
- [ ] 永続化ドキュメント（`docs/steering/features/sql-editor.md`）を更新（必要に応じて）
- [ ] コードレビュー完了

## タスク依存関係図

```
T-1 (モデル作成 + PathManager)
  ↓
T-2 (ストレージサービス)
  ↓
T-3 (Tauriコマンド)
  ↓
T-5 (API作成) ← T-4 (型定義、並行可能)
  ↓
T-6 (ストア拡張)
  ↓
┌─────┴─────┐
T-7 (保存ダイアログ)  T-8 (保存クエリパネル)
└─────┬─────┘
  ↓
T-9 (レイアウト統合)
  ↓
T-10 (動作確認・テスト)
```

## 備考

### ストレージ分離戦略

- **SQLエディタ用**: `{data_dir}/queries/saved_editor/` - 新規作成
- **クエリビルダー用**: `{data_dir}/queries/saved_builder/` - 既存のまま
- データ構造の混在を防ぎ、それぞれ独立して機能拡張可能にする

### 既存資産の活用

- `src-tauri/src/services/query_storage.rs` のパターンを参考に、SQLエディタ専用の `sql_editor_query_storage.rs` を作成
- `src-tauri/src/storage/file_storage.rs` は既存のまま利用
- クエリビルダー用の `SavedQuery` モデルは変更せず、SQLエディタ用に `SqlEditorQuery` を新規作成

### 推奨実装順序

1. **バックエンド先行**: T-1 → T-2 → T-3（モデル → ストレージ → Tauriコマンド）
2. **フロントエンド基盤**: T-4、T-5 → T-6（型定義、API → ストア）
3. **UI構築**: T-7、T-8を並行実装可能
4. **統合**: T-9でレイアウトに組み込み
5. **テスト**: T-10で全体確認

### 注意事項

- Nuxt UI v4 の記法を厳守（UFormField、items属性）
- エラーハンドリングを丁寧に実装（ユーザーに分かりやすいメッセージ）
- トースト通知で操作フィードバックを提供
- 検索はクライアントサイドで実装（パフォーマンス要件を満たすため）
