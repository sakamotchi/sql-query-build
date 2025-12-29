# タスクリスト: クエリ保存機能

**作成日**: 2025年12月29日
**WBS参照**: Phase 4.1 クエリ保存機能

---

## タスク一覧

| タスクID | タスク名 | 状態 | 依存 | 完了条件 |
|---------|---------|------|------|---------|
| 4.1.1 | SavedQuery型定義（Rust） | 📝 未着手 | - | JSON構造確定、Rust型定義完了 |
| 4.1.2 | QueryStorage実装 | 📝 未着手 | 4.1.1 | ファイルへの保存/読み込み動作 |
| 4.1.3 | save_query/load_queryコマンド | 📝 未着手 | 4.1.2 | Tauriコマンドとして呼び出し可能 |
| 4.1.4 | フロントエンド型定義・API | 📝 未着手 | 4.1.3 | TypeScript型、API実装完了 |
| 4.1.5 | saved-queryストア実装 | 📝 未着手 | 4.1.4 | Piniaストア動作確認 |
| 4.1.6 | SaveQueryDialog.vue作成 | 📝 未着手 | 4.1.5 | 保存ダイアログUI完成 |
| 4.1.7 | SavedQuerySlideover.vue作成 | 📝 未着手 | 4.1.5 | 一覧表示/検索/削除動作 |
| 4.1.8 | QueryBuilderToolbar統合 | 📝 未着手 | 4.1.6, 4.1.7 | ツールバーから保存/読み込み可能 |
| 4.1.9 | テストコード作成 | 📝 未着手 | 4.1.8 | Rust/フロントエンドテストパス |
| 4.1.10 | 手動テスト・動作確認 | 📝 未着手 | 4.1.9 | 全機能の動作確認完了 |

---

## 詳細タスク

### 4.1.1 SavedQuery型定義（Rust）

**概要**: クエリ保存のデータ構造を定義

**作業内容**:
1. `src-tauri/src/models/saved_query.rs` ファイル作成
2. SavedQuery構造体定義
3. SavedQueryMetadata構造体定義
4. SaveQueryRequest構造体定義
5. SearchQueryRequest構造体定義
6. `mod.rs` にモジュール追加

**完了条件**:
- [ ] 全構造体がSerialize/Deserialize可能
- [ ] camelCase変換が設定されている
- [ ] コンパイルが通る

---

### 4.1.2 QueryStorage実装

**概要**: クエリの永続化ロジックを実装

**作業内容**:
1. `src-tauri/src/services/query_storage.rs` ファイル作成
2. QueryStorage構造体定義
3. save_query()メソッド実装
4. load_query()メソッド実装
5. delete_query()メソッド実装
6. list_queries()メソッド実装
7. search_queries()メソッド実装
8. PathManagerにqueries_dir()追加
9. `mod.rs` にモジュール追加

**完了条件**:
- [ ] CRUD操作が全て動作する
- [ ] ファイルが正しく保存される
- [ ] 検索が正しく動作する

---

### 4.1.3 save_query/load_queryコマンド

**概要**: TauriコマンドとしてAPIを公開

**作業内容**:
1. `src-tauri/src/commands/query_storage_commands.rs` ファイル作成
2. QueryStorageState定義
3. save_queryコマンド実装
4. load_queryコマンド実装
5. delete_queryコマンド実装
6. list_saved_queriesコマンド実装
7. search_saved_queriesコマンド実装
8. `lib.rs` にコマンド登録

**完了条件**:
- [ ] フロントエンドからinvoke可能
- [ ] エラーハンドリングが適切

---

### 4.1.4 フロントエンド型定義・API

**概要**: TypeScript側の型とAPI実装

**作業内容**:
1. `app/types/saved-query.ts` ファイル作成
2. SavedQuery型定義
3. SavedQueryMetadata型定義
4. SaveQueryRequest型定義
5. SearchQueryRequest型定義
6. `app/api/query-storage.ts` ファイル作成
7. queryStorageApiオブジェクト実装

**完了条件**:
- [ ] 型定義が完了
- [ ] API関数が全て実装されている
- [ ] 型チェックが通る

---

### 4.1.5 saved-queryストア実装

**概要**: Piniaストアで状態管理

**作業内容**:
1. `app/stores/saved-query.ts` ファイル作成
2. state定義（queries, isLoading, error, searchKeyword）
3. getters定義（filteredQueries）
4. actions定義（fetchQueries, saveQuery, loadQuery, deleteQuery, setSearchKeyword）

**完了条件**:
- [ ] 全アクションが動作する
- [ ] エラーハンドリングが適切
- [ ] ローディング状態が管理される

---

### 4.1.6 SaveQueryDialog.vue作成

**概要**: クエリ保存ダイアログコンポーネント

**作業内容**:
1. `app/components/query-builder/dialog/SaveQueryDialog.vue` 作成
2. フォームUI（名前、説明、タグ）
3. バリデーション実装
4. 保存ロジック実装
5. トースト通知

**完了条件**:
- [ ] ダイアログが開閉する
- [ ] バリデーションが動作する
- [ ] 保存が成功する
- [ ] 保存後にダイアログが閉じる

---

### 4.1.7 SavedQuerySlideover.vue作成

**概要**: 保存済みクエリ一覧のサイドパネル

**作業内容**:
1. `app/components/query-builder/SavedQuerySlideover.vue` 作成
2. クエリ一覧表示
3. 検索機能
4. クエリ読み込み機能
5. 削除機能（確認ダイアログ付き）

**完了条件**:
- [ ] 一覧が表示される
- [ ] 検索でフィルタリングされる
- [ ] クリックで読み込める
- [ ] 削除が確認後に実行される

---

### 4.1.8 QueryBuilderToolbar統合

**概要**: ツールバーに保存/読み込み機能を統合

**作業内容**:
1. SaveQueryDialogのimport追加
2. SavedQuerySlideoverのimport追加
3. 保存ボタンのクリックハンドラ変更
4. 「開く」ボタン追加
5. ダイアログ/Slideoverコンポーネント配置

**完了条件**:
- [ ] 保存ボタンでダイアログが開く
- [ ] 開くボタンでSlideoverが開く
- [ ] 保存/読み込みが正常に動作する

---

### 4.1.9 テストコード作成

**概要**: 自動テストの実装

**作業内容**:
1. Rustユニットテスト（query_storage.rs内）
2. フロントエンドストアテスト
3. コンポーネントテスト（任意）

**完了条件**:
- [ ] Rustテストがパス
- [ ] フロントエンドテストがパス
- [ ] カバレッジが80%以上

---

### 4.1.10 手動テスト・動作確認

**概要**: 実際のアプリでの動作確認

**作業内容**:
1. testing.md の全項目を確認
2. エッジケースの確認
3. UI/UXの確認

**完了条件**:
- [ ] testing.md の全項目が確認済み
- [ ] 不具合が修正されている

---

## 進捗状況

- **開始日**: -
- **完了日**: -
- **進捗率**: 0%

| 状態 | 件数 |
|------|------|
| 📝 未着手 | 10 |
| 🔄 進行中 | 0 |
| ✅ 完了 | 0 |
| ❌ ブロック | 0 |

---

## 備考

- 既存のFileStorageパターンを踏襲
- QueryModelの型はすでに定義済み
- query-builderストアに`loadFromSavedQuery`アクションの追加が必要
