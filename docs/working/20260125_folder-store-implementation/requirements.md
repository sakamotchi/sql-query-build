# 要件定義書：保存クエリフォルダ管理 - Phase 3: フロントエンドStore実装

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親要件**: [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)

---

## 1. 背景と目的

### 1.1 背景

保存クエリのフォルダ管理機能において、Phase 1でデータモデル設計、Phase 2でバックエンドAPI実装が完了しました。

**Phase 1で完了した内容**:
- TypeScript型定義の更新（`SavedQueryMetadata`に`folderPath`と`connectionId`のnullable化）
- Rust構造体の更新（`SavedQuery`と`SavedQueryMetadata`に`folder_path`と`connection_id`のOption型追加）
- 既存JSONファイルとの後方互換性確保

**Phase 2で完了した内容**:
- フォルダ一覧取得API（`list_folders`）
- クエリ移動API（`move_query`）
- フォルダ名変更API（`rename_folder`）
- フォルダ削除API（`delete_folder`）
- 検索API拡張（`search_saved_queries`にfolderPathフィルタ追加）
- 既存API互換性確認
- エラーハンドリング強化

**Phase 3で実装する内容**:
- Piniaストアの拡張（フォルダ管理機能の追加）
- フォルダ管理アクション（フォルダCRUD操作、クエリ移動）
- ツリー構造ビルド処理（フラットなクエリ一覧からツリーへ変換）
- ドラッグ&ドロップロジック
- 展開状態管理

### 1.2 目的

フロントエンドのPiniaストアにフォルダ管理機能を実装し、UIコンポーネントから利用可能な状態にする。

**具体的な目標**:
1. **状態管理**: フォルダ一覧、展開状態、ツリー構造を管理
2. **API統合**: Phase 2で実装したバックエンドAPIを呼び出す
3. **ツリービルド**: フラットなクエリ一覧から階層ツリーを生成
4. **ドラッグ&ドロップ**: クエリをフォルダ間で移動するロジック
5. **永続化**: 展開状態をLocalStorageに保存

### 1.3 スコープ

**対象範囲**:
- `app/stores/saved-query.ts` の拡張
- ツリー構造関連の型定義（`app/types/query-tree.ts`）
- Composable関数（必要に応じて）

**対象外**:
- UIコンポーネント（Phase 4で実装）
- E2Eテスト（Phase 6で実装）

---

## 2. 機能要件

### 2.1 状態管理

#### FR-1: フォルダ一覧の管理

**説明**: 全フォルダパスのリストを状態として保持する

**データ構造**:
```typescript
interface SavedQueryState {
  // 既存フィールド
  queries: SavedQueryMetadata[]
  selectedTags: string[]
  searchKeyword: string

  // 新規追加
  folders: string[]  // 全フォルダパスのリスト
  expandedFolders: Set<string>  // 展開中のフォルダパス
}
```

**受け入れ条件**:
- [ ] `folders` 配列がフォルダパスのユニークリストを保持する
- [ ] `expandedFolders` が展開中のフォルダを追跡する
- [ ] 状態の初期化時に空の配列・Setが設定される

#### FR-2: ツリー構造の生成

**説明**: フラットなクエリ一覧から階層ツリー構造を生成するGetter

**データ構造**:
```typescript
interface TreeNode {
  type: 'folder' | 'query'
  path: string  // フォルダの場合はfolderPath、クエリの場合はid
  name: string
  children?: TreeNode[]  // フォルダの場合のみ
  query?: SavedQueryMetadata  // クエリの場合のみ
  expanded?: boolean  // フォルダの場合のみ
}
```

**処理フロー**:
1. `folders` 配列からフォルダツリーを構築
2. `queries` を各フォルダノードの `children` に配置
3. `folderPath: null` のクエリはルート直下に配置
4. ソート順: フォルダ→クエリ、各カテゴリ内はアルファベット順

**受け入れ条件**:
- [ ] Getter `queryTree` がツリー構造を返す
- [ ] フォルダが階層化されて表示される
- [ ] ルート直下のクエリが含まれる
- [ ] ソート順が正しい（フォルダ優先、アルファベット順）
- [ ] 展開状態が `expandedFolders` に基づいて設定される

### 2.2 フォルダ操作アクション

#### FR-3: フォルダ一覧取得

**説明**: バックエンドAPIからフォルダ一覧を取得し、状態を更新する

