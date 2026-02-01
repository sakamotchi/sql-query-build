# タスクリスト：保存クエリフォルダ管理 - Phase 3: フロントエンドStore実装

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親要件**: [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| ✅ 完了 | 0 |
| 🚧 進行中 | 0 |
| 📝 未着手 | 13 |

**進捗率**: 0% (0/13)

---

## タスク一覧

### T-1: 型定義の作成

**目的**: ツリー構造を表す型定義を作成

**対象ファイル**:
- `app/types/query-tree.ts` (新規作成)

**作業内容**:
- [ ] `TreeNode` インターフェースの定義
  - `type: 'folder' | 'query'`
  - `path: string`
  - `name: string`
  - `children?: TreeNode[]`
  - `query?: SavedQueryMetadata`
  - `expanded?: boolean`
  - `queryCount?: number`
- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] JSDocコメントの追加

**見積**: 30分

**依存**: なし

---

### T-2: ストアの状態拡張

**目的**: `SavedQueryState` にフォルダ関連の状態を追加

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `SavedQueryState` インターフェースに以下を追加:
  - `folders: string[]`
  - `expandedFolders: Set<string>`
- [ ] `state()` の初期値を設定:
  - `folders: []`
  - `expandedFolders: new Set()`
- [ ] TypeScriptコンパイルエラーがないことを確認

**見積**: 15分

**依存**: T-1

---

### T-3: queryTree Getterの実装

**目的**: フラットなクエリ一覧から階層ツリー構造を生成

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `queryTree` Getter の実装
  - フォルダツリーの構築（folderMapを使用）
  - クエリの配置（folderPath に基づく）
  - ルート直下のクエリ配置（folderPath: null）
  - 再帰的なソート（フォルダ優先、アルファベット順）
  - 展開状態の設定（expandedFolders から取得）
  - queryCount の計算
- [ ] 手動テスト（ブラウザコンソールで動作確認）
- [ ] エッジケースの確認:
  - 空のフォルダ
  - ネストした深いフォルダ
  - folderPath がフォルダ一覧に存在しないクエリ

**見積**: 2時間

**依存**: T-2

---

### T-4: getFolderByPath Getterの実装

**目的**: 指定パスのフォルダノードを取得する補助Getter

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `getFolderByPath` Getter の実装
  - 再帰的な検索処理
  - `null` を返す場合の処理
- [ ] 手動テスト

**見積**: 30分

**依存**: T-3

---

### T-5: fetchFolders アクションの実装

**目的**: フォルダ一覧を取得して状態を更新

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `fetchFolders()` アクションの実装
  - `queryStorageApi.listFolders()` の呼び出し
  - `folders` 状態の更新
  - エラーハンドリング（try-catch）
  - Toast通知（エラー時）
- [ ] 手動テスト（ブラウザで動作確認）

**見積**: 30分

**依存**: T-2

---

### T-6: moveQuery アクションの実装

**目的**: クエリを指定フォルダに移動

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `moveQuery(queryId, folderPath)` アクションの実装
  - `queryStorageApi.moveQuery()` の呼び出し
  - クエリ一覧の再取得（`fetchQueries()`）
  - ローディング状態管理（`isLoading`）
  - エラーハンドリング（try-catch）
  - Toast通知（成功/エラー）
- [ ] 手動テスト

**見積**: 45分

**依存**: T-5

---

### T-7: renameFolder アクションの実装

**目的**: フォルダ名を変更し、配下のクエリのパスも自動更新

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `renameFolder(oldPath, newPath)` アクションの実装
  - バリデーション（フォルダ名の重複チェック）
  - `queryStorageApi.renameFolder()` の呼び出し
  - フォルダ一覧とクエリ一覧の再取得
  - 展開状態の更新（oldPath → newPath）
  - エラーハンドリング（try-catch）
  - Toast通知（成功/エラー/バリデーションエラー）
- [ ] 手動テスト

**見積**: 1時間

**依存**: T-5

---

### T-8: deleteFolder アクションの実装

