# 要件定義書：SQLエディタ用保存クエリのフォルダ管理機能

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 計画中

---

## 1. 背景と目的

### 1.1 背景

SQLエディタ画面（`app/pages/sql-editor.vue`）では、現在以下の方法で保存クエリを管理しています：

- `useSqlEditorStore` を使用
- フラットリスト表示のみ
- 検索とタグフィルタリング機能あり
- コンポーネント：`SqlEditorSavedPanel.vue`

一方、クエリビルダー画面では `useSavedQueryStore` にフォルダ管理機能が実装済みですが、SQLエディタとは別のストアを使用しています。

### 1.2 目的

SQLエディタ画面でも、クエリビルダーと同様のフォルダ階層管理機能を実装し、以下を実現する：

1. **階層構造での整理**: フォルダとサブフォルダでクエリを整理
2. **直感的なUI**: フォルダの展開/折りたたみ、ドラッグ&ドロップ操作
3. **柔軟な検索とフィルタリング**: フォルダ構造を維持しながら検索可能
4. **実行履歴との統合**: 既存の履歴パネルと保存クエリパネルの共存

### 1.3 スコープ

**対象範囲**:
- SQLエディタ画面の保存クエリパネル（`SqlEditorSavedPanel.vue`）
- `useSqlEditorStore` のフォルダ管理機能
- SQLエディタ専用の型定義

**対象外**:
- クエリビルダーの保存クエリ機能（別途実装済み）
- バックエンドAPI（SQLエディタ用のフォルダ操作は本実装で追加）
- データモデル（既に実装済み）

---

## 2. 現状分析

### 2.1 既存の実装

#### SQLエディタ側
- **ストア**: `useSqlEditorStore` (`app/stores/sql-editor.ts`)
- **型定義**: `~/types/sql-editor` (SavedQueryMetadata)
- **UIコンポーネント**: `SqlEditorSavedPanel.vue`
- **保存ダイアログ**: `SqlEditorSaveDialog.vue`

#### クエリビルダー側（参考）
- **ストア**: `useSavedQueryStore` (`app/stores/saved-query.ts`)
  - ✅ フォルダ管理機能実装済み（`folders`, `expandedFolders`, `queryTree` など）
- **型定義**: `@/types/query-tree` (TreeNode)
- **UIコンポーネント**: `SavedQuerySlideover.vue`（ツリーUI未実装）

### 2.2 共通基盤

#### バックエンドAPI（実装済み）
- `sqlEditorApi.listFolders()` - フォルダ一覧取得
- `sqlEditorApi.moveQuery(id, path)` - クエリ移動
- `sqlEditorApi.renameFolder(old, new)` - フォルダ名変更
- `sqlEditorApi.deleteFolder(path)` - フォルダ削除

#### データストレージ
- JSON形式でファイル保存
- `folderPath` フィールド対応済み
- 既存クエリとの後方互換性あり

---

## 3. 機能要件

### 3.1 フォルダ構造管理

#### FR-1: フォルダツリー表示
- **概要**: 保存クエリをフォルダ階層で表示
- **詳細**:
  - VSCodeエクスプローラー風のツリービュー
  - フォルダアイコン：開いている状態 📂、閉じている状態 📁
  - フォルダ内のクエリ数をバッジ表示
  - クエリアイコン：📄
- **レイアウト**:
  - 左パネル：フォルダツリー + クエリ一覧
  - 展開/折りたたみはクリックで切り替え

#### FR-2: フォルダ操作
- **フォルダ作成**: 右クリックメニューまたはツールバーボタンから作成
- **フォルダ名変更**: 右クリックメニューから変更
- **フォルダ削除**: 空のフォルダのみ削除可能

#### FR-3: クエリの移動
- **ドラッグ&ドロップ**: クエリをフォルダ間でドラッグ移動
- **コンテキストメニュー**: 「移動先を選択」でフォルダ選択ダイアログ表示

### 3.2 既存機能との統合

#### FR-4: 検索機能の拡張
- **現状**: キーワード検索、タグフィルタ、SQL文内検索
- **拡張**:
  - 検索結果をツリー構造で表示
  - ヒットしたクエリの親フォルダを自動展開
  - フォルダ階層を維持したまま検索結果を表示

#### FR-5: クエリ実行機能の維持
- **現状**: 保存クエリから直接実行可能
- **維持**: ツリービューでも同様に実行ボタンを表示

#### FR-6: 読み込み中クエリの表示
- **現状**: 現在読み込み中のクエリを上部に表示
- **維持**: ツリービュー導入後も同様に表示

### 3.3 UI/UX要件

#### FR-7: ツリービューのインタラクション
- **展開/折りたたみ**: フォルダアイコンまたはフォルダ名をクリック
- **クエリ選択**: クリックで読み込み、ダブルクリックで実行
- **右クリックメニュー**:
  - フォルダ: 新規作成、名前変更、削除、全て展開/折りたたみ
  - クエリ: 読み込み、実行、編集、削除、移動

