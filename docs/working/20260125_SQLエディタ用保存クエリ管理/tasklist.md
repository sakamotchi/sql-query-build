# タスクリスト：SQLエディタ用保存クエリのフォルダ管理機能

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 計画中

---

## Phase 1: 型定義とストア拡張

### 1.1 型定義の追加
- [ ] `app/types/sql-editor.ts` に `folderPath` を追加
  - [ ] `SavedQueryMetadata` インターフェースを更新
  - [ ] `folderPath?: string | null` を追加
- [ ] `TreeNode` 型を定義
  - [ ] 新規ファイル `app/types/query-tree.ts` を作成（または既存を利用）
  - [ ] `TreeNode` インターフェースを定義

**見積もり**: 30分
**担当**: -

---

## Phase 2: ストアアクション実装

### 2.1 状態の拡張
- [ ] `app/stores/sql-editor.ts` の `SqlEditorState` を拡張
  - [ ] `folders: string[]` を追加
  - [ ] `expandedFolders: Set<string>` を追加

### 2.2 Getterの実装
- [ ] `queryTree` Getter を実装
  - [ ] フォルダツリーを構築するロジック
  - [ ] クエリを適切なフォルダに配置
  - [ ] ソート処理（フォルダ優先、アルファベット順）
- [ ] `getFolderByPath` Getter を実装
  - [ ] ツリーを再帰的に検索

### 2.3 フォルダ一覧取得
- [ ] `fetchFolders` アクション を実装
  - [ ] `sqlEditorApi.listFolders()` を呼び出し
  - [ ] エラーハンドリング

### 2.4 クエリ移動
- [ ] `moveSavedQuery` アクション を実装
  - [ ] `sqlEditorApi.moveQuery()` を呼び出し
  - [ ] クエリ一覧の再取得
  - [ ] Toast通知
  - [ ] エラーハンドリング

### 2.5 フォルダ名変更
- [ ] `renameFolder` アクション を実装
  - [ ] 重複チェック
  - [ ] `sqlEditorApi.renameFolder()` を呼び出し
  - [ ] フォルダ・クエリ一覧の再取得
  - [ ] 展開状態の更新
  - [ ] Toast通知
  - [ ] エラーハンドリング

### 2.6 フォルダ削除
- [ ] `deleteFolder` アクション を実装
  - [ ] 空フォルダチェック
  - [ ] `sqlEditorApi.deleteFolder()` を呼び出し
  - [ ] フォルダ一覧の再取得
  - [ ] 展開状態から削除
  - [ ] Toast通知
  - [ ] エラーハンドリング

### 2.7 展開状態管理
- [ ] `toggleFolderExpansion` アクション を実装
  - [ ] `expandedFolders` の更新
  - [ ] `saveExpandedFolders()` を呼び出し
- [ ] `saveExpandedFolders` アクション を実装
  - [ ] LocalStorageに保存（キー: `sqlEditorExpandedFolders`）
  - [ ] エラーハンドリング
- [ ] `loadExpandedFolders` アクション を実装
  - [ ] LocalStorageから復元
  - [ ] エラーハンドリング

### 2.8 ドラッグ&ドロップハンドラ
- [ ] `handleQueryDrop` アクション を実装
  - [ ] クエリの存在チェック
  - [ ] 同じフォルダチェック
  - [ ] フォルダの存在チェック
  - [ ] `moveSavedQuery()` を呼び出し

**見積もり**: 4時間
**担当**: -

---

## Phase 3: UIコンポーネント実装

### 3.1 SavedQueryTreeView.vue（新規）
- [ ] コンポーネントファイル作成
  - [ ] `app/components/sql-editor/SavedQueryTreeView.vue`
- [ ] プロパティ定義
  - [ ] `tree: TreeNode[]`
  - [ ] `currentQueryId?: string | null`
  - [ ] `isLoading?: boolean`