**API呼び出し**:
```typescript
const folders = await queryStorageApi.listFolders()
```

**受け入れ条件**:
- [ ] `fetchFolders()` アクションが実装されている
- [ ] APIからフォルダ一覧を取得して `folders` 状態を更新する
- [ ] エラー時にToast通知を表示する

#### FR-4: クエリの移動

**説明**: クエリを指定フォルダに移動する

**API呼び出し**:
```typescript
await queryStorageApi.moveQuery(queryId, targetFolderPath)
```

**処理フロー**:
1. バックエンドAPIを呼び出してクエリを移動
2. クエリ一覧を再取得（`fetchQueries()`）
3. 成功時にToast通知

**受け入れ条件**:
- [ ] `moveQuery(queryId, folderPath)` アクションが実装されている
- [ ] API呼び出し後にクエリ一覧が更新される
- [ ] 成功/エラー時にToast通知が表示される

#### FR-5: フォルダ名の変更

**説明**: フォルダ名を変更し、配下のクエリのパスも自動更新される

**API呼び出し**:
```typescript
await queryStorageApi.renameFolder(oldPath, newPath)
```

**処理フロー**:
1. フォルダ名の重複チェック（バリデーション）
2. バックエンドAPIを呼び出してフォルダ名を変更
3. フォルダ一覧とクエリ一覧を再取得
4. 成功時にToast通知

**受け入れ条件**:
- [ ] `renameFolder(oldPath, newPath)` アクションが実装されている
- [ ] フォルダ名の重複チェックが行われる
- [ ] API呼び出し後にフォルダ一覧とクエリ一覧が更新される
- [ ] 成功/エラー時にToast通知が表示される

#### FR-6: フォルダの削除

**説明**: 空のフォルダを削除する

**API呼び出し**:
```typescript
await queryStorageApi.deleteFolder(folderPath)
```

**処理フロー**:
1. 空フォルダチェック（配下にクエリがあればエラー）
2. バックエンドAPIを呼び出してフォルダを削除
3. フォルダ一覧を再取得
4. 成功時にToast通知

**受け入れ条件**:
- [ ] `deleteFolder(folderPath)` アクションが実装されている
- [ ] 空フォルダチェックが行われる
- [ ] API呼び出し後にフォルダ一覧が更新される
- [ ] 成功/エラー時にToast通知が表示される

### 2.3 展開状態の管理

#### FR-7: フォルダの展開/折りたたみ

**説明**: フォルダの展開状態を切り替える

**処理内容**:
```typescript
toggleFolderExpansion(folderPath: string) {
  if (this.expandedFolders.has(folderPath)) {
    this.expandedFolders.delete(folderPath)
  } else {
    this.expandedFolders.add(folderPath)
  }
  // LocalStorageに保存
  this.saveExpandedFolders()
}
```

**受け入れ条件**:
- [ ] `toggleFolderExpansion(folderPath)` アクションが実装されている
- [ ] `expandedFolders` が正しく更新される
- [ ] 展開状態がLocalStorageに保存される

#### FR-8: 展開状態の永続化

**説明**: 展開状態をLocalStorageに保存し、アプリ起動時に復元する

**保存処理**:
```typescript
saveExpandedFolders() {
  localStorage.setItem('savedQueryExpandedFolders', JSON.stringify(Array.from(this.expandedFolders)))
}
```

**復元処理**:
```typescript
loadExpandedFolders() {
  const saved = localStorage.getItem('savedQueryExpandedFolders')
  if (saved) {
    this.expandedFolders = new Set(JSON.parse(saved))
  }
}
```

**受け入れ条件**:
- [ ] `saveExpandedFolders()` が実装されている
- [ ] `loadExpandedFolders()` が実装されている
- [ ] ストア初期化時に `loadExpandedFolders()` が呼ばれる
- [ ] 展開状態が正しく復元される

### 2.4 ドラッグ&ドロップロジック

#### FR-9: ドラッグ&ドロップによるクエリ移動

**説明**: UIからドラッグ&ドロップされたクエリを移動する

**処理フロー**:
```typescript
async handleQueryDrop(queryId: string, targetFolderPath: string | null) {
  // バリデーション（クエリ→フォルダのみ許可）
  // moveQuery アクションを呼び出し
}
```

