# 設計書：保存クエリフォルダ管理 - Phase 2: バックエンドAPI実装

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 設計中
**親ドキュメント**: [requirements.md](requirements.md)

---

## 1. 概要

### 1.1 設計方針

Phase 2では、フォルダ管理に必要な以下のバックエンドAPIを実装します：

1. **フォルダ一覧取得** (`list_folders`)
2. **クエリ移動** (`move_query`)
3. **フォルダ名変更** (`rename_folder`)
4. **フォルダ削除** (`delete_folder`)
5. **検索API拡張** (`search_saved_queries`にfolderPathフィルタ追加)

**設計の原則**:
- **既存パターンの踏襲**: 既存のquery_storage実装と同じパターンを使用
- **後方互換性**: 既存APIの動作を保証
- **バリデーション重視**: 入力値の厳密なチェック
- **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージ

### 1.2 実装場所

| レイヤー | ファイル | 説明 |
|---------|---------|------|
| Rust Command | [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs) | Tauri Commandを追加 |
| Rust Service | [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs) | ビジネスロジックを追加 |
| Rust Utils | [src-tauri/src/utils/folder_validation.rs](../../../src-tauri/src/utils/folder_validation.rs) | バリデーション関数を追加 |
| TypeScript API | [app/api/query-storage.ts](../../../app/api/query-storage.ts) | API関数を追加 |
| TypeScript Types | [app/types/saved-query.ts](../../../app/types/saved-query.ts) | 型定義（Phase 1で完了済み） |

---

## 2. Rust実装設計

### 2.1 フォルダ一覧取得API

#### 2.1.1 Service層実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:130)

```rust
impl QueryStorage {
    /// フォルダ一覧を取得する
    /// 全クエリのfolder_pathからユニークなパスのリストを返す
    pub fn list_folders(&self) -> Result<Vec<String>, String> {
        let queries = self.list_queries()?;

        // folder_pathがSomeのものを抽出し、重複を除外
        let mut folders: Vec<String> = queries
            .into_iter()
            .filter_map(|q| q.folder_path)
            .collect();

        // 重複を除外
        folders.sort();
        folders.dedup();

        Ok(folders)
    }
}
```

**処理フロー**:
1. `list_queries()`で全クエリを取得
2. `folder_path`が`Some`の値のみを抽出
3. `Vec`に収集し、ソート
4. `dedup()`で重複を除外
5. 結果を返す

**エラーケース**:
- `list_queries()`でストレージ読み込みエラー

#### 2.1.2 Command層実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:99)

```rust
/// フォルダ一覧を取得する
#[tauri::command]
pub async fn list_folders(
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<Vec<String>, String> {
    storage.list_folders()
}
```

---

### 2.2 クエリ移動API

#### 2.2.1 Service層実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:145)

```rust
impl QueryStorage {
    /// クエリを指定フォルダに移動する
    pub fn move_query(
        &self,
        query_id: &str,
        folder_path: Option<String>,
    ) -> Result<(), String> {
        // クエリを読み込み
        let mut query = self.load_query(query_id)?;

        // folder_pathを更新
        query.folder_path = folder_path;

        // updated_atを更新
        query.updated_at = chrono::Utc::now().to_rfc3339();

        // 保存
        self.save_query(query)?;

        Ok(())
    }
}
```

**処理フロー**:
1. `load_query()`でクエリを読み込み
2. `folder_path`を更新
3. `updated_at`を現在時刻に更新
4. `save_query()`で保存

**エラーケース**:
- クエリが存在しない（`load_query`でエラー）
- ストレージ保存エラー（`save_query`でエラー）

#### 2.2.2 Command層実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:107)

```rust
/// クエリを指定フォルダに移動する
#[tauri::command]
pub async fn move_query(
    query_id: String,
    folder_path: Option<String>,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    // クエリIDのバリデーション
    validate_query_id(&query_id)?;

    // フォルダパスのバリデーション
    validate_folder_path(&folder_path)?;

    storage.move_query(&query_id, folder_path)
}
```

**バリデーション**:
- `validate_query_id()`: パストラバーサル攻撃対策、長さチェック
- `validate_folder_path()`: フォルダパス形式チェック

---

### 2.3 フォルダ名変更API

#### 2.3.1 Service層実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:165)