#### FR-8: ドラッグ&ドロップ
- **クエリのドラッグ**: クエリをドラッグしてフォルダに移動
- **視覚的フィードバック**: ドロップ可能な領域をハイライト
- **制約**: フォルダ→フォルダのドラッグは Phase 1 ではスコープ外

#### FR-9: 展開状態の永続化
- **保存**: LocalStorageに展開状態を保存
- **復元**: 画面表示時に前回の展開状態を復元
- **キー**: `sqlEditorExpandedFolders`（クエリビルダーと区別）

---

## 4. 非機能要件

### 4.1 パフォーマンス
- **NFR-1**: 1000件のクエリでツリー表示が1秒以内に完了
- **NFR-2**: フォルダ展開/折りたたみは100ms以内に反応

### 4.2 互換性
- **NFR-3**: 既存の保存クエリは自動的にルート直下に配置
- **NFR-4**: 既存のAPI（検索、タグフィルタ、SQL文内検索）は引き続き動作
- **NFR-5**: クエリビルダーとデータは共有されるが、展開状態は独立

### 4.3 ユーザビリティ
- **NFR-6**: クエリビルダーと同様のUI/UX
- **NFR-7**: 既存の履歴パネルとの切り替えがスムーズ

---

## 5. データモデル

### 5.1 型定義の追加

SQLエディタ専用の型定義を追加します。

#### SavedQueryMetadata（既存）
**ファイル**: `app/types/sql-editor.ts`

```typescript
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null  // 新規追加
  connectionId: string
  createdAt: string
  updatedAt: string
}
```

#### TreeNode（新規）
**ファイル**: `app/types/sql-editor.ts` または `app/types/query-tree.ts`（共通化）

```typescript
export interface TreeNode {
  type: 'folder' | 'query'
  path: string
  name: string
  children?: TreeNode[]
  query?: SavedQueryMetadata
  expanded?: boolean
  queryCount?: number
}
```

### 5.2 ストア状態の拡張

**ファイル**: `app/stores/sql-editor.ts`

```typescript
interface SqlEditorState {
  // 既存フィールド
  // ...

  // 保存クエリ関連（既存）
  savedQueries: SavedQueryMetadata[]
  isSavedQueriesLoading: boolean
  savedQueryError: string | null

  // 新規追加：フォルダ管理
  folders: string[]
  expandedFolders: Set<string>
}
```

---

## 6. API設計

### 6.1 新規アクション

`useSqlEditorStore` に以下のアクションを追加：

#### fetchFolders
```typescript
/**
 * フォルダ一覧を取得
 */
async fetchFolders(): Promise<void>
```

#### moveQuery
```typescript
/**
 * クエリを指定フォルダに移動
 */
async moveSavedQuery(queryId: string, targetFolderPath: string | null): Promise<void>
```

#### renameFolder
```typescript
/**
 * フォルダ名を変更
 */
async renameFolder(oldPath: string, newPath: string): Promise<void>
```

#### deleteFolder
```typescript
/**
 * 空のフォルダを削除
 */
async deleteFolder(folderPath: string): Promise<void>
```

#### toggleFolderExpansion
```typescript
/**
 * フォルダの展開/折りたたみを切り替え
 */
toggleFolderExpansion(folderPath: string): void
```

### 6.2 新規Getter

#### queryTree
```typescript
/**
 * フラットなクエリ一覧から階層ツリー構造を生成
 */
queryTree(): TreeNode[]
```

#### getFolderByPath
```typescript
/**
 * 指定パスのフォルダノードを取得
 */
getFolderByPath(path: string): TreeNode | null
```

---

## 7. UI実装詳細

### 7.1 コンポーネント構成

```
SqlEditorSavedPanel.vue（既存を改修）
├── SavedQueryTreeView.vue（新規）
│   ├── TreeNodeItem.vue（新規）
│   │   ├── FolderNode.vue（新規）
│   │   └── QueryNode.vue（新規）
├── FolderContextMenu.vue（新規）
├── QueryContextMenu.vue（新規）
├── CreateFolderDialog.vue（新規）
├── RenameFolderDialog.vue（新規）
└── MoveQueryDialog.vue（新規）
```

### 7.2 SqlEditorSavedPanel.vue の改修

**現状**:
- フラットリスト表示
- 検索・タグフィルタ
- 読み込み中クエリの表示

**改修後**:
- ツリービュー表示に変更
- 既存の検索・フィルタ機能を維持
- ツールバーに「新規フォルダ」ボタンを追加

### 7.3 SavedQueryTreeView.vue（新規）

**責務**:
- ツリー構造の表示
- フォルダの展開/折りたたみ
- ドラッグ&ドロップのハンドリング

**主要なプロパティ**:
```typescript
const props = defineProps<{
  tree: TreeNode[]
  currentQueryId?: string | null
}>()
```

