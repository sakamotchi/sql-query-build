# テスト手順書：保存クエリフォルダ管理 - Phase 2: バックエンドAPI実装

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親ドキュメント**: [requirements.md](requirements.md) | [design.md](design.md) | [tasklist.md](tasklist.md)

---

## 1. テスト概要

### 1.1 テスト目的

Phase 2で実装したバックエンドAPIが要件通りに動作することを確認する。

**テスト対象**:
- フォルダ一覧取得API (`list_folders`)
- クエリ移動API (`move_query`)
- フォルダ名変更API (`rename_folder`)
- フォルダ削除API (`delete_folder`)
- 検索API拡張 (`search_saved_queries`にfolderPathフィルタ追加)
- 既存APIの互換性

### 1.2 テストレベル

| テストレベル | 対象 | 実施方法 |
|------------|------|---------|
| 単体テスト（Rust） | Service層、Command層 | 自動テスト（`cargo test`） |
| 統合テスト（TypeScript） | API呼び出し | 自動テスト（Vitest） |
| 手動テスト | API動作確認 | ブラウザコンソール |
| 互換性テスト | 既存API動作確認 | 自動テスト + 手動テスト |

### 1.3 テスト環境

- **開発環境**: ローカルマシン
- **実行コマンド**:
  - Rustテスト: `cd src-tauri && cargo test`
  - TypeScriptテスト: `npm run test`
  - Tauriアプリ起動: `npm run tauri:dev`

---

## 2. 単体テスト（Rust）

### 2.1 list_folders テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_list_folders`

**テスト内容**:
1. 3つのクエリを保存（2つの異なるフォルダ + 1つのサブフォルダ）
2. `list_folders()` を呼び出し
3. 結果が3つのフォルダを含むことを確認

**期待結果**:
```rust
assert_eq!(folders.len(), 3);
assert!(folders.contains(&"/開発環境".to_string()));
assert!(folders.contains(&"/開発環境/ユーザー管理".to_string()));
assert!(folders.contains(&"/本番環境".to_string()));
```

**実行方法**:
```bash
cd src-tauri
cargo test test_list_folders
```

**合格基準**:
- [ ] テストがパスする
- [ ] フォルダ一覧が正しく返される
- [ ] 重複が除外される
- [ ] ソートされている

---

### 2.2 move_query テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_move_query`

**テスト内容**:
1. クエリを `/開発環境` フォルダに保存
2. `move_query()` で `/本番環境` に移動
3. クエリを読み込んで `folder_path` を確認

**期待結果**:
```rust
assert_eq!(loaded.folder_path, Some("/本番環境".to_string()));
```

**実行方法**:
```bash
cd src-tauri
cargo test test_move_query
```

**合格基準**:
- [ ] テストがパスする
- [ ] クエリが移動される
- [ ] `updated_at` が更新される

---

### 2.3 rename_folder テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_rename_folder`

**テスト内容**:
1. 2つのクエリを保存（`/開発環境` と `/開発環境/ユーザー管理`）
2. `rename_folder("/開発環境", "/Dev")` を実行
3. 両方のクエリを読み込んで `folder_path` を確認

**期待結果**:
```rust
assert_eq!(loaded1.folder_path, Some("/Dev".to_string()));
assert_eq!(loaded2.folder_path, Some("/Dev/ユーザー管理".to_string()));
```

**実行方法**:
```bash
cd src-tauri
cargo test test_rename_folder
```

**合格基準**:
- [ ] テストがパスする
- [ ] フォルダ名が変更される
- [ ] 配下のクエリのパスも更新される
- [ ] `updated_at` が更新される

---

### 2.4 delete_folder テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_delete_folder_empty`, `test_delete_folder_with_queries`

**テスト内容**:
1. **空フォルダ削除**: `delete_folder()` が成功することを確認
2. **クエリ含むフォルダ削除**: エラーが返されることを確認

**期待結果**:
```rust
// 空フォルダ
let result = query_storage.delete_folder("/開発環境");
assert!(result.is_ok());

// クエリ含むフォルダ
let result = query_storage.delete_folder("/開発環境");
assert!(result.is_err());
```

**実行方法**:
```bash
cd src-tauri
cargo test test_delete_folder
```

