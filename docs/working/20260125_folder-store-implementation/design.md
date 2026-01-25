# 設計書：保存クエリフォルダ管理 - Phase 3: フロントエンドStore実装

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 設計中
**親要件**: [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)

---

## 1. アーキテクチャ

### 1.1 対象コンポーネント

```
UIコンポーネント（Phase 4で実装）
    ↓
Pinia Store (saved-query.ts) ← Phase 3で実装
    ↓ queryStorageApi
Tauri API
    ↓
Rust Backend (Phase 2で実装済み)
    ↓
JSON File Storage
```

### 1.2 影響範囲

**フロントエンド**:
- `app/stores/saved-query.ts` - フォルダ管理機能の追加
- `app/types/query-tree.ts` - 新規作成（ツリー構造の型定義）
- `app/types/saved-query.ts` - 必要に応じて型を追加

**バックエンド**:
- 影響なし（Phase 2で実装済み）

**永続化ドキュメント**:
- `docs/steering/06_ubiquitous_language.md` - フォルダ管理関連の用語を追加

---

## 2. 実装方針

### 2.1 概要

Phase 2で実装済みのバックエンドAPIを活用し、フロントエンドのPiniaストアにフォルダ管理機能を追加します。主な実装内容は以下の通りです：

1. **状態拡張**: `SavedQueryState` にフォルダ関連の状態を追加
2. **ツリービルド**: フラットなクエリ一覧から階層ツリーを生成するGetter
3. **フォルダ操作**: CRUD操作とクエリ移動のアクション
4. **展開状態管理**: LocalStorageによる展開状態の永続化
5. **ドラッグ&ドロップ**: UI層から呼び出されるドロップハンドラ

### 2.2 設計原則

- **単一責任**: Storeはビジネスロジックのみ、UI操作はコンポーネント側
- **型安全**: 全ての状態・アクション・Getterに型定義
- **パフォーマンス**: ツリービルドはGetterでメモ化、不要な再計算を避ける
- **エラーハンドリング**: 全てのAPI呼び出しでtry-catch、ユーザーフレンドリーなエラーメッセージ
- **互換性**: 既存の機能（タグフィルタ、検索等）は変更しない

### 2.3 実装ステップ

1. **型定義の追加** (`app/types/query-tree.ts`)
   - `TreeNode` インターフェース定義
2. **状態の拡張** (`app/stores/saved-query.ts`)
   - `folders`, `expandedFolders` を追加
3. **Getterの実装**
   - `queryTree` - ツリー構造生成
   - `getFolderByPath` - パスからフォルダノード取得
4. **アクションの実装**
   - フォルダCRUD操作
   - クエリ移動
   - 展開状態管理
5. **テストコード作成**

---

## 3. データ構造

### 3.1 型定義（TypeScript）

#### 3.1.1 TreeNode（新規）

**ファイル**: `app/types/query-tree.ts`

```typescript
/**
 * ツリービューのノードを表す型
 */
export interface TreeNode {
  /**
   * ノードのタイプ
   */
  type: 'folder' | 'query'

  /**
   * ノードのパス
   * - フォルダの場合: folderPath（例: "/開発環境/ユーザー管理"）
   * - クエリの場合: id
   */
  path: string

  /**
   * ノードの表示名
   */
  name: string

  /**
   * 子ノード（フォルダの場合のみ）
   * ソート済み（フォルダ優先、アルファベット順）
   */
  children?: TreeNode[]

  /**
   * クエリメタデータ（クエリの場合のみ）
   */
  query?: SavedQueryMetadata

  /**
   * 展開状態（フォルダの場合のみ）
   */
  expanded?: boolean

  /**
   * フォルダ内のクエリ数（フォルダの場合のみ、直接の子のみカウント）
   */
  queryCount?: number
}
```

#### 3.1.2 SavedQueryState（拡張）

**ファイル**: `app/stores/saved-query.ts`