- [ ] イベント定義
  - [ ] `load-query`, `execute-query`, `edit-query`, `delete-query`
  - [ ] `move-query`, `toggle-folder`
  - [ ] `create-folder`, `rename-folder`, `delete-folder`
- [ ] テンプレート実装
  - [ ] ローディング表示
  - [ ] 空状態表示
  - [ ] `TreeNodeItem` の呼び出し

### 3.2 TreeNodeItem.vue（新規）
- [ ] コンポーネントファイル作成
  - [ ] `app/components/sql-editor/TreeNodeItem.vue`
- [ ] プロパティ定義
  - [ ] `node: TreeNode`
  - [ ] `level: number`
  - [ ] `currentQueryId?: string | null`
- [ ] フォルダノードのテンプレート
  - [ ] フォルダアイコン（開/閉）
  - [ ] フォルダ名
  - [ ] クエリ数バッジ
  - [ ] 展開/折りたたみボタン
  - [ ] 子ノードの再帰表示
- [ ] クエリノードのテンプレート
  - [ ] クエリアイコン
  - [ ] クエリ名・説明・タグ
  - [ ] アクションボタン（実行・編集・削除）
  - [ ] ハイライト表示（読み込み中）
- [ ] ドラッグ&ドロップ実装
  - [ ] `draggable` 属性
  - [ ] `@dragstart` ハンドラ
  - [ ] `@dragover` ハンドラ
  - [ ] `@drop` ハンドラ
  - [ ] ドロップターゲットのスタイル
- [ ] コンテキストメニュー
  - [ ] 右クリックイベント
  - [ ] メニュー表示（後のPhaseで詳細実装）

### 3.3 SqlEditorSavedPanel.vue（改修）
- [ ] `SavedQueryTreeView` のインポート
- [ ] ツールバーにフォルダ作成ボタンを追加
- [ ] フラットリスト表示を `SavedQueryTreeView` に置き換え
- [ ] イベントハンドラの実装
  - [ ] `handleLoad`, `handleExecute`, `handleEdit`, `handleDelete`（既存）
  - [ ] `handleMoveQuery`（新規）
  - [ ] `handleToggleFolder`（新規）
  - [ ] `handleCreateFolder`（新規）
  - [ ] `handleRenameFolder`（新規）
  - [ ] `handleDeleteFolder`（新規）
- [ ] `onMounted` で初期化処理
  - [ ] `loadExpandedFolders()` を呼び出し
  - [ ] `fetchFolders()` と `loadSavedQueries()` を並列実行

**見積もり**: 6時間
**担当**: -

---

## Phase 4: ダイアログ実装

### 4.1 CreateFolderDialog.vue（新規）
- [ ] コンポーネントファイル作成
  - [ ] `app/components/sql-editor/dialogs/CreateFolderDialog.vue`
- [ ] プロパティ定義
  - [ ] `open: boolean`
  - [ ] `parentPath: string | null`
- [ ] フォーム実装
  - [ ] フォルダ名入力フィールド
  - [ ] バリデーション（必須、文字数、禁止文字）
- [ ] イベント定義
  - [ ] `update:open`, `confirm`, `cancel`
- [ ] 確定時の処理
  - [ ] フォルダパスの生成
  - [ ] `confirm` イベントの発火

### 4.2 RenameFolderDialog.vue（新規）
- [ ] コンポーネントファイル作成
  - [ ] `app/components/sql-editor/dialogs/RenameFolderDialog.vue`
- [ ] プロパティ定義
  - [ ] `open: boolean`
  - [ ] `folderPath: string | null`
- [ ] フォーム実装
  - [ ] 新しいフォルダ名入力フィールド
  - [ ] 現在のパスを表示
  - [ ] バリデーション
- [ ] イベント定義
  - [ ] `update:open`, `confirm`, `cancel`
- [ ] 確定時の処理
  - [ ] 新しいパスの生成
  - [ ] `confirm` イベントの発火

