# タスクリスト: クエリ履歴機能

**作成日**: 2025年12月30日
**WBS参照**: Phase 4.3 履歴機能

---

## タスク概要

| カテゴリ | タスク数 | 状態 |
|---------|---------|------|
| バックエンド | 5 | 📝 未着手 |
| フロントエンド | 6 | 📝 未着手 |
| テスト | 3 | 📝 未着手 |
| **合計** | **14** | **📝 未着手** |

---

## バックエンド実装

### タスク4.3.1: QueryHistory型定義（Rust）

**優先度**: 高
**依存**: なし
**完了条件**: QueryHistory型が定義され、コンパイルが通る

- [ ] `src-tauri/src/models/query_history.rs` 作成
  - [ ] QueryHistory構造体定義
  - [ ] QueryHistoryMetadata構造体定義
  - [ ] AddHistoryRequest構造体定義
  - [ ] SearchHistoryRequest構造体定義
  - [ ] QueryHistoryCollection構造体定義
  - [ ] From<&QueryHistory> for QueryHistoryMetadata実装
- [ ] `src-tauri/src/models/mod.rs` にquery_historyモジュール追加
- [ ] `Cargo.toml` に必要な依存関係追加（uuid, chrono）
- [ ] コンパイル確認

**成果物**: `src-tauri/src/models/query_history.rs`

---

### タスク4.3.2: PathManager拡張

**優先度**: 高
**依存**: なし
**完了条件**: history_dir()メソッドが動作する

- [ ] `src-tauri/src/storage/path_manager.rs` を編集
  - [ ] history_dir()メソッド追加
  - [ ] ドキュメントコメント追加
- [ ] コンパイル確認

**成果物**: `src-tauri/src/storage/path_manager.rs` (変更)

---

### タスク4.3.3: QueryHistoryService実装

**優先度**: 高
**依存**: 4.3.1, 4.3.2
**完了条件**: QueryHistoryServiceが動作し、単体テストがパスする

- [ ] `src-tauri/src/services/query_history.rs` 作成
  - [ ] QueryHistoryService構造体定義
  - [ ] new()メソッド実装
  - [ ] load_collection()メソッド実装
  - [ ] save_collection()メソッド実装
  - [ ] add_history()メソッド実装（最大1000件管理）
  - [ ] load_history()メソッド実装
  - [ ] delete_history()メソッド実装
  - [ ] list_histories()メソッド実装
  - [ ] search_histories()メソッド実装
  - [ ] clear_old_histories()メソッド実装
  - [ ] clear_all_histories()メソッド実装
- [ ] `src-tauri/src/services/mod.rs` にquery_historyモジュール追加
- [ ] 単体テスト作成（最低8テストケース）
  - [ ] test_add_history
  - [ ] test_list_histories
  - [ ] test_max_history_limit
  - [ ] test_delete_history
  - [ ] test_search_by_keyword
  - [ ] test_search_by_connection_id
  - [ ] test_search_by_date_range
  - [ ] test_clear_old_histories
- [ ] `cargo test` 実行確認

**成果物**: `src-tauri/src/services/query_history.rs`

---

### タスク4.3.4: Tauriコマンド実装

**優先度**: 高
**依存**: 4.3.3
**完了条件**: Tauriコマンドが登録され、フロントエンドから呼び出せる

- [ ] `src-tauri/src/commands/query_history_commands.rs` 作成
  - [ ] QueryHistoryState定義
  - [ ] get_service()ヘルパー関数実装
  - [ ] add_query_history コマンド実装
  - [ ] load_query_history コマンド実装
  - [ ] delete_query_history コマンド実装
  - [ ] list_query_histories コマンド実装
  - [ ] search_query_histories コマンド実装
  - [ ] clear_old_query_histories コマンド実装
  - [ ] clear_all_query_histories コマンド実装
- [ ] `src-tauri/src/commands/mod.rs` にquery_history_commandsモジュール追加
- [ ] `src-tauri/src/lib.rs` を編集
  - [ ] QueryHistoryStateをmanage()に追加
  - [ ] 全コマンドをinvoke_handler()に追加
- [ ] `cargo build` 実行確認