```typescript
interface SavedQueryState {
  // 既存フィールド
  queries: SavedQueryMetadata[]
  isLoading: boolean
  error: string | null
  searchKeyword: string
  selectedTags: string[]

  // 新規追加
  /**
   * 全フォルダパスのリスト
   * 例: ['/開発環境', '/開発環境/ユーザー管理', '/本番環境']
   */
  folders: string[]

  /**
   * 展開中のフォルダパスのSet
   * LocalStorageと同期される
   */
  expandedFolders: Set<string>
}
```

---

## 4. ツリービルドアルゴリズム

### 4.1 処理フロー

```
1. フォルダパスを解析してフォルダツリーを構築
   ↓
2. 各クエリを対応するフォルダに配置
   ↓
3. folderPath: null のクエリはルート直下に配置
   ↓
4. 再帰的にソート（フォルダ優先、アルファベット順）
   ↓
5. 展開状態を設定（expandedFolders から取得）
```

### 4.2 実装コード

**ファイル**: `app/stores/saved-query.ts`

```typescript
getters: {
  /**
   * フラットなクエリ一覧から階層ツリー構造を生成
   */
  queryTree(): TreeNode[] {
    const root: TreeNode[] = []
    const folderMap = new Map<string, TreeNode>()

    // 1. フォルダツリーを構築
    for (const folderPath of this.folders) {
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
            expanded: this.expandedFolders.has(currentPath),
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
    for (const query of this.queries) {
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
  },

  /**
   * 指定パスのフォルダノードを取得
   */
  getFolderByPath(): (path: string) => TreeNode | null {
    return (path: string) => {
      const findFolder = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
          if (node.type === 'folder' && node.path === path) {
            return node
          }
          if (node.children) {
            const found = findFolder(node.children)
            if (found) return found
          }
        }
        return null
      }
      return findFolder(this.queryTree)
    }
  }
}
```

### 4.3 計算量

- **時間計算量**: O(F + Q)
  - F: フォルダ数
  - Q: クエリ数
  - フォルダツリー構築: O(F)
  - クエリ配置: O(Q)
  - ソート: O((F + Q) log(F + Q))
- **空間計算量**: O(F + Q)
  - folderMap: O(F)
  - ツリー構造: O(F + Q)

---

## 5. アクション設計

### 5.1 フォルダ一覧取得

**アクション名**: `fetchFolders`

```typescript
/**
 * フォルダ一覧を取得して状態を更新
 */
async fetchFolders(): Promise<void> {
  try {
    this.folders = await queryStorageApi.listFolders()
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('Failed to fetch folders:', e)

    // エラー通知（useToast を使用）
    const toast = useToast()
    toast.add({
      title: 'フォルダ一覧の取得に失敗しました',
      description: error,
      color: 'red'
    })
  }
}
```

### 5.2 クエリ移動

**アクション名**: `moveQuery`

```typescript
/**
 * クエリを指定フォルダに移動
 * @param queryId - 移動するクエリのID
 * @param targetFolderPath - 移動先フォルダパス（nullの場合はルート直下）
 */
async moveQuery(queryId: string, targetFolderPath: string | null): Promise<void> {
  this.isLoading = true
  this.error = null

  try {
    await queryStorageApi.moveQuery(queryId, targetFolderPath)

    // クエリ一覧を再取得して状態を更新
    await this.fetchQueries({
      keyword: this.searchKeyword,
      tags: this.selectedTags
    })

    // 成功通知
    const toast = useToast()
    toast.add({
      title: 'クエリを移動しました',
      color: 'green'
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.error = error
    console.error('Failed to move query:', e)

    // エラー通知
    const toast = useToast()
    toast.add({
      title: 'クエリの移動に失敗しました',
      description: error,
      color: 'red'
    })
  } finally {
    this.isLoading = false
  }
}
```

### 5.3 フォルダ名変更

**アクション名**: `renameFolder`