```rust
impl QueryStorage {
    /// フォルダ名を変更し、配下の全クエリのfolder_pathも更新する
    pub fn rename_folder(
        &self,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), String> {
        // 全クエリを読み込み
        let all_queries = self.list_queries()?;

        // old_pathで始まるクエリを抽出
        let target_queries: Vec<_> = all_queries
            .into_iter()
            .filter(|q| {
                if let Some(folder_path) = &q.folder_path {
                    folder_path == old_path || folder_path.starts_with(&format!("{}/", old_path))
                } else {
                    false
                }
            })
            .collect();

        // 各クエリのfolder_pathを置換して保存
        for metadata in target_queries {
            let mut query = self.load_query(&metadata.id)?;

            if let Some(current_path) = &query.folder_path {
                // パスを置換
                let new_folder_path = if current_path == old_path {
                    new_path.to_string()
                } else {
                    // サブフォルダの場合は先頭部分のみ置換
                    current_path.replace(old_path, new_path)
                };

                query.folder_path = Some(new_folder_path);
                query.updated_at = chrono::Utc::now().to_rfc3339();

                self.save_query(query)?;
            }
        }

        Ok(())
    }
}
```

**処理フロー**:
1. `list_queries()`で全クエリメタデータを取得
2. `folder_path`が`old_path`で始まるクエリを抽出
3. 各クエリを読み込み、`folder_path`を置換
4. `updated_at`を更新し、保存

**パス置換ロジック**:
- **完全一致**: `/開発環境` → `/Dev`
- **サブフォルダ**: `/開発環境/ユーザー管理` → `/Dev/ユーザー管理`

**エラーケース**:
- ストレージ読み込みエラー
- ストレージ保存エラー

#### 2.3.2 Command層実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:120)

```rust
/// フォルダ名を変更する（配下のクエリも更新）
#[tauri::command]
pub async fn rename_folder(
    old_path: String,
    new_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    // 両方のパスをバリデーション
    validate_folder_path(&Some(old_path.clone()))?;
    validate_folder_path(&Some(new_path.clone()))?;

    // 新しいパスが既存のフォルダと重複していないかチェック
    let existing_folders = storage.list_folders()?;
    if existing_folders.contains(&new_path) && old_path != new_path {
        return Err(format!("フォルダが既に存在します: {}", new_path));
    }

    storage.rename_folder(&old_path, &new_path)
}
```

**バリデーション**:
1. `old_path`と`new_path`の形式チェック
2. `new_path`が既存フォルダと重複しないかチェック

---

### 2.4 フォルダ削除API

#### 2.4.1 Service層実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:210)

```rust
impl QueryStorage {
    /// フォルダを削除する（空のフォルダのみ）
    pub fn delete_folder(&self, folder_path: &str) -> Result<(), String> {
        // 全クエリを読み込み
        let all_queries = self.list_queries()?;

        // folder_pathが一致または子パスのクエリが存在するかチェック
        let has_queries = all_queries.iter().any(|q| {
            if let Some(path) = &q.folder_path {
                path == folder_path || path.starts_with(&format!("{}/", folder_path))
            } else {
                false
            }
        });

        if has_queries {
            return Err(format!(
                "フォルダにクエリが含まれているため削除できません: {}",
                folder_path
            ));
        }

        // フォルダはパスとして存在するだけなので、実際の削除操作は不要
        Ok(())
    }
}
```

**処理フロー**:
1. `list_queries()`で全クエリメタデータを取得
2. `folder_path`が一致または子パスのクエリが存在するかチェック
3. 存在する場合はエラー
4. 存在しない場合は成功（実際の削除操作は不要）

**注意**:
- フォルダはクエリの`folder_path`として存在するだけで、独立したエンティティではない
- そのため、削除操作はバリデーションのみで実際のファイル削除は不要

#### 2.4.2 Command層実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:135)

```rust
/// フォルダを削除する（空のフォルダのみ）
#[tauri::command]
pub async fn delete_folder(
    folder_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    // フォルダパスのバリデーション
    validate_folder_path(&Some(folder_path.clone()))?;

    storage.delete_folder(&folder_path)
}
```

---

### 2.5 検索API拡張

#### 2.5.1 SearchQueryRequest型拡張

**ファイル**: [src-tauri/src/models/saved_query.rs](../../../src-tauri/src/models/saved_query.rs)

```rust
#[derive(Deserialize)]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,  // 新規追加
}
```