### 4.3 MoveQueryDialog.vue（新規・オプション）
- [ ] コンポーネントファイル作成
  - [ ] `app/components/sql-editor/dialogs/MoveQueryDialog.vue`
- [ ] フォルダ一覧の表示
  - [ ] ツリービュー形式
  - [ ] フォルダ選択
- [ ] イベント定義
  - [ ] `update:open`, `confirm`, `cancel`

**見積もり**: 3時間
**担当**: -

---

## Phase 5: テストと調整

### 5.1 ユニットテスト
- [ ] `tests/stores/sql-editor.spec.ts` にテスト追加
  - [ ] `queryTree` Getter のテスト
  - [ ] `getFolderByPath` Getter のテスト
  - [ ] `fetchFolders` のテスト
  - [ ] `moveSavedQuery` のテスト
  - [ ] `renameFolder` のテスト
  - [ ] `deleteFolder` のテスト
  - [ ] `toggleFolderExpansion` のテスト
  - [ ] `saveExpandedFolders` / `loadExpandedFolders` のテスト
  - [ ] `handleQueryDrop` のテスト

### 5.2 コンポーネントテスト
- [ ] `SavedQueryTreeView.vue` のテスト
  - [ ] ツリー表示のテスト
  - [ ] イベント発火のテスト
- [ ] `TreeNodeItem.vue` のテスト
  - [ ] フォルダノードの表示
  - [ ] クエリノードの表示
  - [ ] ドラッグ&ドロップのテスト

### 5.3 統合テスト
- [ ] フォルダ作成→クエリ移動→フォルダ削除の一連の流れ
- [ ] 展開状態の保存・復元
- [ ] 検索機能との統合

### 5.4 回帰テスト
- [ ] 既存の保存クエリ機能が正常に動作することを確認
  - [ ] クエリの保存
  - [ ] クエリの読み込み
  - [ ] クエリの実行
  - [ ] クエリの削除
- [ ] 検索・タグフィルタ機能の動作確認

### 5.5 パフォーマンステスト
- [ ] 1000件のクエリでのツリー表示速度
- [ ] フォルダ展開/折りたたみの反応速度

### 5.6 調整
- [ ] UIの微調整（スタイル、アニメーション）
- [ ] エラーメッセージの改善
- [ ] アクセシビリティの確認

**見積もり**: 4時間
**担当**: -

---

## Phase 6: ドキュメント更新

### 6.1 永続化ドキュメントの更新
- [ ] `docs/steering/06_ubiquitous_language.md` にフォルダ管理用語を追加
- [ ] `docs/steering/features/` に該当する機能詳細があれば更新

### 6.2 開発作業ドキュメントの完了
- [ ] `docs/local/20260125_SQLエディタ用保存クエリ管理/testing.md` を作成
- [ ] 実装完了後、このドキュメントを `docs/archive/` に移動

**見積もり**: 1時間
**担当**: -

---

## 進捗管理

### 全体進捗
- Phase 1: ⬜ 未着手
- Phase 2: ⬜ 未着手
- Phase 3: ⬜ 未着手
- Phase 4: ⬜ 未着手
- Phase 5: ⬜ 未着手
- Phase 6: ⬜ 未着手

### 総見積もり時間
- **合計**: 約 18.5時間

---

## 注意事項

1. **段階的実装**: 各Phaseを完了してから次に進む
2. **テスト駆動**: 各機能実装後、すぐにテストを追加
3. **既存機能の保護**: 回帰テストを頻繁に実行
4. **コミット単位**: Phase単位でコミット
5. **ドキュメント同期**: 実装に合わせてドキュメントを更新

---

## リスク管理

| リスク | 対策 | 状態 |
|--------|------|------|
| 既存機能への影響 | 回帰テストの実施 | - |
| パフォーマンス低下 | パフォーマンステストで検証 | - |
| `useSavedQueryStore` との不整合 | バックエンドAPIが共通なので問題なし | - |
| ドラッグ&ドロップの複雑さ | 段階的実装、まずは基本機能から | - |