```typescript
/**
 * フォルダ名を変更
 * @param oldPath - 変更前のフォルダパス
 * @param newPath - 変更後のフォルダパス
 */
async renameFolder(oldPath: string, newPath: string): Promise<void> {
  // バリデーション: フォルダ名の重複チェック
  if (this.folders.includes(newPath)) {
    const toast = useToast()
    toast.add({
      title: 'フォルダ名が重複しています',
      description: `「${newPath}」は既に存在します`,
      color: 'yellow'
    })
    return
  }

  this.isLoading = true
  this.error = null

  try {
    await queryStorageApi.renameFolder(oldPath, newPath)

    // フォルダ一覧とクエリ一覧を再取得
    await Promise.all([
      this.fetchFolders(),
      this.fetchQueries({
        keyword: this.searchKeyword,
        tags: this.selectedTags
      })
    ])

    // 展開状態を更新（旧パスを新パスに置換）
    if (this.expandedFolders.has(oldPath)) {
      this.expandedFolders.delete(oldPath)
      this.expandedFolders.add(newPath)
      this.saveExpandedFolders()
    }

    // 成功通知
    const toast = useToast()
    toast.add({
      title: 'フォルダ名を変更しました',
      color: 'green'
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.error = error
    console.error('Failed to rename folder:', e)

    // エラー通知
    const toast = useToast()
    toast.add({
      title: 'フォルダ名の変更に失敗しました',
      description: error,
      color: 'red'
    })
  } finally {
    this.isLoading = false
  }
}
```

### 5.4 フォルダ削除

**アクション名**: `deleteFolder`

```typescript
/**
 * 空のフォルダを削除
 * @param folderPath - 削除するフォルダパス
 */
async deleteFolder(folderPath: string): Promise<void> {
  // バリデーション: 空フォルダチェック
  const queriesInFolder = this.queries.filter(q =>
    q.folderPath === folderPath || q.folderPath?.startsWith(`${folderPath}/`)
  )

  if (queriesInFolder.length > 0) {
    const toast = useToast()
    toast.add({
      title: 'フォルダを削除できません',
      description: `フォルダ内に${queriesInFolder.length}件のクエリが含まれています`,
      color: 'yellow'
    })
    return
  }

  this.isLoading = true
  this.error = null

  try {
    await queryStorageApi.deleteFolder(folderPath)

    // フォルダ一覧を再取得
    await this.fetchFolders()

    // 展開状態から削除
    this.expandedFolders.delete(folderPath)
    this.saveExpandedFolders()

    // 成功通知
    const toast = useToast()
    toast.add({
      title: 'フォルダを削除しました',
      color: 'green'
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    this.error = error
    console.error('Failed to delete folder:', e)

    // エラー通知
    const toast = useToast()
    toast.add({
      title: 'フォルダの削除に失敗しました',
      description: error,
      color: 'red'
    })
  } finally {
    this.isLoading = false
  }
}
```

### 5.5 展開状態管理

#### toggleFolderExpansion

```typescript
/**
 * フォルダの展開/折りたたみを切り替え
 * @param folderPath - 対象フォルダパス
 */
toggleFolderExpansion(folderPath: string): void {
  if (this.expandedFolders.has(folderPath)) {
    this.expandedFolders.delete(folderPath)
  } else {
    this.expandedFolders.add(folderPath)
  }

  // LocalStorageに保存
  this.saveExpandedFolders()
}
```

#### saveExpandedFolders

```typescript
/**
 * 展開状態をLocalStorageに保存
 */
saveExpandedFolders(): void {
  try {
    const expanded = Array.from(this.expandedFolders)
    localStorage.setItem('savedQueryExpandedFolders', JSON.stringify(expanded))
  } catch (e) {
    console.error('Failed to save expanded folders:', e)
  }
}
```

#### loadExpandedFolders

```typescript
/**
 * 展開状態をLocalStorageから復元
 */
loadExpandedFolders(): void {
  try {
    const saved = localStorage.getItem('savedQueryExpandedFolders')
    if (saved) {
      const expanded = JSON.parse(saved) as string[]
      this.expandedFolders = new Set(expanded)
    }
  } catch (e) {
    console.error('Failed to load expanded folders:', e)
    this.expandedFolders = new Set()
  }
}
```

