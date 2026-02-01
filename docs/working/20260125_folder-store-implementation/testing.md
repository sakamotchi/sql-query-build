# テスト手順書：保存クエリフォルダ管理 - Phase 3: フロントエンドStore実装

**作成日**: 2026-01-25
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親要件**: [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)

---

## 概要

このドキュメントでは、Phase 3（フロントエンドStore実装）のテスト手順を記載します。

**Phase 3のスコープ**:
- Piniaストアの拡張（フォルダ管理機能の追加）
- ツリー構造ビルド処理
- フォルダ操作アクション
- 展開状態管理

**注意**: Phase 3はストアのロジック実装のため、UI操作による手動テストは**Phase 4（UIコンポーネント実装）で実施**します。Phase 3では主に**自動テスト**と**ブラウザコンソールでの動作確認**を行います。

---

## 前提条件

- `npm run tauri:dev` でアプリが起動していること
- Phase 2のバックエンドAPI実装が完了していること
- 以下のテストデータが準備されていること:
  - フォルダ: `/開発環境`, `/開発環境/ユーザー管理`, `/本番環境`
  - クエリ: 3件以上（各フォルダに1件ずつ、ルート直下に1件）

---

## 自動テスト

### 1. ユニットテスト

**実行コマンド**:
```bash
npm run test:run
```

**対象ファイル**:
- `tests/stores/saved-query.spec.ts`

**テストケース一覧**:

| テストケース | 説明 | 期待結果 |
|------------|------|---------|
| `queryTree` Getter - 基本動作 | フォルダとクエリを正しくツリー構造に変換 | ツリー構造が正しく生成される |
| `queryTree` Getter - ソート | フォルダ優先、アルファベット順でソート | フォルダ→クエリの順、アルファベット順 |
| `queryTree` Getter - 展開状態 | `expandedFolders` から展開状態を設定 | `expanded` フラグが正しく設定される |
| `queryTree` Getter - クエリ数 | フォルダ内のクエリ数をカウント | `queryCount` が正しくカウントされる |
| `queryTree` Getter - ルート直下 | `folderPath: null` のクエリをルート配置 | ルート直下にクエリが配置される |
| `queryTree` Getter - フォルダ不在 | 存在しないフォルダパスのクエリ | ルート直下に配置される |
| `toggleFolderExpansion` | フォルダの展開/折りたたみ切り替え | `expandedFolders` が正しく更新される |
| `saveExpandedFolders` | LocalStorageに展開状態を保存 | `localStorage` に保存される |
| `loadExpandedFolders` | LocalStorageから展開状態を復元 | `expandedFolders` が復元される |
| `moveQuery` | クエリを指定フォルダに移動 | APIが呼ばれ、クエリ一覧が再取得される |
| `renameFolder` | フォルダ名を変更 | APIが呼ばれ、展開状態も更新される |
| `renameFolder` - 重複チェック | 重複するフォルダ名で変更 | バリデーションエラー（Toast通知） |
| `deleteFolder` - 空フォルダ | 空のフォルダを削除 | APIが呼ばれ、展開状態から削除される |
| `deleteFolder` - クエリ含む | クエリが含まれるフォルダを削除 | バリデーションエラー（Toast通知） |
| `handleQueryDrop` | ドラッグ&ドロップでクエリ移動 | `moveQuery` が呼ばれる |
| `handleQueryDrop` - 同一フォルダ | 同じフォルダにドロップ | 何もしない（スキップ） |

**確認結果**:
- [ ] 全テストケースがパス
- [ ] カバレッジが80%以上

---

### 2. 型チェック

**実行コマンド**:
```bash
npm run typecheck
```

**確認事項**:
- [ ] TypeScriptコンパイルエラーがない
- [ ] 新規追加した型定義（`TreeNode`）にエラーがない
- [ ] ストアの状態とアクションに型エラーがない

---

## ブラウザコンソールでの動作確認

Phase 3はUI実装前のため、ブラウザのDevToolsコンソールで直接ストアを操作してテストします。