#### 2.5.2 Service層拡張

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:82)

既存の`search_queries`メソッドは既に`folder_path`フィルタに対応しているため、変更不要です。

```rust
// フォルダパスでフィルタ
if let Some(folder_path) = &request.folder_path {
    if q.folder_path.as_deref() != Some(folder_path.as_str()) {
        return false;
    }
}
```

---

## 3. TypeScript実装設計

### 3.1 API関数追加

**ファイル**: [app/api/query-storage.ts](../../../app/api/query-storage.ts:44)

```typescript
export const queryStorageApi = {
  // ... 既存のメソッド ...

  /**
   * フォルダ一覧を取得する
   */
  async listFolders(): Promise<string[]> {
    return await invoke<string[]>('list_folders')
  },

  /**
   * クエリを指定フォルダに移動する
   */
  async moveQuery(queryId: string, folderPath: string | null): Promise<void> {
    await invoke('move_query', { queryId, folderPath })
  },

  /**
   * フォルダ名を変更する（配下のクエリも更新）
   */
  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    await invoke('rename_folder', { oldPath, newPath })
  },

  /**
   * フォルダを削除する（空のフォルダのみ）
   */
  async deleteFolder(folderPath: string): Promise<void> {
    await invoke('delete_folder', { folderPath })
  },
}
```

### 3.2 SearchQueryRequest型拡張

**ファイル**: [app/types/saved-query.ts](../../../app/types/saved-query.ts)

```typescript
export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
  folderPath?: string  // 新規追加
}
```

---

## 4. バリデーション設計

### 4.1 既存バリデーション関数

**ファイル**: [src-tauri/src/utils/folder_validation.rs](../../../src-tauri/src/utils/folder_validation.rs)

以下の関数は既に実装済み：

| 関数 | 用途 |
|------|------|
| `validate_folder_path(&Option<String>)` | フォルダパス全体のバリデーション |
| `validate_folder_name(&str)` | 単一フォルダ名のバリデーション |
| `parse_folder_path(&Option<String>)` | フォルダパスを分割 |
| `build_folder_path(&[String])` | フォルダパスを構築 |

### 4.2 バリデーション制約

**フォルダパス制約**:
- `/`で始まる
- `/`で終わらない
- 空文字列不可
- 最大階層: 10階層
- 禁止文字: `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- `..`を含まない

**フォルダ名制約**:
- 最大長: 100文字
- 禁止文字: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- `..`を含まない

---

## 5. エラーハンドリング設計

### 5.1 エラーメッセージ一覧

| API | エラーケース | エラーメッセージ |
|-----|-------------|-----------------|
| `list_folders` | ストレージ読み込みエラー | `"Failed to list folders: {error}"` |
| `move_query` | クエリ不在 | `"Query not found: {query_id}"` |
| `move_query` | 不正なクエリID | `"不正なクエリIDです"` |
| `move_query` | 不正なフォルダパス | `"フォルダパスは '/' で始まる必要があります"` |
| `rename_folder` | 重複フォルダパス | `"フォルダが既に存在します: {new_path}"` |
| `rename_folder` | 不正なフォルダパス | `"フォルダパスは '/' で始まる必要があります"` |
| `delete_folder` | フォルダにクエリあり | `"フォルダにクエリが含まれているため削除できません: {folder_path}"` |

### 5.2 エラー伝播パターン

```rust
// Service層からCommandへ
storage.list_folders() // Result<Vec<String>, String>
    ↓
// Commandからフロントエンドへ
Result<Vec<String>, String> // Tauri IPCでシリアライズ
    ↓