### 5.6 ドラッグ&ドロップハンドラ

```typescript
/**
 * ドラッグ&ドロップによるクエリ移動
 * @param queryId - 移動するクエリのID
 * @param targetFolderPath - ドロップ先フォルダパス
 */
async handleQueryDrop(queryId: string, targetFolderPath: string | null): Promise<void> {
  // バリデーション: クエリが存在するか
  const query = this.queries.find(q => q.id === queryId)
  if (!query) {
    console.error('Query not found:', queryId)
    return
  }

  // 同じフォルダにドロップした場合は何もしない
  if (query.folderPath === targetFolderPath) {
    return
  }

  // moveQuery アクションを呼び出し
  await this.moveQuery(queryId, targetFolderPath)
}
```

---

## 6. ストア初期化の変更

### 6.1 state の初期化

```typescript
state: (): SavedQueryState => ({
  queries: [],
  isLoading: false,
  error: null,
  searchKeyword: '',
  selectedTags: [],

  // 新規追加
  folders: [],
  expandedFolders: new Set()
})
```

### 6.2 初期化処理（ストア作成時）

Piniaストアの初期化は、コンポーネントが初回でストアを使用する際に自動的に行われます。
展開状態の復元は、ツリービューコンポーネントの`onMounted`で呼び出します。

**コンポーネント側での呼び出し例**:
```typescript
// SavedQuerySlideover.vue または SavedQueryTreeView.vue
import { onMounted } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'

const savedQueryStore = useSavedQueryStore()

onMounted(async () => {
  // 展開状態を復元
  savedQueryStore.loadExpandedFolders()

  // フォルダ一覧とクエリ一覧を取得
  await Promise.all([
    savedQueryStore.fetchFolders(),
    savedQueryStore.fetchQueries()
  ])
})
```

---

## 7. エラーハンドリング

### 7.1 API呼び出しエラー

全てのAPI呼び出しで以下のパターンを使用：

```typescript
try {
  await queryStorageApi.someMethod()
  // 成功時の処理
  const toast = useToast()
  toast.add({ title: '成功しました', color: 'green' })
} catch (e) {
  const error = e instanceof Error ? e.message : String(e)
  this.error = error
  console.error('Failed to do something:', e)

  const toast = useToast()
  toast.add({
    title: '操作に失敗しました',
    description: error,
    color: 'red'
  })
}
```

### 7.2 LocalStorage エラー

LocalStorageへのアクセスエラーは無視（展開状態が保存されないだけでアプリは動作）：

```typescript
try {
  localStorage.setItem('key', 'value')
} catch (e) {
  console.error('Failed to save to localStorage:', e)
  // エラー通知は不要（ユーザー体験に影響が少ない）
}
```

---

## 8. パフォーマンス最適化

### 8.1 Getterのメモ化

Piniaの Getter は自動的にメモ化されるため、依存する状態（`queries`, `folders`, `expandedFolders`）が変更されない限り再計算されません。

### 8.2 大量データ対応

1000件以上のクエリでもツリービルドが高速に動作するよう、以下を実施：

- **アルゴリズム**: O(F + Q) の線形時間アルゴリズム
- **Map使用**: フォルダ検索を O(1) に
- **仮想スクロール**: UI層でのレンダリング最適化（Phase 4で実装）

---

## 9. テストコード

### 9.1 ユニットテスト（Vitest）