### 準備

1. `npm run tauri:dev` でアプリを起動
2. ブラウザのDevToolsを開く（F12）
3. Consoleタブを選択

### テストケース

#### TC-1: ストアの初期化

**手順**:
```javascript
// ストアを取得
const { useSavedQueryStore } = await import('/app/stores/saved-query.ts')
const store = useSavedQueryStore()

// 初期状態を確認
console.log('folders:', store.folders)
console.log('expandedFolders:', store.expandedFolders)
```

**期待結果**:
```javascript
folders: []
expandedFolders: Set(0) {}
```

**確認結果**: [ ] OK / [ ] NG

---

#### TC-2: フォルダ一覧の取得

**手順**:
```javascript
await store.fetchFolders()
console.log('folders:', store.folders)
```

**期待結果**:
```javascript
folders: ['/開発環境', '/開発環境/ユーザー管理', '/本番環境']
```

**確認結果**: [ ] OK / [ ] NG

---

#### TC-3: クエリツリーの生成

**手順**:
```javascript
await store.fetchQueries()
console.log('queryTree:', store.queryTree)
```

**期待結果**:
```javascript
// ツリー構造が生成される
[
  {
    type: 'folder',
    name: '開発環境',
    path: '/開発環境',
    children: [
      {
        type: 'folder',
        name: 'ユーザー管理',
        path: '/開発環境/ユーザー管理',
        children: [ /* クエリ */ ]
      }
    ]
  },
  {
    type: 'folder',
    name: '本番環境',
    path: '/本番環境',
    children: [ /* クエリ */ ]
  },
  {
    type: 'query',
    name: 'ルート直下のクエリ',
    // ...
  }
]
```

**確認事項**:
- [ ] フォルダがアルファベット順にソートされている
- [ ] フォルダが先、クエリが後に配置されている
- [ ] `folderPath: null` のクエリがルート直下に配置されている
- [ ] `children` 配列が正しく構築されている

**確認結果**: [ ] OK / [ ] NG

---

#### TC-4: フォルダの展開/折りたたみ

**手順**:
```javascript
// フォルダを展開
store.toggleFolderExpansion('/開発環境')
console.log('expandedFolders:', store.expandedFolders)

// ツリーを確認
const tree = store.queryTree
const devFolder = tree.find(n => n.path === '/開発環境')
console.log('開発環境 expanded:', devFolder.expanded)

// 折りたたみ
store.toggleFolderExpansion('/開発環境')
console.log('expandedFolders:', store.expandedFolders)
```

**期待結果**:
```javascript
// 展開後
expandedFolders: Set(1) {'/開発環境'}
開発環境 expanded: true

// 折りたたみ後
expandedFolders: Set(0) {}
```

**確認結果**: [ ] OK / [ ] NG

---

#### TC-5: 展開状態の永続化

**手順**:
```javascript
// 展開状態を設定
store.toggleFolderExpansion('/開発環境')
store.toggleFolderExpansion('/本番環境')

// LocalStorageに保存
store.saveExpandedFolders()

// LocalStorageを確認
console.log('localStorage:', localStorage.getItem('savedQueryExpandedFolders'))

// 新しいストアインスタンスで復元
location.reload()

// リロード後
const { useSavedQueryStore } = await import('/app/stores/saved-query.ts')
const newStore = useSavedQueryStore()
newStore.loadExpandedFolders()
console.log('expandedFolders:', newStore.expandedFolders)
```

**期待結果**:
```javascript
// 保存
localStorage: '["/開発環境","/本番環境"]'

// 復元
expandedFolders: Set(2) {'/開発環境', '/本番環境'}
```

**確認結果**: [ ] OK / [ ] NG

---

#### TC-6: クエリの移動