// TypeScript側でcatch
try {
  await queryStorageApi.listFolders()
} catch (error) {
  console.error(error)
  toast.error(String(error))
}
```

---

## 6. テスト設計

### 6.1 Rust単体テスト

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:232)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_list_folders() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        // クエリを3つ保存（2つのフォルダ）
        let query1 = SavedQuery {
            id: "".to_string(),
            name: "Query1".to_string(),
            folder_path: Some("/開発環境".to_string()),
            // ... 他のフィールド
        };
        let query2 = SavedQuery {
            id: "".to_string(),
            name: "Query2".to_string(),
            folder_path: Some("/開発環境/ユーザー管理".to_string()),
            // ...
        };
        let query3 = SavedQuery {
            id: "".to_string(),
            name: "Query3".to_string(),
            folder_path: Some("/本番環境".to_string()),
            // ...
        };

        query_storage.save_query(query1).unwrap();
        query_storage.save_query(query2).unwrap();
        query_storage.save_query(query3).unwrap();

        // フォルダ一覧を取得
        let folders = query_storage.list_folders().unwrap();

        assert_eq!(folders.len(), 3);
        assert!(folders.contains(&"/開発環境".to_string()));
        assert!(folders.contains(&"/開発環境/ユーザー管理".to_string()));
        assert!(folders.contains(&"/本番環境".to_string()));
    }

    #[test]
    fn test_move_query() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query = SavedQuery {
            id: "".to_string(),
            name: "Test Query".to_string(),
            folder_path: Some("/開発環境".to_string()),
            // ...
        };

        let saved = query_storage.save_query(query).unwrap();
        let id = saved.id.clone();

        // クエリを移動
        query_storage
            .move_query(&id, Some("/本番環境".to_string()))
            .unwrap();

        // 確認
        let loaded = query_storage.load_query(&id).unwrap();
        assert_eq!(loaded.folder_path, Some("/本番環境".to_string()));
    }

    #[test]
    fn test_rename_folder() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        // 2つのクエリを保存（同じフォルダと子フォルダ）
        let query1 = SavedQuery {
            id: "".to_string(),
            name: "Query1".to_string(),
            folder_path: Some("/開発環境".to_string()),
            // ...
        };
        let query2 = SavedQuery {
            id: "".to_string(),
            name: "Query2".to_string(),
            folder_path: Some("/開発環境/ユーザー管理".to_string()),
            // ...
        };

        let saved1 = query_storage.save_query(query1).unwrap();
        let saved2 = query_storage.save_query(query2).unwrap();

        // フォルダ名変更
        query_storage
            .rename_folder("/開発環境", "/Dev")
            .unwrap();

        // 確認
        let loaded1 = query_storage.load_query(&saved1.id).unwrap();
        let loaded2 = query_storage.load_query(&saved2.id).unwrap();

        assert_eq!(loaded1.folder_path, Some("/Dev".to_string()));
        assert_eq!(loaded2.folder_path, Some("/Dev/ユーザー管理".to_string()));
    }

    #[test]
    fn test_delete_folder_empty() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        // 空フォルダの削除は成功する
        let result = query_storage.delete_folder("/開発環境");
        assert!(result.is_ok());
    }

    #[test]
    fn test_delete_folder_with_queries() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        // クエリを保存
        let query = SavedQuery {
            id: "".to_string(),
            name: "Test Query".to_string(),
            folder_path: Some("/開発環境".to_string()),
            // ...
        };
        query_storage.save_query(query).unwrap();

        // フォルダの削除はエラー
        let result = query_storage.delete_folder("/開発環境");
        assert!(result.is_err());
    }

    #[test]
    fn test_search_queries_with_folder_path() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        // 異なるフォルダにクエリを保存
        let query1 = SavedQuery {
            id: "".to_string(),
            name: "Query1".to_string(),
            folder_path: Some("/開発環境".to_string()),
            // ...
        };
        let query2 = SavedQuery {
            id: "".to_string(),
            name: "Query2".to_string(),
            folder_path: Some("/本番環境".to_string()),
            // ...
        };

        query_storage.save_query(query1).unwrap();
        query_storage.save_query(query2).unwrap();

        // フォルダパスで検索
        let request = SearchQueryRequest {
            keyword: None,
            tags: None,
            connection_id: None,
            folder_path: Some("/開発環境".to_string()),
        };

        let results = query_storage.search_queries(request).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "Query1");
    }

    #[test]
    fn test_backward_compatibility() {
        // folder_pathフィールドなしのJSONを読み込むテスト
        // （既存のJSONファイルとの互換性確認）
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());

        // folder_pathなしのJSONを直接書き込み
        let json = serde_json::json!({
            "id": "test-001",
            "name": "Old Query",
            "description": "Description",
            "tags": [],
            "connection_id": "conn-001",
            "query": {},
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        });

        storage.write("test-001", &json).unwrap();

        // QueryStorageで読み込み
        let query_storage = QueryStorage::new(Arc::new(storage));
        let loaded = query_storage.load_query("test-001").unwrap();

        // folder_pathがNoneとして扱われることを確認
        assert_eq!(loaded.folder_path, None);
        assert_eq!(loaded.name, "Old Query");
    }
}
```