**合格基準**:
- [ ] 両方のテストがパスする
- [ ] 空フォルダは削除できる
- [ ] クエリ含むフォルダはエラーになる

---

### 2.5 search_queries (folder_path) テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_search_queries_with_folder_path`

**テスト内容**:
1. 異なるフォルダに2つのクエリを保存
2. `search_queries()` で `folder_path: "/開発環境"` を指定
3. 1つのクエリのみが返されることを確認

**期待結果**:
```rust
assert_eq!(results.len(), 1);
assert_eq!(results[0].name, "Query1");
```

**実行方法**:
```bash
cd src-tauri
cargo test test_search_queries_with_folder_path
```

**合格基準**:
- [ ] テストがパスする
- [ ] `folder_path` フィルタが正しく動作する

---

### 2.6 後方互換性テスト

**テストファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**テストケース**: `test_backward_compatibility`

**テスト内容**:
1. `folder_path` フィールドなしのJSONを直接書き込み
2. `load_query()` で読み込み
3. `folder_path` が `None` として扱われることを確認

**期待結果**:
```rust
assert_eq!(loaded.folder_path, None);
assert_eq!(loaded.name, "Old Query");
```

**実行方法**:
```bash
cd src-tauri
cargo test test_backward_compatibility
```

**合格基準**:
- [ ] テストがパスする
- [ ] 既存のJSONファイルが正常に読み込める

---

### 2.7 全単体テスト実行

**実行方法**:
```bash
cd src-tauri
cargo test
```

**合格基準**:
- [ ] 全てのテストがパスする
- [ ] テストカバレッジが十分である

---

## 3. 統合テスト（TypeScript）

### 3.1 テスト環境セットアップ

**テストファイル**: `tests/api/query-storage.spec.ts`（新規作成）

**セットアップ内容**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { queryStorageApi } from '@/api/query-storage'