**成果物**: `src-tauri/src/commands/query_history_commands.rs`, `src-tauri/src/lib.rs` (変更)

---

### タスク4.3.5: バックエンド統合テスト

**優先度**: 中
**依存**: 4.3.4
**完了条件**: 全てのコマンドが正しく動作する

- [ ] アプリを起動
- [ ] Tauri DevToolsで各コマンドを手動テスト
  - [ ] add_query_history
  - [ ] list_query_histories
  - [ ] load_query_history
  - [ ] delete_query_history
  - [ ] search_query_histories
- [ ] エラーハンドリングの確認

**成果物**: なし（確認のみ）

---

## フロントエンド実装

### タスク4.3.6: TypeScript型定義

**優先度**: 高
**依存**: 4.3.1
**完了条件**: TypeScript型が定義され、型チェックがパスする

- [ ] `app/types/query-history.ts` 作成
  - [ ] QueryHistory型定義
  - [ ] QueryHistoryMetadata型定義
  - [ ] AddHistoryRequest型定義
  - [ ] SearchHistoryRequest型定義
- [ ] `npm run typecheck` 実行確認

**成果物**: `app/types/query-history.ts`

---

### タスク4.3.7: API実装

**優先度**: 高
**依存**: 4.3.4, 4.3.6
**完了条件**: APIラッパーが実装され、型チェックがパスする

- [ ] `app/api/query-history.ts` 作成
  - [ ] addHistory()関数実装
  - [ ] loadHistory()関数実装
  - [ ] deleteHistory()関数実装
  - [ ] listHistories()関数実装
  - [ ] searchHistories()関数実装
  - [ ] clearOldHistories()関数実装
  - [ ] clearAllHistories()関数実装
- [ ] `npm run typecheck` 実行確認

**成果物**: `app/api/query-history.ts`

---

### タスク4.3.8: Piniaストア実装

**優先度**: 高
**依存**: 4.3.7
**完了条件**: ストアが実装され、基本動作が確認できる

- [ ] `app/stores/query-history.ts` 作成
  - [ ] State定義（histories, isLoading, error, filters）
  - [ ] Getters定義（filteredHistories）
  - [ ] fetchHistories()アクション実装
  - [ ] addHistory()アクション実装
  - [ ] loadHistory()アクション実装
  - [ ] deleteHistory()アクション実装
  - [ ] loadToBuilder()アクション実装
  - [ ] setSearchKeyword()アクション実装
  - [ ] setSelectedConnectionId()アクション実装
  - [ ] setSuccessOnly()アクション実装
- [ ] `npm run typecheck` 実行確認

**成果物**: `app/stores/query-history.ts`

---

### タスク4.3.9: QueryHistorySlideover.vue実装

**優先度**: 高
**依存**: 4.3.8
**完了条件**: 履歴一覧UIが表示され、基本操作ができる

- [ ] `app/components/query-builder/QueryHistorySlideover.vue` 作成
  - [ ] Slideover基本構造
  - [ ] 検索入力フィールド
  - [ ] 成功のみフィルタチェックボックス
  - [ ] 履歴一覧表示（v-for）
  - [ ] 履歴項目のクリックで復元
  - [ ] SQLプレビュー表示（3行まで）
  - [ ] 実行結果サマリー表示（件数、時間）
  - [ ] 削除ボタン（ホバー時表示）
  - [ ] 保存ボタン（ホバー時表示）
  - [ ] 削除確認ダイアログ
  - [ ] ローディング表示
  - [ ] 空状態表示
- [ ] Nuxt UIコンポーネント使用確認
  - [ ] USlideover
  - [ ] UInput
  - [ ] UCheckbox
  - [ ] UButton
  - [ ] UIcon
- [ ] `npm run dev` で表示確認

**成果物**: `app/components/query-builder/QueryHistorySlideover.vue`

---

### タスク4.3.10: クエリビルダーストアに履歴記録追加

**優先度**: 高
**依存**: 4.3.8
**完了条件**: クエリ実行時に自動的に履歴が記録される

- [ ] `app/stores/query-builder.ts` を編集
  - [ ] executeQuery()メソッドに履歴記録処理追加
    - [ ] 実行開始時刻記録
    - [ ] 成功時: 履歴記録（resultCount, executionTimeMs）
    - [ ] 失敗時: 履歴記録（errorMessage, executionTimeMs）
  - [ ] 非同期エラー処理確認