**手順**:
```javascript
// クエリIDを確認
const queryId = store.queries[0].id
console.log('移動前 folderPath:', store.queries[0].folderPath)

// クエリを移動
await store.moveQuery(queryId, '/本番環境')

// 移動後を確認
const movedQuery = store.queries.find(q => q.id === queryId)
console.log('移動後 folderPath:', movedQuery.folderPath)
```

**期待結果**:
```javascript
移動前 folderPath: null
移動後 folderPath: '/本番環境'
```

**確認事項**:
- [ ] Toast通知が表示される（「クエリを移動しました」）
- [ ] `isLoading` が正しく制御される

**確認結果**: [ ] OK / [ ] NG

---

#### TC-7: フォルダ名の変更

**手順**:
```javascript
// フォルダ名を変更
await store.renameFolder('/開発環境', '/開発')

// フォルダ一覧を確認
console.log('folders:', store.folders)

// クエリのfolderPathが更新されているか確認
const queriesInFolder = store.queries.filter(q => q.folderPath?.startsWith('/開発'))
console.log('queriesInFolder:', queriesInFolder.map(q => q.folderPath))
```

**期待結果**:
```javascript
folders: ['/開発', '/開発/ユーザー管理', '/本番環境']
queriesInFolder: ['/開発', '/開発/ユーザー管理']
```

**確認事項**:
- [ ] Toast通知が表示される（「フォルダ名を変更しました」）
- [ ] 展開状態が新しいパスに更新される

**確認結果**: [ ] OK / [ ] NG

---

#### TC-8: フォルダ名の重複チェック

**手順**:
```javascript
// 既存のフォルダ名に変更しようとする
await store.renameFolder('/本番環境', '/開発')

// フォルダ一覧を確認（変更されていないこと）
console.log('folders:', store.folders)
```

**期待結果**:
- Toast通知が表示される（「フォルダ名が重複しています」）
- フォルダ一覧は変更されない

**確認結果**: [ ] OK / [ ] NG

---

#### TC-9: 空フォルダの削除

**手順**:
```javascript
// まず、クエリが含まれていないフォルダを確認
const emptyFolder = store.folders.find(f => {
  return !store.queries.some(q => q.folderPath === f || q.folderPath?.startsWith(`${f}/`))
})

if (emptyFolder) {
  console.log('空フォルダ:', emptyFolder)
  await store.deleteFolder(emptyFolder)
  console.log('削除後 folders:', store.folders)
} else {
  console.log('空フォルダが存在しません。テスト用に作成が必要です。')
}
```

**期待結果**:
- Toast通知が表示される（「フォルダを削除しました」）
- `folders` から削除されている
- `expandedFolders` からも削除されている

**確認結果**: [ ] OK / [ ] NG

---

#### TC-10: クエリを含むフォルダの削除（バリデーション）

**手順**:
```javascript
// クエリが含まれるフォルダを削除しようとする
const folderWithQueries = store.queries[0].folderPath
if (folderWithQueries) {
  await store.deleteFolder(folderWithQueries)
  console.log('folders:', store.folders)
}
```

**期待結果**:
- Toast通知が表示される（「フォルダを削除できません」「フォルダ内にX件のクエリが含まれています」）
- `folders` は変更されない

**確認結果**: [ ] OK / [ ] NG

---

#### TC-11: handleQueryDrop

**手順**:
```javascript
const queryId = store.queries[0].id
console.log('移動前 folderPath:', store.queries[0].folderPath)

// ドロップをシミュレート
await store.handleQueryDrop(queryId, '/本番環境')

// 移動後を確認
const droppedQuery = store.queries.find(q => q.id === queryId)
console.log('移動後 folderPath:', droppedQuery.folderPath)
```

**期待結果**:
```javascript
移動前 folderPath: null (または別のパス)
移動後 folderPath: '/本番環境'
```

**確認結果**: [ ] OK / [ ] NG

---

#### TC-12: 同じフォルダへのドロップ（スキップ）

**手順**:
```javascript
const queryId = store.queries[0].id
const currentFolder = store.queries[0].folderPath

// 同じフォルダにドロップ
await store.handleQueryDrop(queryId, currentFolder)
```