### 6.2 統合テスト（TypeScript）

**ファイル**: `tests/api/query-storage.spec.ts`（新規作成）

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { queryStorageApi } from '@/api/query-storage'

describe('queryStorageApi - Folder Management', () => {
  beforeEach(async () => {
    // テストデータのクリーンアップ
    // （実装依存）
  })

  it('should list folders', async () => {
    // テストクエリを保存
    await queryStorageApi.saveQuery({
      name: 'Query1',
      description: '',
      tags: [],
      folderPath: '/開発環境',
      connectionId: 'conn-001',
      query: {},
    })

    await queryStorageApi.saveQuery({
      name: 'Query2',
      description: '',
      tags: [],
      folderPath: '/本番環境',
      connectionId: 'conn-001',
      query: {},
    })

    const folders = await queryStorageApi.listFolders()

    expect(folders).toContain('/開発環境')
    expect(folders).toContain('/本番環境')
  })

  it('should move query to folder', async () => {
    const saved = await queryStorageApi.saveQuery({
      name: 'Test Query',
      description: '',
      tags: [],
      folderPath: '/開発環境',
      connectionId: 'conn-001',
      query: {},
    })

    await queryStorageApi.moveQuery(saved.id, '/本番環境')

    const loaded = await queryStorageApi.loadQuery(saved.id)
    expect(loaded.folderPath).toBe('/本番環境')
  })

  it('should rename folder and update queries', async () => {
    const saved = await queryStorageApi.saveQuery({
      name: 'Test Query',
      description: '',
      tags: [],
      folderPath: '/開発環境',
      connectionId: 'conn-001',
      query: {},
    })

    await queryStorageApi.renameFolder('/開発環境', '/Dev')

    const loaded = await queryStorageApi.loadQuery(saved.id)
    expect(loaded.folderPath).toBe('/Dev')
  })

  it('should delete empty folder', async () => {
    await expect(
      queryStorageApi.deleteFolder('/空フォルダ')
    ).resolves.not.toThrow()
  })

  it('should not delete folder with queries', async () => {
    await queryStorageApi.saveQuery({
      name: 'Test Query',
      description: '',
      tags: [],
      folderPath: '/開発環境',
      connectionId: 'conn-001',
      query: {},
    })

    await expect(
      queryStorageApi.deleteFolder('/開発環境')
    ).rejects.toThrow('フォルダにクエリが含まれている')
  })

  it('should search queries by folder path', async () => {
    await queryStorageApi.saveQuery({
      name: 'Query1',
      description: '',
      tags: [],
      folderPath: '/開発環境',
      connectionId: 'conn-001',
      query: {},
    })

    await queryStorageApi.saveQuery({
      name: 'Query2',
      description: '',
      tags: [],
      folderPath: '/本番環境',
      connectionId: 'conn-001',
      query: {},
    })

    const results = await queryStorageApi.searchSavedQueries({
      folderPath: '/開発環境',
    })

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Query1')
  })
})
```

---

## 7. パフォーマンス最適化

### 7.1 list_folders最適化

**現状の実装**:
```rust
pub fn list_folders(&self) -> Result<Vec<String>, String> {
    let queries = self.list_queries()?; // 全クエリメタデータ取得

    let mut folders: Vec<String> = queries
        .into_iter()
        .filter_map(|q| q.folder_path)
        .collect();

    folders.sort();
    folders.dedup();

    Ok(folders)
}
```

**パフォーマンス考慮点**:
- `list_queries()`は全クエリのJSONを読み込むため、クエリ数が多い場合は遅い
- ただし、Phase 1の要件では1000件のクエリで1秒以内が目標
- 初期実装ではこのシンプルな方法で十分

**将来的な最適化案**（必要に応じて）:
- フォルダ一覧をキャッシュ
- インデックスファイルを作成（`folders.json`）
- クエリ保存時にフォルダ一覧を更新

### 7.2 rename_folder最適化

**パフォーマンス考慮点**:
- 配下のクエリ数に比例して処理時間が増加
- 100件のクエリで500ms以内が目標

**最適化**:
- バッチ処理（現在の実装で対応済み）
- トランザクション的な処理（将来的に検討）

---

## 8. セキュリティ考慮事項

### 8.1 パストラバーサル攻撃対策

**フォルダパスのサニタイズ**:
- `validate_folder_path()`で`..`を禁止
- `/`で始まることを強制
- 相対パスを許可しない

**クエリIDのサニタイズ**:
- `validate_query_id()`で`/`, `\`, `..`を禁止
- UUID形式のみ許可

### 8.2 入力値検証

**全てのAPI入力値を検証**:
- フォルダパス: `validate_folder_path()`
- クエリID: `validate_query_id()`
- フォルダ名の重複チェック（`rename_folder`）

---

## 9. データフロー図

### 9.1 rename_folder のデータフロー

```
フロントエンド
    │
    ▼