**主要なイベント**:
```typescript
const emit = defineEmits<{
  (e: 'load-query', id: string): void
  (e: 'execute-query', id: string): void
  (e: 'edit-query', id: string): void
  (e: 'delete-query', id: string): void
  (e: 'move-query', queryId: string, targetPath: string | null): void
  (e: 'toggle-folder', path: string): void
  (e: 'create-folder', parentPath: string | null): void
  (e: 'rename-folder', path: string): void
  (e: 'delete-folder', path: string): void
}>()
```

---

## 8. 実装ステップ

### Phase 1: 型定義とストア拡張
1. `SavedQueryMetadata` に `folderPath` を追加
2. `TreeNode` 型を定義（または共通化）
3. `useSqlEditorStore` の状態を拡張

### Phase 2: ストアアクション実装
1. `fetchFolders` 実装
2. `queryTree` Getter 実装
3. `moveQuery`, `renameFolder`, `deleteFolder` 実装
4. 展開状態管理（`toggleFolderExpansion`, `saveExpandedFolders`, `loadExpandedFolders`）

### Phase 3: UIコンポーネント実装
1. `SavedQueryTreeView.vue` 作成
2. `TreeNodeItem.vue` 作成（フォルダとクエリの共通ノード）
3. `FolderNode.vue` と `QueryNode.vue` 作成
4. `SqlEditorSavedPanel.vue` を改修してツリービューを組み込み

### Phase 4: ダイアログ実装
1. `CreateFolderDialog.vue` 作成
2. `RenameFolderDialog.vue` 作成
3. `MoveQueryDialog.vue` 作成
4. コンテキストメニュー実装

### Phase 5: ドラッグ&ドロップ
1. HTML5 Drag and Drop API を使用
2. ドラッグ開始、ドラッグオーバー、ドロップのハンドラ実装
3. 視覚的フィードバック（ハイライト、カーソル変化）

### Phase 6: テストと調整
1. ユニットテストの追加
2. 既存機能の回帰テスト
3. パフォーマンステスト（1000件のクエリ）

---

## 9. 受け入れ基準

### 9.1 必須機能
- [ ] フォルダ作成・名前変更・削除が正常に動作する
- [ ] クエリをフォルダに移動できる
- [ ] ツリービューでフォルダの展開/折りたたみができる
- [ ] 既存のクエリ（`folderPath`なし）がルート直下に表示される
- [ ] 検索機能がツリービューでも動作する
- [ ] タグフィルタ機能が動作する
- [ ] クエリの読み込み・実行が正常に動作する
- [ ] 展開状態がLocalStorageに保存・復元される

### 9.2 パフォーマンス
- [ ] 1000件のクエリで初回ロードが1秒以内
- [ ] フォルダ展開が100ms以内

### 9.3 互換性
- [ ] 既存の保存クエリが正常に表示される
- [ ] クエリビルダーで作成したフォルダがSQLエディタでも表示される
- [ ] SQLエディタで作成したフォルダがクエリビルダーでも表示される

---

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `useSqlEditorStore` と `useSavedQueryStore` の不整合 | 中 | バックエンドAPIが共通なので、データレベルでは整合性が保たれる |
| 既存のSQLエディタ機能への影響 | 低 | 段階的な実装と回帰テストで対応 |
| ドラッグ&ドロップの操作ミス | 低 | 確認ダイアログと視覚的フィードバック |
| パフォーマンス低下 | 中 | Getterのメモ化、仮想スクロール導入 |

---

## 11. クエリビルダーとの関係

### 11.1 共有されるもの
- **バックエンドAPI**: `sqlEditorApi.*`
- **データストレージ**: JSON形式のクエリファイル
- **フォルダ構造**: 同じフォルダパスを使用

### 11.2 独立しているもの
- **ストア**: `useSqlEditorStore` と `useSavedQueryStore` は別
- **UI**: それぞれ独自のコンポーネント
- **展開状態**: LocalStorageキーが異なる
  - SQLエディタ: `sqlEditorExpandedFolders`
  - クエリビルダー: `savedQueryExpandedFolders`

### 11.3 将来的な統合の可能性
- 両方の実装が完了した後、共通化できる部分（TreeNodeコンポーネント等）を検討
- ストアの統合は複雑なため、Phase 1ではスコープ外

---

## 12. 参考資料

- [保存クエリのフォルダ管理機能 - 元の要件定義](../20260124_保存クエリ管理/requirements.md)
- [Phase 2: バックエンドAPI実装](../../working/20260124_folder-api-implementation/)
- [Phase 3: フロントエンドStore設計](../../working/20260125_folder-store-implementation/)
- クエリビルダー実装: `app/stores/saved-query.ts`

---

## 付録: 用語集

| 用語 | 定義 |
|------|------|
| フォルダパス | `/親/子/孫` 形式の階層構造を表す文字列 |
| ルート | フォルダ階層の最上位（`folderPath: null`） |
| ツリーノード | フォルダまたはクエリを表すUI要素 |
| 展開状態 | フォルダが開いているか閉じているかの状態 |
| LocalStorage | ブラウザのローカルストレージ（展開状態の保存用） |