describe('queryStorageApi - Folder Management', () => {
  beforeEach(async () => {
    // テストデータのクリーンアップ
  })
```

---

### 3.2 listFolders テスト

**テストケース**: `should list folders`

**テスト内容**:
1. 2つのクエリを異なるフォルダに保存
2. `listFolders()` を呼び出し
3. フォルダ一覧に両方のフォルダが含まれることを確認

**期待結果**:
```typescript
expect(folders).toContain('/開発環境')
expect(folders).toContain('/本番環境')
```

**実行方法**:
```bash
npm run test -- query-storage.spec.ts
```

**合格基準**:
- [ ] テストがパスする
- [ ] フォルダ一覧が正しく返される

---

### 3.3 moveQuery テスト

**テストケース**: `should move query to folder`

**テスト内容**:
1. クエリを `/開発環境` に保存
2. `moveQuery()` で `/本番環境` に移動
3. クエリを読み込んで `folderPath` を確認

**期待結果**:
```typescript
expect(loaded.folderPath).toBe('/本番環境')
```

**実行方法**:
```bash
npm run test -- query-storage.spec.ts
```

**合格基準**:
- [ ] テストがパスする
- [ ] クエリが移動される

---

### 3.4 renameFolder テスト

**テストケース**: `should rename folder and update queries`

**テスト内容**:
1. クエリを `/開発環境` に保存
2. `renameFolder('/開発環境', '/Dev')` を実行
3. クエリを読み込んで `folderPath` を確認

**期待結果**:
```typescript
expect(loaded.folderPath).toBe('/Dev')
```

**実行方法**:
```bash
npm run test -- query-storage.spec.ts
```

**合格基準**:
- [ ] テストがパスする
- [ ] フォルダ名が変更される
- [ ] 配下のクエリも更新される

---

### 3.5 deleteFolder テスト

**テストケース**: `should delete empty folder`, `should not delete folder with queries`

**テスト内容**:
1. **空フォルダ**: `deleteFolder()` が成功することを確認
2. **クエリ含むフォルダ**: エラーがスローされることを確認

**期待結果**:
```typescript
// 空フォルダ
await expect(
  queryStorageApi.deleteFolder('/空フォルダ')
).resolves.not.toThrow()

// クエリ含むフォルダ
await expect(
  queryStorageApi.deleteFolder('/開発環境')
).rejects.toThrow('フォルダにクエリが含まれている')
```

**実行方法**:
```bash
npm run test -- query-storage.spec.ts
```

**合格基準**:
- [ ] 両方のテストがパスする

---

### 3.6 searchSavedQueries (folderPath) テスト

**テストケース**: `should search queries by folder path`

**テスト内容**:
1. 異なるフォルダに2つのクエリを保存
2. `searchSavedQueries({ folderPath: '/開発環境' })` を実行
3. 1つのクエリのみが返されることを確認

**期待結果**:
```typescript
expect(results).toHaveLength(1)
expect(results[0].name).toBe('Query1')
```

**実行方法**:
```bash
npm run test -- query-storage.spec.ts
```

**合格基準**:
- [ ] テストがパスする
- [ ] `folderPath` フィルタが正しく動作する

---

### 3.7 全統合テスト実行

**実行方法**:
```bash
npm run test
```

**合格基準**:
- [ ] 全てのテストがパスする

---

## 4. 手動テスト

### 4.1 テスト環境起動

**手順**:
1. Tauriアプリを起動
   ```bash
   npm run tauri:dev
   ```
2. ブラウザ開発者ツールを開く（F12）
3. コンソールタブを選択

---

### 4.2 list_folders 手動テスト

**テスト手順**:
1. コンソールで以下を実行:
   ```javascript
   const { queryStorageApi } = await import('/app/api/query-storage.ts')
   await queryStorageApi.listFolders()
   ```

**期待結果**:
- フォルダパスの配列が返される
- 例: `["/開発環境", "/開発環境/ユーザー管理", "/本番環境"]`

**確認項目**:
- [ ] 正しいフォルダ一覧が返される
- [ ] 重複がない
- [ ] ソートされている

---

### 4.3 move_query 手動テスト

**テスト手順**:
1. クエリを保存:
   ```javascript
   const saved = await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   ```
2. クエリを移動:
   ```javascript
   await queryStorageApi.moveQuery(saved.id, '/本番環境')
   ```
3. クエリを読み込んで確認:
   ```javascript
   const loaded = await queryStorageApi.loadQuery(saved.id)
   console.log(loaded.folderPath) // "/本番環境"
   ```

**期待結果**:
- `folderPath` が `/本番環境` になっている

**確認項目**:
- [ ] クエリが正しく移動される
- [ ] エラーが発生しない

---

### 4.4 rename_folder 手動テスト

**テスト手順**:
1. クエリを保存:
   ```javascript
   const saved = await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   ```
2. フォルダ名を変更:
   ```javascript
   await queryStorageApi.renameFolder('/開発環境', '/Dev')
   ```
3. クエリを読み込んで確認:
   ```javascript
   const loaded = await queryStorageApi.loadQuery(saved.id)
   console.log(loaded.folderPath) // "/Dev"
   ```

**期待結果**:
- `folderPath` が `/Dev` になっている

**確認項目**:
- [ ] フォルダ名が正しく変更される
- [ ] 配下のクエリのパスも更新される
- [ ] エラーが発生しない

---

### 4.5 delete_folder 手動テスト

**テスト手順（空フォルダ）**:
1. 空フォルダを削除:
   ```javascript
   await queryStorageApi.deleteFolder('/空フォルダ')
   ```

**期待結果**:
- エラーが発生しない

**テスト手順（クエリ含むフォルダ）**:
1. クエリを保存:
   ```javascript
   await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   ```
2. フォルダを削除:
   ```javascript
   await queryStorageApi.deleteFolder('/開発環境')
   ```

**期待結果**:
- エラーがスローされる
- エラーメッセージ: `"フォルダにクエリが含まれているため削除できません"`

**確認項目**:
- [ ] 空フォルダは削除できる
- [ ] クエリ含むフォルダはエラーになる
- [ ] エラーメッセージが適切

---

### 4.6 searchSavedQueries (folderPath) 手動テスト

**テスト手順**:
1. 異なるフォルダに2つのクエリを保存:
   ```javascript
   await queryStorageApi.saveQuery({
     name: 'Query1',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   await queryStorageApi.saveQuery({
     name: 'Query2',
     description: '',
     tags: [],
     folderPath: '/本番環境',
     connectionId: null,
     query: {},
   })
   ```
2. フォルダパスで検索:
   ```javascript
   const results = await queryStorageApi.searchSavedQueries({
     folderPath: '/開発環境',
   })
   console.log(results) // [{ name: 'Query1', ... }]
   ```

**期待結果**:
- `/開発環境` のクエリのみが返される

**確認項目**:
- [ ] `folderPath` フィルタが正しく動作する
- [ ] 他のフォルダのクエリは除外される

---

## 5. 既存API互換性テスト

### 5.1 save_query 互換性テスト

**テスト手順**:
1. `folderPath: null` でクエリを保存:
   ```javascript
   const saved = await queryStorageApi.saveQuery({
     name: 'Old Style Query',
     description: '',
     tags: [],
     folderPath: null,
     connectionId: 'conn-001',
     query: {},
   })
   ```
2. クエリを読み込んで確認:
   ```javascript
   const loaded = await queryStorageApi.loadQuery(saved.id)
   console.log(loaded.folderPath) // null
   ```

**期待結果**:
- `folderPath: null` で正常に保存できる
- 読み込み時も `null` が返される

**確認項目**:
- [ ] 既存の `save_query` が正常に動作する

---

### 5.2 load_query 互換性テスト

**テスト手順**:
1. クエリを保存:
   ```javascript
   const saved = await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   ```
2. クエリを読み込み:
   ```javascript
   const loaded = await queryStorageApi.loadQuery(saved.id)
   console.log(loaded.folderPath) // "/開発環境"
   ```

**期待結果**:
- `folderPath` フィールドが正しく返される

**確認項目**:
- [ ] 既存の `load_query` が正常に動作する

---

### 5.3 delete_query 互換性テスト

**テスト手順**:
1. クエリを保存:
   ```javascript
   const saved = await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: '',
     tags: [],
     folderPath: '/開発環境',
     connectionId: null,
     query: {},
   })
   ```
2. クエリを削除:
   ```javascript
   await queryStorageApi.deleteQuery(saved.id)
   ```
3. 削除確認:
   ```javascript
   try {
     await queryStorageApi.loadQuery(saved.id)
   } catch (error) {
     console.log('削除成功')
   }
   ```

**期待結果**:
- フォルダに関わらず削除できる

**確認項目**:
- [ ] 既存の `delete_query` が正常に動作する

---

### 5.4 search_saved_queries 互換性テスト

**テスト手順**:
1. クエリを保存:
   ```javascript
   await queryStorageApi.saveQuery({
     name: 'Test Query',
     description: 'Description',
     tags: ['tag1'],
     folderPath: null,
     connectionId: null,
     query: {},
   })
   ```
2. キーワード検索:
   ```javascript
   const results = await queryStorageApi.searchSavedQueries({
     keyword: 'Test',
   })
   console.log(results.length) // 1以上
   ```

**期待結果**:
- `folderPath` なしでも検索できる
- キーワード検索が正常に動作する

**確認項目**:
- [ ] 既存の `search_saved_queries` が正常に動作する

---

### 5.5 既存JSONファイル読み込みテスト

**テスト手順**:
1. アプリデータディレクトリに `folder_path` フィールドなしのJSONファイルを配置
   ```json
   {
     "id": "old-query-001",
     "name": "Old Query",
     "description": "Description",
     "tags": [],
     "connection_id": "conn-001",
     "query": {},
     "created_at": "2026-01-01T00:00:00Z",
     "updated_at": "2026-01-01T00:00:00Z"
   }
   ```
2. クエリを読み込み:
   ```javascript
   const loaded = await queryStorageApi.loadQuery('old-query-001')
   console.log(loaded.folderPath) // null
   ```

**期待結果**:
- `folder_path` フィールドがなくても正常に読み込める
- `folderPath` は `null` として扱われる

**確認項目**:
- [ ] 後方互換性が保証される

---

## 6. バリデーションテスト

### 6.1 フォルダパスバリデーション

**テスト手順**:
1. 不正なフォルダパスでクエリを保存:
   ```javascript
   await queryStorageApi.saveQuery({
     name: 'Test',
     description: '',
     tags: [],
     folderPath: 'invalid-path', // '/' で始まらない
     connectionId: null,
     query: {},
   })
   ```

**期待結果**:
- エラーがスローされる
- エラーメッセージ: `"フォルダパスは '/' で始まる必要があります"`

**確認項目**:
- [ ] `/` で始まらないパスはエラー
- [ ] `/` で終わるパスはエラー
- [ ] 禁止文字を含むパスはエラー
- [ ] 階層が10を超えるパスはエラー

---

### 6.2 フォルダ名重複チェック

**テスト手順**:
1. フォルダ名を既存のフォルダ名に変更:
   ```javascript
   await queryStorageApi.renameFolder('/開発環境', '/本番環境')
   ```

**期待結果**:
- エラーがスローされる
- エラーメッセージ: `"フォルダが既に存在します: /本番環境"`

**確認項目**:
- [ ] 重複するフォルダ名はエラー

---

## 7. パフォーマンステスト

### 7.1 list_folders パフォーマンス

**テスト手順**:
1. 1000件のクエリを保存（異なるフォルダに分散）
2. `list_folders()` の実行時間を測定

**期待結果**:
- 実行時間 < 100ms

**実行方法**:
```javascript
console.time('list_folders')
await queryStorageApi.listFolders()
console.timeEnd('list_folders')
```

**合格基準**:
- [ ] 100ms以内に完了する

---

### 7.2 rename_folder パフォーマンス

**テスト手順**:
1. 100件のクエリを同じフォルダに保存
2. `rename_folder()` の実行時間を測定

**期待結果**:
- 実行時間 < 500ms

**実行方法**:
```javascript
console.time('rename_folder')
await queryStorageApi.renameFolder('/開発環境', '/Dev')
console.timeEnd('rename_folder')
```

**合格基準**:
- [ ] 500ms以内に完了する

---

## 8. 総合テスト

### 8.1 全自動テスト実行

**実行手順**:
1. Rust単体テスト:
   ```bash
   cd src-tauri
   cargo test
   ```
2. TypeScript統合テスト:
   ```bash
   npm run test
   ```

**合格基準**:
- [ ] 全てのRustテストがパスする
- [ ] 全てのTypeScriptテストがパスする

---

### 8.2 手動テスト総合確認

**実行手順**:
1. Tauriアプリを起動
2. セクション4の全手動テストを実行
3. セクション5の全互換性テストを実行
4. セクション6の全バリデーションテストを実行

**合格基準**:
- [ ] 全ての手動テストが成功する
- [ ] エラーメッセージが適切
- [ ] パフォーマンス要件を満たす

---

## 9. テスト結果記録

### 9.1 テスト結果サマリー

| テスト種別 | 実施日 | 結果 | 備考 |
|-----------|--------|------|------|
| Rust単体テスト | - | ⬜ 未実施 | - |
| TypeScript統合テスト | - | ⬜ 未実施 | - |
| 手動テスト | - | ⬜ 未実施 | - |
| 互換性テスト | - | ⬜ 未実施 | - |
| バリデーションテスト | - | ⬜ 未実施 | - |
| パフォーマンステスト | - | ⬜ 未実施 | - |

### 9.2 不具合記録

| ID | 発見日 | 不具合内容 | 重要度 | ステータス | 修正日 |
|----|--------|-----------|--------|-----------|--------|
| - | - | - | - | - | - |

---

## 10. テスト完了基準

### 10.1 必須条件

- [ ] 全てのRust単体テストがパスする
- [ ] 全てのTypeScript統合テストがパスする
- [ ] 全ての手動テストが成功する
- [ ] 既存API互換性テストが全てパスする
- [ ] バリデーションテストが全てパスする
- [ ] パフォーマンス要件を満たす

### 10.2 オプション条件

- [ ] テストカバレッジが80%以上
- [ ] ドキュメントが更新されている
- [ ] コードレビューが完了している

---

## 11. 関連ドキュメント

- [要件定義書](requirements.md)
- [設計書](design.md)
- [タスクリスト](tasklist.md)
- [保存クエリのフォルダ管理機能 - 要件定義書](../../local/20260124_保存クエリ管理/requirements.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-24 | 1.0 | 初版作成 | - |