queryStorageApi.renameFolder(oldPath, newPath)
    │
    ▼
Tauri IPC (invoke)
    │
    ▼
rename_folder コマンド
    │  ├─ validate_folder_path(oldPath)
    │  ├─ validate_folder_path(newPath)
    │  └─ 重複チェック
    │
    ▼
QueryStorage.rename_folder(oldPath, newPath)
    │
    ├─ list_queries() → Vec<SavedQueryMetadata>
    │
    ├─ filter: folder_path starts with oldPath
    │     │
    │     └─ 対象クエリリスト
    │
    ├─ for each query:
    │     ├─ load_query(id) → SavedQuery
    │     ├─ replace folder_path
    │     ├─ update updated_at
    │     └─ save_query() → Result<SavedQuery, String>
    │
    ▼
Result<(), String>
    │
    ▼
フロントエンドへ返却
```

---

## 10. 実装チェックリスト

### 10.1 Rust実装

**Service層**:
- [ ] `QueryStorage::list_folders()` 実装
- [ ] `QueryStorage::move_query()` 実装
- [ ] `QueryStorage::rename_folder()` 実装
- [ ] `QueryStorage::delete_folder()` 実装
- [ ] `QueryStorage::search_queries()` の`folder_path`フィルタ確認（既に実装済み）

**Command層**:
- [ ] `list_folders` コマンド実装
- [ ] `move_query` コマンド実装
- [ ] `rename_folder` コマンド実装
- [ ] `delete_folder` コマンド実装
- [ ] `search_saved_queries` コマンドの`SearchQueryRequest`拡張

**Models**:
- [ ] `SearchQueryRequest`に`folder_path`フィールド追加

**Utils**:
- [ ] `validate_folder_path()` の動作確認（既に実装済み）

**Tests**:
- [ ] `test_list_folders()` 追加
- [ ] `test_move_query()` 追加
- [ ] `test_rename_folder()` 追加
- [ ] `test_delete_folder_empty()` 追加
- [ ] `test_delete_folder_with_queries()` 追加
- [ ] `test_search_queries_with_folder_path()` 追加
- [ ] `test_backward_compatibility()` 追加

### 10.2 TypeScript実装

**API**:
- [ ] `queryStorageApi.listFolders()` 追加
- [ ] `queryStorageApi.moveQuery()` 追加
- [ ] `queryStorageApi.renameFolder()` 追加
- [ ] `queryStorageApi.deleteFolder()` 追加

**Types**:
- [ ] `SearchQueryRequest`に`folderPath`フィールド追加（Phase 1で完了済み）

**Tests**:
- [ ] `query-storage.spec.ts` 作成
- [ ] フォルダ一覧取得テスト
- [ ] クエリ移動テスト
- [ ] フォルダ名変更テスト
- [ ] フォルダ削除テスト
- [ ] フォルダパス検索テスト

### 10.3 既存API互換性テスト

- [ ] `save_query` が `folder_path: null` で動作する
- [ ] `load_query` が `folder_path` を正しく返す
- [ ] `delete_query` がフォルダに関わらず削除できる
- [ ] `search_saved_queries` が `folder_path` なしで検索できる
- [ ] 既存のJSONファイル（`folder_path`なし）が読み込める

---

## 11. 関連ドキュメント

- [要件定義書](requirements.md)
- [保存クエリのフォルダ管理機能 - 要件定義書](../../local/20260124_保存クエリ管理/requirements.md)
- [保存クエリのフォルダ管理機能 - WBS](../../local/20260124_保存クエリ管理/tasklist.md)
- [技術仕様書](../../steering/03_architecture_specifications.md)
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-24 | 1.0 | 初版作成 | - |