**受け入れ条件**:
- [ ] `handleQueryDrop(queryId, targetFolderPath)` が実装されている
- [ ] ドロップ可否の判定が行われる（クエリ→フォルダのみ許可）
- [ ] `moveQuery` アクションを呼び出してクエリを移動する

---

## 3. 非機能要件

### 3.1 パフォーマンス

**NFR-1: ツリービルドの高速化**
- 1000件のクエリでツリービルドが100ms以内に完了すること
- ツリービルドの結果をキャッシュし、状態変更時のみ再計算すること

**NFR-2: メモ化の活用**
- Getter `queryTree` は計算結果をキャッシュすること
- 不要な再計算を避けるため、依存する状態が変更された時のみ再計算すること

### 3.2 保守性

**NFR-3: 型安全性**
- 全ての状態、アクション、Getterに適切な型定義を付けること
- TypeScriptの`strict`モードでエラーが出ないこと

**NFR-4: エラーハンドリング**
- 全てのAPI呼び出しでtry-catchを使用すること
- エラー時にユーザーフレンドリーなメッセージをToastで表示すること

### 3.3 互換性

**NFR-5: 既存機能との互換性**
- 既存の `fetchQueries()`, `searchQueries()`, `deleteQuery()` が正常に動作すること
- 既存のタグフィルタリング機能が引き続き動作すること

---

## 4. データ構造詳細

### 4.1 SavedQueryState（拡張後）

```typescript
interface SavedQueryState {
  // 既存フィールド
  queries: SavedQueryMetadata[]
  selectedTags: string[]
  searchKeyword: string
  isLoading: boolean

  // 新規追加
  folders: string[]  // 全フォルダパスのリスト（例: ['/開発環境', '/開発環境/ユーザー管理']）
  expandedFolders: Set<string>  // 展開中のフォルダパス
}
```

### 4.2 TreeNode

```typescript
interface TreeNode {
  type: 'folder' | 'query'
  path: string  // フォルダの場合はfolderPath、クエリの場合はid
  name: string
  children?: TreeNode[]  // フォルダの場合のみ（ソート済み）
  query?: SavedQueryMetadata  // クエリの場合のみ
  expanded?: boolean  // フォルダの場合のみ（expandedFoldersから取得）
  queryCount?: number  // フォルダ内のクエリ数（直接の子のみ）
}
```

### 4.3 ツリービルドアルゴリズム

**処理の流れ**:
1. フォルダパスを解析してフォルダツリーを構築
2. 各クエリを対応するフォルダに配置
3. `folderPath: null` のクエリはルート直下に配置
4. ソート（フォルダ優先、アルファベット順）

**疑似コード**:
```typescript
function buildQueryTree(queries: SavedQueryMetadata[], folders: string[], expandedFolders: Set<string>): TreeNode[] {
  const root: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  // 1. フォルダツリーを構築
  for (const folderPath of folders) {
    const parts = folderPath.split('/').filter(Boolean)
    let currentPath = ''
    let parent = root

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

      if (!folderMap.has(currentPath)) {
        const folderNode: TreeNode = {
          type: 'folder',
          path: currentPath,
          name: part,
          children: [],
          expanded: expandedFolders.has(currentPath),
          queryCount: 0
        }
        folderMap.set(currentPath, folderNode)
        parent.push(folderNode)
        parent = folderNode.children!
      } else {
        parent = folderMap.get(currentPath)!.children!
      }
    }
  }

  // 2. クエリを配置
  for (const query of queries) {
    const queryNode: TreeNode = {
      type: 'query',
      path: query.id,
      name: query.name,
      query
    }

    if (query.folderPath) {
      const folder = folderMap.get(query.folderPath)
      if (folder) {
        folder.children!.push(queryNode)
        folder.queryCount = (folder.queryCount || 0) + 1
      } else {
        // フォルダが見つからない場合はルートに配置
        root.push(queryNode)
      }
    } else {
      // folderPath: null の場合はルート直下
      root.push(queryNode)
    }
  }

  // 3. ソート（フォルダ優先、アルファベット順）
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children)
      }
    })
  }
  sortNodes(root)

  return root
}
```

---

## 5. アクション一覧

### 5.1 新規追加アクション