**目的**: 空のフォルダを削除

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `deleteFolder(folderPath)` アクションの実装
  - バリデーション（空フォルダチェック）
  - `queryStorageApi.deleteFolder()` の呼び出し
  - フォルダ一覧の再取得
  - 展開状態から削除
  - エラーハンドリング（try-catch）
  - Toast通知（成功/エラー/バリデーションエラー）
- [ ] 手動テスト

**見積**: 45分

**依存**: T-5

---

### T-9: 展開状態管理アクションの実装

**目的**: フォルダの展開/折りたたみとLocalStorage永続化

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `toggleFolderExpansion(folderPath)` アクションの実装
  - `expandedFolders` の更新（Set操作）
  - `saveExpandedFolders()` の呼び出し
- [ ] `saveExpandedFolders()` アクションの実装
  - `expandedFolders` を配列に変換
  - `localStorage.setItem()` で保存
  - エラーハンドリング（try-catch、エラー通知なし）
- [ ] `loadExpandedFolders()` アクションの実装
  - `localStorage.getItem()` で取得
  - JSONパース
  - `expandedFolders` を Set に変換
  - エラーハンドリング（try-catch、フォールバック）
- [ ] 手動テスト（展開→リロード→復元を確認）

**見積**: 1時間

**依存**: T-2

---

### T-10: handleQueryDrop アクションの実装

**目的**: ドラッグ&ドロップによるクエリ移動のハンドラ

**対象ファイル**:
- `app/stores/saved-query.ts`

**作業内容**:
- [ ] `handleQueryDrop(queryId, targetFolderPath)` アクションの実装
  - クエリの存在チェック
  - 同じフォルダへのドロップをスキップ
  - `moveQuery()` アクションの呼び出し
- [ ] 手動テスト（Phase 4のUI実装後）

**見積**: 30分

**依存**: T-6

---

### T-11: ユニットテストの実装

**目的**: ストアの各機能をテスト

**対象ファイル**:
- `tests/stores/saved-query.spec.ts` (既存ファイルに追加)

**作業内容**:
- [ ] テストセットアップ（モック設定）
  - `queryStorageApi` のモック
  - Pinia のセットアップ
- [ ] `queryTree` Getter のテスト
  - フォルダとクエリの配置
  - ソート順
  - 展開状態
  - queryCount
- [ ] `toggleFolderExpansion` のテスト
- [ ] `saveExpandedFolders` / `loadExpandedFolders` のテスト
- [ ] `moveQuery` のテスト（APIモック）
- [ ] `renameFolder` のテスト（APIモック）
- [ ] `deleteFolder` のテスト
  - 空フォルダの削除
  - クエリが含まれるフォルダの削除（バリデーションエラー）
- [ ] 全テストがパスすることを確認

**見積**: 3時間

**依存**: T-3, T-6, T-7, T-8, T-9

---

### T-12: 既存機能の互換性確認

**目的**: 既存のクエリ管理機能が正常に動作することを確認

**作業内容**:
- [ ] 既存のユニットテストを実行
  - `tests/stores/saved-query.spec.ts` の既存テストがパスするか
- [ ] 手動テスト
  - `fetchQueries()` が正常に動作するか
  - `saveCurrentQuery()` が正常に動作するか
  - `deleteQuery()` が正常に動作するか
  - `setSearchKeyword()` が正常に動作するか
  - `setSelectedTags()` が正常に動作するか
- [ ] 回帰テストで問題がないことを確認

**見積**: 1時間

**依存**: T-11

---

### T-13: ドキュメント更新

**目的**: 永続化ドキュメントを更新

**対象ファイル**:
- `docs/steering/06_ubiquitous_language.md`

**作業内容**:
- [ ] フォルダ管理関連の用語を追加:
  - フォルダパス (Folder Path)
  - ツリーノード (Tree Node)
  - 展開状態 (Expansion State)
  - クエリツリー (Query Tree)
- [ ] コード上の表現を追加:
  - `TreeNode`
  - `queryTree`
  - `expandedFolders`
- [ ] `docs/steering/06_ubiquitous_language.md` の更新完了を確認

**見積**: 30分