**ファイル**: `tests/stores/saved-query.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSavedQueryStore } from '@/stores/saved-query'
import type { SavedQueryMetadata } from '@/types/saved-query'

// モック
vi.mock('@/api/query-storage', () => ({
  queryStorageApi: {
    listFolders: vi.fn(),
    moveQuery: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    searchSavedQueries: vi.fn()
  }
}))

describe('useSavedQueryStore - フォルダ管理機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('queryTree Getter', () => {
    it('フォルダとクエリを正しくツリー構造に変換する', () => {
      const store = useSavedQueryStore()

      // テストデータ
      store.folders = ['/開発環境', '/開発環境/ユーザー管理', '/本番環境']
      store.queries = [
        {
          id: 'q1',
          name: 'Query 1',
          folderPath: '/開発環境/ユーザー管理',
          // ... 他のフィールド
        } as SavedQueryMetadata,
        {
          id: 'q2',
          name: 'Query 2',
          folderPath: null,
          // ... 他のフィールド
        } as SavedQueryMetadata
      ]

      const tree = store.queryTree

      // ルート直下に2つのノード（フォルダ2つ、クエリ1つ、合計3つ）
      expect(tree.length).toBe(3)

      // フォルダが先にソートされている
      expect(tree[0].type).toBe('folder')
      expect(tree[0].name).toBe('開発環境')
      expect(tree[1].type).toBe('folder')
      expect(tree[1].name).toBe('本番環境')

      // ルート直下のクエリ
      expect(tree[2].type).toBe('query')
      expect(tree[2].name).toBe('Query 2')

      // ネストしたフォルダ
      const devFolder = tree[0]
      expect(devFolder.children?.length).toBe(1)
      expect(devFolder.children![0].name).toBe('ユーザー管理')

      // ユーザー管理フォルダ内のクエリ
      const userMgmtFolder = devFolder.children![0]
      expect(userMgmtFolder.children?.length).toBe(1)
      expect(userMgmtFolder.children![0].name).toBe('Query 1')
    })

    it('展開状態が正しく設定される', () => {
      const store = useSavedQueryStore()

      store.folders = ['/開発環境']
      store.expandedFolders = new Set(['/開発環境'])

      const tree = store.queryTree

      expect(tree[0].expanded).toBe(true)
    })

    it('フォルダ内のクエリ数をカウントする', () => {
      const store = useSavedQueryStore()

      store.folders = ['/開発環境']
      store.queries = [
        { id: 'q1', folderPath: '/開発環境' } as SavedQueryMetadata,
        { id: 'q2', folderPath: '/開発環境' } as SavedQueryMetadata
      ]

      const tree = store.queryTree

      expect(tree[0].queryCount).toBe(2)
    })
  })

  describe('toggleFolderExpansion', () => {
    it('フォルダの展開状態を切り替える', () => {
      const store = useSavedQueryStore()

      store.toggleFolderExpansion('/開発環境')
      expect(store.expandedFolders.has('/開発環境')).toBe(true)

      store.toggleFolderExpansion('/開発環境')
      expect(store.expandedFolders.has('/開発環境')).toBe(false)
    })
  })

  describe('saveExpandedFolders / loadExpandedFolders', () => {
    it('展開状態をLocalStorageに保存・復元できる', () => {
      const store = useSavedQueryStore()

      store.expandedFolders = new Set(['/開発環境', '/本番環境'])
      store.saveExpandedFolders()

      // 新しいストアインスタンスを作成
      const newStore = useSavedQueryStore()
      newStore.loadExpandedFolders()

      expect(newStore.expandedFolders.has('/開発環境')).toBe(true)
      expect(newStore.expandedFolders.has('/本番環境')).toBe(true)
    })
  })

  describe('moveQuery', () => {
    it('クエリを移動できる', async () => {
      const { queryStorageApi } = await import('@/api/query-storage')
      const store = useSavedQueryStore()

      vi.mocked(queryStorageApi.moveQuery).mockResolvedValue()
      vi.mocked(queryStorageApi.searchSavedQueries).mockResolvedValue([])

      await store.moveQuery('q1', '/開発環境')

      expect(queryStorageApi.moveQuery).toHaveBeenCalledWith('q1', '/開発環境')
      expect(queryStorageApi.searchSavedQueries).toHaveBeenCalled()
    })
  })

  describe('deleteFolder', () => {
    it('空のフォルダを削除できる', async () => {
      const { queryStorageApi } = await import('@/api/query-storage')
      const store = useSavedQueryStore()

      store.queries = []
      vi.mocked(queryStorageApi.deleteFolder).mockResolvedValue()
      vi.mocked(queryStorageApi.listFolders).mockResolvedValue([])

      await store.deleteFolder('/開発環境')

      expect(queryStorageApi.deleteFolder).toHaveBeenCalledWith('/開発環境')
      expect(queryStorageApi.listFolders).toHaveBeenCalled()
    })

    it('クエリが含まれるフォルダは削除できない', async () => {
      const store = useSavedQueryStore()

      store.queries = [
        { id: 'q1', folderPath: '/開発環境' } as SavedQueryMetadata
      ]

      await store.deleteFolder('/開発環境')

      // APIが呼ばれていないことを確認
      const { queryStorageApi } = await import('@/api/query-storage')
      expect(queryStorageApi.deleteFolder).not.toHaveBeenCalled()
    })
  })
})
```