| アクション名 | 引数 | 戻り値 | 説明 |
|------------|-----|-------|------|
| `fetchFolders()` | なし | `Promise<void>` | フォルダ一覧を取得して状態を更新 |
| `moveQuery(queryId, folderPath)` | `queryId: string`, `folderPath: string \| null` | `Promise<void>` | クエリを指定フォルダに移動 |
| `renameFolder(oldPath, newPath)` | `oldPath: string`, `newPath: string` | `Promise<void>` | フォルダ名を変更 |
| `deleteFolder(folderPath)` | `folderPath: string` | `Promise<void>` | 空のフォルダを削除 |
| `toggleFolderExpansion(folderPath)` | `folderPath: string` | `void` | フォルダの展開/折りたたみ |
| `saveExpandedFolders()` | なし | `void` | 展開状態をLocalStorageに保存 |
| `loadExpandedFolders()` | なし | `void` | 展開状態をLocalStorageから復元 |
| `handleQueryDrop(queryId, targetFolderPath)` | `queryId: string`, `targetFolderPath: string \| null` | `Promise<void>` | ドラッグ&ドロップによるクエリ移動 |

### 5.2 新規追加Getter

| Getter名 | 戻り値 | 説明 |
|---------|-------|------|
| `queryTree` | `TreeNode[]` | フラットなクエリ一覧からツリー構造を生成 |
| `getFolderByPath(path)` | `TreeNode \| null` | 指定パスのフォルダノードを取得 |

---

## 6. エラーハンドリング

### 6.1 API呼び出し時のエラー

**エラーケース**:
- ネットワークエラー
- バックエンドAPIエラー
- バリデーションエラー

**処理**:
```typescript
try {
  await queryStorageApi.moveQuery(queryId, folderPath)
  toast.add({ title: 'クエリを移動しました', color: 'green' })
} catch (error) {
  console.error('Failed to move query:', error)
  toast.add({ title: 'クエリの移動に失敗しました', description: error.message, color: 'red' })
}
```

### 6.2 バリデーションエラー

**エラーケース**:
- フォルダ名の重複
- 空でないフォルダの削除
- 不正なフォルダ名（不正文字を含む）

**処理**:
```typescript
// フォルダ名の重複チェック
if (this.folders.includes(newPath)) {
  toast.add({ title: 'フォルダ名が重複しています', color: 'yellow' })
  return
}
```

---

## 7. テスト要件

### 7.1 ユニットテスト

**対象**:
- ツリービルド処理（`queryTree` Getter）
- 各アクション（`moveQuery`, `renameFolder`, `deleteFolder`）
- 展開状態の永続化（`saveExpandedFolders`, `loadExpandedFolders`）

**テストケース例**:
```typescript
describe('saved-query store - folder management', () => {
  it('should build query tree correctly', () => {
    // テスト内容
  })

  it('should move query to folder', async () => {
    // テスト内容
  })

  it('should save and load expanded folders', () => {
    // テスト内容
  })
})
```

### 7.2 統合テスト

**対象**:
- バックエンドAPIとの統合
- 既存機能との互換性

---

## 8. 実装対象ファイル

### 8.1 新規作成

- `app/types/query-tree.ts` - ツリー構造の型定義

### 8.2 変更

- `app/stores/saved-query.ts` - フォルダ管理機能の追加
- `app/types/saved-query.ts` - 必要に応じて型を追加

---

## 9. 依存関係

**前提条件**:
- Phase 1（データモデル設計）完了
- Phase 2（バックエンドAPI実装）完了

**後続フェーズ**:
- Phase 4: UIコンポーネント実装
- Phase 5: SavedQuerySlideover改修
- Phase 6: テスト

---

## 10. 既知の制約

**技術的制約**:
- フォルダ階層の深さは10階層まで
- ツリービルドのパフォーマンス（1000件以上のクエリでの動作）

**スコープ外**:
- フォルダのドラッグ&ドロップ（将来拡張）
- クエリの複数選択による一括移動（将来拡張）

---

## 11. 参考資料

**親要件定義書**:
- [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)
- [Phase 1: データモデル設計](../20260124_data-model-design/requirements.md)
- [Phase 2: バックエンドAPI実装](../20260124_folder-api-implementation/requirements.md)

**ステアリングドキュメント**:
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md)
- [開発ガイドライン](../../steering/05_development_guidelines.md)

**関連ファイル**:
- [app/stores/saved-query.ts](../../../app/stores/saved-query.ts)
- [app/types/saved-query.ts](../../../app/types/saved-query.ts)