**依存**: T-11

---

## 完了条件

- [ ] 全タスク（T-1 〜 T-13）が完了
- [ ] 全ユニットテストがパス
- [ ] 既存機能の互換性確認完了
- [ ] 永続化ドキュメント更新完了
- [ ] TypeScriptコンパイルエラーなし
- [ ] 設計書の実装チェックリストが全て完了

---

## 見積サマリー

| タスク | 見積時間 |
|--------|---------|
| T-1: 型定義の作成 | 30分 |
| T-2: ストアの状態拡張 | 15分 |
| T-3: queryTree Getterの実装 | 2時間 |
| T-4: getFolderByPath Getterの実装 | 30分 |
| T-5: fetchFolders アクションの実装 | 30分 |
| T-6: moveQuery アクションの実装 | 45分 |
| T-7: renameFolder アクションの実装 | 1時間 |
| T-8: deleteFolder アクションの実装 | 45分 |
| T-9: 展開状態管理アクションの実装 | 1時間 |
| T-10: handleQueryDrop アクションの実装 | 30分 |
| T-11: ユニットテストの実装 | 3時間 |
| T-12: 既存機能の互換性確認 | 1時間 |
| T-13: ドキュメント更新 | 30分 |
| **合計** | **約12時間** |

---

## タスク依存関係図

```
T-1 (型定義)
 ↓
T-2 (状態拡張)
 ↓
 ├─→ T-3 (queryTree Getter)
 │    ↓
 │   T-4 (getFolderByPath Getter)
 │
 ├─→ T-5 (fetchFolders)
 │    ↓
 │    ├─→ T-6 (moveQuery)
 │    │    ↓
 │    │   T-10 (handleQueryDrop)
 │    │
 │    ├─→ T-7 (renameFolder)
 │    │
 │    └─→ T-8 (deleteFolder)
 │
 └─→ T-9 (展開状態管理)

T-3, T-6, T-7, T-8, T-9
 ↓
T-11 (ユニットテスト)
 ↓
T-12 (互換性確認)
 ↓
T-13 (ドキュメント更新)
```

---

## 推奨実装順序

1. **基盤構築** (T-1, T-2)
2. **ツリー構造** (T-3, T-4)
3. **API統合** (T-5, T-6, T-7, T-8)
4. **展開状態** (T-9)
5. **ドラッグ&ドロップ** (T-10)
6. **テスト** (T-11, T-12)
7. **ドキュメント** (T-13)

---

## リスク管理

| リスク | 影響度 | 対策 | 担当 |
|--------|--------|------|------|
| ツリービルドのパフォーマンス低下 | 中 | アルゴリズムの最適化（Map使用）、大量データでのテスト | Dev |
| LocalStorageの制限 | 低 | エラーハンドリングでフォールバック | Dev |
| 既存機能への影響 | 中 | 互換性テストを徹底、回帰テスト実施 | Dev |
| Set型のシリアライズ | 低 | Array変換で対応済み | Dev |

---

## メモ・備考

**Phase 2との連携**:
- Phase 2で実装済みのAPI（`list_folders`, `move_query`, `rename_folder`, `delete_folder`）を活用
- APIの仕様は Phase 2 のドキュメントを参照

**Phase 4との連携**:
- Phase 4でUIコンポーネントを実装する際、このストアを使用
- `handleQueryDrop` は Phase 4 のドラッグ&ドロップUIから呼び出される

**パフォーマンス考慮事項**:
- `queryTree` Getter はPiniaのメモ化により自動的にキャッシュされる
- 状態（`queries`, `folders`, `expandedFolders`）が変更されない限り再計算されない

**開発環境**:
- `npm run tauri:dev` でTauriアプリを起動してテスト
- `npm run test` でユニットテスト実行
- `npm run typecheck` で型チェック

---

## 次のアクション

1. T-1から順次実装を開始
2. 各タスク完了時にチェックボックスをONにする
3. 問題が発生した場合は `task_{タスクID}.md` を作成して詳細を記録
4. Phase 3完了後、Phase 4（UIコンポーネント実装）に進む