---

## 10. 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| ツリー構造をGetterで生成 | 状態は正規化されたフラットな構造を保ち、表示用のツリーは計算で生成することで、状態の同期問題を回避 | 状態としてツリー構造を保持（同期が複雑） |
| Set型で展開状態を管理 | パスの存在チェックがO(1)で高速、重複も自動的に防げる | 配列で管理（検索がO(n)） |
| LocalStorageで展開状態を永続化 | サーバー側にユーザー設定を保存する必要がなく、シンプル | サーバー側で管理（複雑、Phase 1のスコープ外） |
| フォルダ削除時に空チェック | ユーザーの誤操作を防ぐ | 確認ダイアログのみ（データ損失のリスク） |
| Toast通知を使用 | Nuxt UIの標準コンポーネントで統一されたUX | 独自のエラー表示UI |

---

## 11. 未解決事項

- [ ] フォルダのドラッグ&ドロップ（Phase 1ではスコープ外、将来拡張として検討）
- [ ] クエリの複数選択による一括移動（Phase 1ではスコープ外、将来拡張として検討）
- [ ] フォルダのインポート/エクスポート（Phase 1ではスコープ外、将来拡張として検討）

---

## 12. 実装チェックリスト

- [ ] `app/types/query-tree.ts` の作成
- [ ] `app/stores/saved-query.ts` の状態拡張
- [ ] `queryTree` Getter の実装
- [ ] `getFolderByPath` Getter の実装
- [ ] `fetchFolders` アクションの実装
- [ ] `moveQuery` アクションの実装
- [ ] `renameFolder` アクションの実装
- [ ] `deleteFolder` アクションの実装
- [ ] `toggleFolderExpansion` アクションの実装
- [ ] `saveExpandedFolders` アクションの実装
- [ ] `loadExpandedFolders` アクションの実装
- [ ] `handleQueryDrop` アクションの実装
- [ ] ユニットテストの実装
- [ ] 既存機能の互換性確認

---

## 付録A: API呼び出し一覧

| API関数 | 呼び出し元アクション | 用途 |
|---------|-------------------|------|
| `queryStorageApi.listFolders()` | `fetchFolders` | フォルダ一覧取得 |
| `queryStorageApi.moveQuery(id, path)` | `moveQuery` | クエリ移動 |
| `queryStorageApi.renameFolder(old, new)` | `renameFolder` | フォルダ名変更 |
| `queryStorageApi.deleteFolder(path)` | `deleteFolder` | フォルダ削除 |
| `queryStorageApi.searchSavedQueries(req)` | `fetchQueries` | クエリ検索（既存） |

---

## 付録B: 状態遷移図

```
[初期状態]
  ↓ loadExpandedFolders()
[展開状態復元]
  ↓ fetchFolders() + fetchQueries()
[フォルダ・クエリ読み込み完了]
  ↓ toggleFolderExpansion()
[展開/折りたたみ]
  ↓ saveExpandedFolders()
[LocalStorage保存]
  ↓ moveQuery() / renameFolder() / deleteFolder()
[フォルダ操作]
  ↓ fetchFolders() + fetchQueries()
[状態再取得]
```