**期待結果**:
- 何も起こらない（APIが呼ばれない）
- Toast通知も表示されない

**確認結果**: [ ] OK / [ ] NG

---

## パフォーマンステスト

### PT-1: ツリービルドのパフォーマンス

**目的**: 1000件のクエリでツリービルドが100ms以内に完了することを確認

**手順**:
```javascript
// テストデータを準備（モック）
store.folders = Array.from({ length: 100 }, (_, i) => `/folder${i}`)
store.queries = Array.from({ length: 1000 }, (_, i) => ({
  id: `q${i}`,
  name: `Query ${i}`,
  folderPath: `/folder${i % 100}`,
  // ... 他のフィールド
}))

// パフォーマンス計測
console.time('queryTree build')
const tree = store.queryTree
console.timeEnd('queryTree build')

console.log('ツリーノード数:', tree.length)
```

**期待結果**:
```
queryTree build: 50ms (100ms以内)
ツリーノード数: 100
```

**確認結果**: [ ] OK / [ ] NG

---

## エッジケース

| ケース | 操作 | 期待動作 | 確認結果 |
|--------|-----|---------|---------|
| 空のフォルダ一覧 | `folders: []` でツリー生成 | ルート直下のクエリのみ表示 | [ ] |
| 空のクエリ一覧 | `queries: []` でツリー生成 | フォルダのみ表示 | [ ] |
| 深いネスト | 10階層のフォルダパス | 正しくツリーが生成される | [ ] |
| 不正なフォルダパス | クエリの`folderPath`がフォルダ一覧に存在しない | ルート直下に配置 | [ ] |
| LocalStorageエラー | LocalStorageが無効な環境 | エラーが発生せず、展開状態が保存されないだけ | [ ] |
| Set型のシリアライズ | `expandedFolders` のLocalStorage保存/復元 | 正しく配列⇔Setの変換が行われる | [ ] |

---

## 回帰テスト

既存機能への影響がないことを確認します。

### RT-1: 既存のクエリ管理機能

**確認事項**:
- [ ] `fetchQueries()` が正常に動作する
- [ ] `saveCurrentQuery()` が正常に動作する
- [ ] `deleteQuery()` が正常に動作する
- [ ] `setSearchKeyword()` が正常に動作する
- [ ] `setSelectedTags()` が正常に動作する
- [ ] 既存のユニットテストが全てパスする

**手順**:
```bash
npm run test:run
```

**確認結果**: [ ] OK / [ ] NG

---

### RT-2: 既存の型定義との互換性

**確認事項**:
- [ ] `SavedQueryMetadata` に `folderPath` が追加されている
- [ ] 既存のコードで型エラーが発生していない

**手順**:
```bash
npm run typecheck
```

**確認結果**: [ ] OK / [ ] NG

---

## テスト完了チェックリスト

- [ ] 全ユニットテストがパス
- [ ] 型チェックエラーなし
- [ ] ブラウザコンソールでの動作確認（TC-1 〜 TC-12）が全て完了
- [ ] パフォーマンステスト（PT-1）が基準を満たす
- [ ] エッジケースが全て確認済み
- [ ] 回帰テスト（RT-1, RT-2）が全て完了
- [ ] 設計書の実装チェックリストが全て完了

---

## 備考

**Phase 4との連携**:
- Phase 4（UIコンポーネント実装）では、実際のUI操作による手動テストを実施します。
- Phase 3で実装したストアの機能がUIから正しく呼び出されることを確認します。

**テストデータ準備**:
- Phase 2のバックエンドAPIを使用して、テスト用のフォルダとクエリを作成してください。
- Rustのテストコードでテストデータを生成することも可能です。

**トラブルシューティング**:
- ブラウザコンソールでエラーが発生した場合は、DevToolsのNetworkタブでAPI呼び出しを確認してください。
- LocalStorageのテストで問題が発生した場合は、ApplicationタブでLocalStorageの内容を確認してください。