- [ ] `npm run typecheck` 実行確認
- [ ] 動作確認
  - [ ] クエリ実行成功時に履歴が記録される
  - [ ] クエリ実行失敗時にも履歴が記録される

**成果物**: `app/stores/query-builder.ts` (変更)

---

### タスク4.3.11: QueryBuilderToolbarに履歴ボタン追加

**優先度**: 高
**依存**: 4.3.9
**完了条件**: 履歴ボタンをクリックするとSlideoverが開く

- [ ] `app/components/query-builder/QueryBuilderToolbar.vue` を編集
  - [ ] QueryHistorySlideover.vueをimport
  - [ ] showHistorySlideoverの状態追加
  - [ ] 履歴ボタン追加
  - [ ] QueryHistorySlideoverコンポーネント配置
  - [ ] 読み込み完了ハンドラ実装
- [ ] `npm run dev` で動作確認
  - [ ] 履歴ボタンをクリックするとSlideoverが開く
  - [ ] 履歴一覧が表示される
  - [ ] 履歴項目をクリックするとクエリビルダーに復元される

**成果物**: `app/components/query-builder/QueryBuilderToolbar.vue` (変更)

---

## テスト

### タスク4.3.12: ストアのユニットテスト

**優先度**: 中
**依存**: 4.3.8
**完了条件**: ストアのテストが全てパスする

- [ ] `app/stores/__tests__/query-history.spec.ts` 作成
  - [ ] fetchHistories()テスト
  - [ ] addHistory()テスト
  - [ ] deleteHistory()テスト
  - [ ] filteredHistories getterテスト（キーワード検索）
  - [ ] filteredHistories getterテスト（成功のみフィルタ）
- [ ] `npm run test:run` 実行確認

**成果物**: `app/stores/__tests__/query-history.spec.ts`

---

### タスク4.3.13: 結合テスト

**優先度**: 中
**依存**: 4.3.11
**完了条件**: 全機能が統合されて正常に動作する

- [ ] `npm run tauri:dev` でアプリ起動
- [ ] 手動テスト実行
  - [ ] クエリを実行して履歴が記録されることを確認
  - [ ] 履歴ボタンをクリックして一覧が表示されることを確認
  - [ ] 履歴項目をクリックしてクエリビルダーに復元されることを確認
  - [ ] 検索機能が動作することを確認
  - [ ] 成功のみフィルタが動作することを確認
  - [ ] 削除機能が動作することを確認
  - [ ] 1000件を超える履歴が自動削除されることを確認

**成果物**: なし（確認のみ）

---

### タスク4.3.14: testing.md作成

**優先度**: 低
**依存**: 4.3.13
**完了条件**: テスト手順書が完成している

- [ ] `docs/working/20251230_query-history/testing.md` 作成
  - [ ] 手動テスト手順記載
  - [ ] 期待される動作記載
  - [ ] 既知の問題記載（あれば）
- [ ] レビュー

**成果物**: `docs/working/20251230_query-history/testing.md`

---

## マイルストーン

| マイルストーン | 完了条件 | 期日 |
|--------------|---------|------|
| M1: バックエンド完成 | タスク4.3.1〜4.3.5完了 | - |
| M2: フロントエンド完成 | タスク4.3.6〜4.3.11完了 | - |
| M3: テスト完了 | タスク4.3.12〜4.3.14完了 | - |
| M4: Phase 4.3完了 | 全タスク完了、WBS更新 | - |

---

## 進捗管理

### 完了タスク: 0/14 (0%)

- バックエンド: 0/5
- フロントエンド: 0/6
- テスト: 0/3

---

## 備考

### 依存関係の注意点
- フロントエンドの実装はバックエンドのコマンド登録後に開始できる
- UI実装は並行して進められるが、統合テストは全タスク完了後

### リスク
- 履歴ファイルの肥大化: 1000件制限で対応
- パフォーマンス: 単一ファイル読み込みで最適化済み
- 型の不整合: Rust/TypeScript両方で型定義を慎重に

---

**最終更新**: 2025年12月30日
