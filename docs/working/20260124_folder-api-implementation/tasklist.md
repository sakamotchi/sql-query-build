# タスクリスト：保存クエリフォルダ管理 - Phase 2: バックエンドAPI実装

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親ドキュメント**: [requirements.md](requirements.md) | [design.md](design.md)

---

## タスク一覧

| ID | タスク名 | ステータス | 担当 | 見積 | 実績 |
|----|----------|-----------|------|------|------|
| **1. Service層実装** | | | | **10h** | |
| 1.1 | `list_folders()` メソッド実装 | 未着手 | Dev | 1h | - |
| 1.2 | `move_query()` メソッド実装 | 未着手 | Dev | 1.5h | - |
| 1.3 | `rename_folder()` メソッド実装 | 未着手 | Dev | 3h | - |
| 1.4 | `delete_folder()` メソッド実装 | 未着手 | Dev | 2h | - |
| 1.5 | `search_queries()` の動作確認 | 未着手 | Dev | 0.5h | - |
| 1.6 | Service層の手動テスト | 未着手 | Dev | 2h | - |
| **2. Command層実装** | | | | **6h** | |
| 2.1 | `list_folders` コマンド実装 | 未着手 | Dev | 0.5h | - |
| 2.2 | `move_query` コマンド実装 | 未着手 | Dev | 1h | - |
| 2.3 | `rename_folder` コマンド実装 | 未着手 | Dev | 1.5h | - |
| 2.4 | `delete_folder` コマンド実装 | 未着手 | Dev | 1h | - |
| 2.5 | `SearchQueryRequest` 型拡張 | 未着手 | Dev | 0.5h | - |
| 2.6 | Command層の手動テスト | 未着手 | Dev | 1.5h | - |
| **3. TypeScript実装** | | | | **3h** | |
| 3.1 | `queryStorageApi` に新規メソッド追加 | 未着手 | Dev | 1h | - |
| 3.2 | `SearchQueryRequest` 型拡張 | 未着手 | Dev | 0.5h | - |
| 3.3 | TypeScript API の手動テスト | 未着手 | Dev | 1.5h | - |
| **4. テスト実装** | | | | **8h** | |
| 4.1 | Rust単体テスト（list_folders） | 未着手 | Dev | 1h | - |
| 4.2 | Rust単体テスト（move_query） | 未着手 | Dev | 1h | - |
| 4.3 | Rust単体テスト（rename_folder） | 未着手 | Dev | 1.5h | - |
| 4.4 | Rust単体テスト（delete_folder） | 未着手 | Dev | 1h | - |
| 4.5 | Rust単体テスト（folder_path検索） | 未着手 | Dev | 0.5h | - |
| 4.6 | Rust単体テスト（後方互換性） | 未着手 | Dev | 1h | - |
| 4.7 | TypeScript統合テスト | 未着手 | Dev | 2h | - |
| **5. 既存API互換性確認** | | | | **3h** | |
| 5.1 | `save_query` の動作確認 | 未着手 | Dev | 0.5h | - |
| 5.2 | `load_query` の動作確認 | 未着手 | Dev | 0.5h | - |
| 5.3 | `delete_query` の動作確認 | 未着手 | Dev | 0.5h | - |
| 5.4 | `search_saved_queries` の動作確認 | 未着手 | Dev | 0.5h | - |
| 5.5 | 既存JSONファイル読み込みテスト | 未着手 | Dev | 1h | - |
| **6. ドキュメント更新** | | | | **2h** | |
| 6.1 | API一覧ドキュメント更新 | 未着手 | Dev | 1h | - |
| 6.2 | コードコメント整備 | 未着手 | Dev | 1h | - |

**総見積工数**: 32時間（約4日）

---

## タスク詳細

### 1. Service層実装

#### 1.1 `list_folders()` メソッド実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:130)

**タスク内容**:
- [ ] `list_folders()` メソッドを実装
- [ ] `list_queries()` で全クエリを取得
- [ ] `folder_path` が `Some` の値を抽出
- [ ] 重複除外とソート処理
- [ ] エラーハンドリング

**実装コード例**:
```rust
impl QueryStorage {
    pub fn list_folders(&self) -> Result<Vec<String>, String> {
        let queries = self.list_queries()?;
        let mut folders: Vec<String> = queries
            .into_iter()
            .filter_map(|q| q.folder_path)
            .collect();
        folders.sort();
        folders.dedup();
        Ok(folders)
    }
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] 手動テストで正しい結果が返る

**見積**: 1時間

---

#### 1.2 `move_query()` メソッド実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:145)

**タスク内容**:
- [ ] `move_query()` メソッドを実装
- [ ] クエリを読み込み
- [ ] `folder_path` を更新
- [ ] `updated_at` を更新
- [ ] クエリを保存
- [ ] エラーハンドリング

**実装コード例**:
```rust
impl QueryStorage {
    pub fn move_query(
        &self,
        query_id: &str,
        folder_path: Option<String>,
    ) -> Result<(), String> {
        let mut query = self.load_query(query_id)?;
        query.folder_path = folder_path;
        query.updated_at = chrono::Utc::now().to_rfc3339();
        self.save_query(query)?;
        Ok(())
    }
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] 手動テストでクエリが移動できる

**見積**: 1.5時間

---

#### 1.3 `rename_folder()` メソッド実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:165)

**タスク内容**:
- [ ] `rename_folder()` メソッドを実装
- [ ] 全クエリメタデータを取得
- [ ] `old_path` で始まるクエリを抽出
- [ ] 各クエリの `folder_path` を置換
- [ ] `updated_at` を更新
- [ ] 全クエリを保存
- [ ] エラーハンドリング

**実装コード例**:
```rust
impl QueryStorage {
    pub fn rename_folder(
        &self,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), String> {
        let all_queries = self.list_queries()?;
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

        for metadata in target_queries {
            let mut query = self.load_query(&metadata.id)?;
            if let Some(current_path) = &query.folder_path {
                let new_folder_path = if current_path == old_path {
                    new_path.to_string()
                } else {
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

**完了条件**:
- [ ] コンパイルが通る
- [ ] 手動テストでフォルダ名が変更でき、配下のクエリも更新される

**見積**: 3時間

---

#### 1.4 `delete_folder()` メソッド実装

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:210)

**タスク内容**:
- [ ] `delete_folder()` メソッドを実装
- [ ] 全クエリメタデータを取得
- [ ] `folder_path` が一致または子パスのクエリが存在するかチェック
- [ ] クエリが存在する場合はエラー
- [ ] エラーハンドリング

**実装コード例**:
```rust
impl QueryStorage {
    pub fn delete_folder(&self, folder_path: &str) -> Result<(), String> {
        let all_queries = self.list_queries()?;
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
        Ok(())
    }
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] 手動テストで空フォルダが削除でき、クエリ含むフォルダはエラーになる

**見積**: 2時間

---

#### 1.5 `search_queries()` の動作確認

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:82)

**タスク内容**:
- [ ] 既存の `search_queries()` メソッドを確認
- [ ] `folder_path` フィルタが正しく動作することを確認
- [ ] 手動テストで検証

**確認ポイント**:
```rust
// フォルダパスでフィルタ
if let Some(folder_path) = &request.folder_path {
    if q.folder_path.as_deref() != Some(folder_path.as_str()) {
        return false;
    }
}
```

**完了条件**:
- [ ] `folder_path` フィルタが正しく動作する

**見積**: 0.5時間

---

#### 1.6 Service層の手動テスト

**タスク内容**:
- [ ] テストデータを作成
- [ ] 各メソッドを手動で実行
- [ ] 結果を確認
- [ ] エラーケースも確認

**テストシナリオ**:
1. `list_folders()` で空の場合と複数フォルダの場合を確認
2. `move_query()` でクエリが移動できることを確認
3. `rename_folder()` で配下のクエリも更新されることを確認
4. `delete_folder()` で空フォルダ削除とエラーケースを確認

**完了条件**:
- [ ] 全てのメソッドが正常に動作する

**見積**: 2時間

---

### 2. Command層実装

#### 2.1 `list_folders` コマンド実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:99)

**タスク内容**:
- [ ] `list_folders` コマンドを実装
- [ ] Service層の `list_folders()` を呼び出し

**実装コード例**:
```rust
#[tauri::command]
pub async fn list_folders(
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<Vec<String>, String> {
    storage.list_folders()
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] Tauri IPCで呼び出せる

**見積**: 0.5時間

---

#### 2.2 `move_query` コマンド実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:107)

**タスク内容**:
- [ ] `move_query` コマンドを実装
- [ ] `validate_query_id()` でバリデーション
- [ ] `validate_folder_path()` でバリデーション
- [ ] Service層の `move_query()` を呼び出し

**実装コード例**:
```rust
#[tauri::command]
pub async fn move_query(
    query_id: String,
    folder_path: Option<String>,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_query_id(&query_id)?;
    validate_folder_path(&folder_path)?;
    storage.move_query(&query_id, folder_path)
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] バリデーションエラーが正しく返る
- [ ] Tauri IPCで呼び出せる

**見積**: 1時間

---

#### 2.3 `rename_folder` コマンド実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:120)

**タスク内容**:
- [ ] `rename_folder` コマンドを実装
- [ ] 両方のパスをバリデーション
- [ ] 重複チェック
- [ ] Service層の `rename_folder()` を呼び出し

**実装コード例**:
```rust
#[tauri::command]
pub async fn rename_folder(
    old_path: String,
    new_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_folder_path(&Some(old_path.clone()))?;
    validate_folder_path(&Some(new_path.clone()))?;

    let existing_folders = storage.list_folders()?;
    if existing_folders.contains(&new_path) && old_path != new_path {
        return Err(format!("フォルダが既に存在します: {}", new_path));
    }

    storage.rename_folder(&old_path, &new_path)
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] バリデーションエラーが正しく返る
- [ ] 重複チェックが動作する
- [ ] Tauri IPCで呼び出せる

**見積**: 1.5時間

---

#### 2.4 `delete_folder` コマンド実装

**ファイル**: [src-tauri/src/commands/query_storage_commands.rs](../../../src-tauri/src/commands/query_storage_commands.rs:135)

**タスク内容**:
- [ ] `delete_folder` コマンドを実装
- [ ] `validate_folder_path()` でバリデーション
- [ ] Service層の `delete_folder()` を呼び出し

**実装コード例**:
```rust
#[tauri::command]
pub async fn delete_folder(
    folder_path: String,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<(), String> {
    validate_folder_path(&Some(folder_path.clone()))?;
    storage.delete_folder(&folder_path)
}
```

**完了条件**:
- [ ] コンパイルが通る
- [ ] バリデーションエラーが正しく返る
- [ ] Tauri IPCで呼び出せる

**見積**: 1時間

---

#### 2.5 `SearchQueryRequest` 型拡張

**ファイル**: [src-tauri/src/models/saved_query.rs](../../../src-tauri/src/models/saved_query.rs)

**タスク内容**:
- [ ] `SearchQueryRequest` に `folder_path` フィールドを追加

**実装コード例**:
```rust
#[derive(Deserialize)]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,  // 新規追加
}
```

**完了条件**:
- [ ] コンパイルが通る

**見積**: 0.5時間

---

#### 2.6 Command層の手動テスト

**タスク内容**:
- [ ] Tauri Dev環境を起動
- [ ] 各コマンドをフロントエンドから呼び出し
- [ ] 結果を確認
- [ ] エラーケースも確認

**テストシナリオ**:
1. `list_folders` が正しいフォルダ一覧を返す
2. `move_query` でクエリが移動できる
3. `rename_folder` でフォルダ名が変更できる
4. `delete_folder` で空フォルダ削除とエラーケースを確認
5. バリデーションエラーが正しく返る

**完了条件**:
- [ ] 全てのコマンドが正常に動作する

**見積**: 1.5時間

---

### 3. TypeScript実装

#### 3.1 `queryStorageApi` に新規メソッド追加

**ファイル**: [app/api/query-storage.ts](../../../app/api/query-storage.ts:44)

**タスク内容**:
- [ ] `listFolders()` メソッドを追加
- [ ] `moveQuery()` メソッドを追加
- [ ] `renameFolder()` メソッドを追加
- [ ] `deleteFolder()` メソッドを追加

**実装コード例**:
```typescript
export const queryStorageApi = {
  // ... 既存のメソッド ...

  async listFolders(): Promise<string[]> {
    return await invoke<string[]>('list_folders')
  },

  async moveQuery(queryId: string, folderPath: string | null): Promise<void> {
    await invoke('move_query', { queryId, folderPath })
  },

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    await invoke('rename_folder', { oldPath, newPath })
  },

  async deleteFolder(folderPath: string): Promise<void> {
    await invoke('delete_folder', { folderPath })
  },
}
```

**完了条件**:
- [ ] TypeScriptコンパイルが通る
- [ ] 型定義が正しい

**見積**: 1時間

---

#### 3.2 `SearchQueryRequest` 型拡張

**ファイル**: [app/types/saved-query.ts](../../../app/types/saved-query.ts)

**タスク内容**:
- [ ] `SearchQueryRequest` に `folderPath` フィールドを追加

**実装コード例**:
```typescript
export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
  folderPath?: string  // 新規追加
}
```

**完了条件**:
- [ ] TypeScriptコンパイルが通る

**見積**: 0.5時間

---

#### 3.3 TypeScript API の手動テスト

**タスク内容**:
- [ ] Tauri Dev環境を起動
- [ ] ブラウザコンソールから各APIを呼び出し
- [ ] 結果を確認
- [ ] エラーケースも確認

**テストシナリオ**:
1. `listFolders()` が正しいフォルダ一覧を返す
2. `moveQuery()` でクエリが移動できる
3. `renameFolder()` でフォルダ名が変更できる
4. `deleteFolder()` で空フォルダ削除とエラーケースを確認

**完了条件**:
- [ ] 全てのメソッドが正常に動作する

**見積**: 1.5時間

---

### 4. テスト実装

#### 4.1 Rust単体テスト（list_folders）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs:232)

**タスク内容**:
- [ ] `test_list_folders()` テストケースを追加
- [ ] 空の場合のテスト
- [ ] 複数フォルダがある場合のテスト
- [ ] nullを除外することを確認

**完了条件**:
- [ ] テストがパスする

**見積**: 1時間

---

#### 4.2 Rust単体テスト（move_query）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**タスク内容**:
- [ ] `test_move_query()` テストケースを追加
- [ ] 正常系（クエリが移動される）
- [ ] 異常系（存在しないクエリID）

**完了条件**:
- [ ] テストがパスする

**見積**: 1時間

---

#### 4.3 Rust単体テスト（rename_folder）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**タスク内容**:
- [ ] `test_rename_folder()` テストケースを追加
- [ ] 正常系（配下のクエリのfolderPathも更新される）
- [ ] サブフォルダのパスも更新されることを確認

**完了条件**:
- [ ] テストがパスする

**見積**: 1.5時間

---

#### 4.4 Rust単体テスト（delete_folder）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**タスク内容**:
- [ ] `test_delete_folder_empty()` テストケースを追加
- [ ] `test_delete_folder_with_queries()` テストケースを追加
- [ ] 正常系（空フォルダの削除）
- [ ] 異常系（クエリが含まれるフォルダ）

**完了条件**:
- [ ] テストがパスする

**見積**: 1時間

---

#### 4.5 Rust単体テスト（folder_path検索）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**タスク内容**:
- [ ] `test_search_queries_with_folder_path()` テストケースを追加
- [ ] `folder_path` フィルタが正しく動作することを確認

**完了条件**:
- [ ] テストがパスする

**見積**: 0.5時間

---

#### 4.6 Rust単体テスト（後方互換性）

**ファイル**: [src-tauri/src/services/query_storage.rs](../../../src-tauri/src/services/query_storage.rs)

**タスク内容**:
- [ ] `test_backward_compatibility()` テストケースを追加
- [ ] `folder_path` フィールドなしのJSONを読み込むテスト
- [ ] 正常にデシリアライズされ、`folder_path: None` として扱われることを確認

**完了条件**:
- [ ] テストがパスする

**見積**: 1時間

---

#### 4.7 TypeScript統合テスト

**ファイル**: `tests/api/query-storage.spec.ts`（新規作成）

**タスク内容**:
- [ ] テストファイルを作成
- [ ] フォルダ一覧取得テスト
- [ ] クエリ移動テスト
- [ ] フォルダ名変更テスト
- [ ] フォルダ削除テスト
- [ ] フォルダパス検索テスト

**完了条件**:
- [ ] 全てのテストがパスする

**見積**: 2時間

---

### 5. 既存API互換性確認

#### 5.1 `save_query` の動作確認

**タスク内容**:
- [ ] `folder_path: null` でクエリを保存
- [ ] 正常に保存できることを確認

**完了条件**:
- [ ] 既存の `save_query` が正常に動作する

**見積**: 0.5時間

---

#### 5.2 `load_query` の動作確認

**タスク内容**:
- [ ] `folder_path` フィールドが正しく返されることを確認

**完了条件**:
- [ ] 既存の `load_query` が正常に動作する

**見積**: 0.5時間

---

#### 5.3 `delete_query` の動作確認

**タスク内容**:
- [ ] フォルダに関わらずクエリを削除できることを確認

**完了条件**:
- [ ] 既存の `delete_query` が正常に動作する

**見積**: 0.5時間

---

#### 5.4 `search_saved_queries` の動作確認

**タスク内容**:
- [ ] `folder_path` なしで検索できることを確認

**完了条件**:
- [ ] 既存の `search_saved_queries` が正常に動作する

**見積**: 0.5時間

---

#### 5.5 既存JSONファイル読み込みテスト

**タスク内容**:
- [ ] `folder_path` フィールドなしの既存JSONファイルを作成
- [ ] 読み込みテストを実行
- [ ] 正常に読み込めることを確認

**完了条件**:
- [ ] 後方互換性が保証される

**見積**: 1時間

---

### 6. ドキュメント更新

#### 6.1 API一覧ドキュメント更新

**ファイル**: [docs/steering/03_architecture_specifications.md](../../steering/03_architecture_specifications.md)

**タスク内容**:
- [ ] 新規APIをAPI一覧に追加
- [ ] `list_folders`, `move_query`, `rename_folder`, `delete_folder` を記載

**完了条件**:
- [ ] ドキュメントが更新される

**見積**: 1時間

---

#### 6.2 コードコメント整備

**タスク内容**:
- [ ] Rustコードにドキュメントコメント追加
- [ ] TypeScriptコードにJSDocコメント追加

**完了条件**:
- [ ] 全ての公開メソッドにコメントがある

**見積**: 1時間

---

## 依存関係グラフ

```
1. Service層実装 (1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6)
    ↓
2. Command層実装 (2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6)
    ↓
3. TypeScript実装 (3.1 → 3.2 → 3.3)
    ↓
4. テスト実装 (4.1 〜 4.7 並行)
    ↓
5. 既存API互換性確認 (5.1 〜 5.5 並行)
    ↓
6. ドキュメント更新 (6.1 → 6.2)
```

---

## マイルストーン

| マイルストーン | 完了条件 | 期限目安 |
|--------------|---------|---------|
| M1: Service層完成 | タスク1完了 | Day 1.5 |
| M2: Command層完成 | タスク2完了 | Day 2.5 |
| M3: TypeScript完成 | タスク3完了 | Day 3 |
| M4: テスト完了 | タスク4-5完了 | Day 4 |
| M5: ドキュメント完成 | タスク6完了 | Day 4 |

---

## 受け入れ基準

- [ ] 全てのRust単体テストがパスする
- [ ] 全てのTypeScript統合テストがパスする
- [ ] 既存APIが正常に動作する
- [ ] 後方互換性が保証される
- [ ] ドキュメントが更新される
- [ ] コードレビューが完了している

---

## リスク管理

| リスク | 影響度 | 対策 | 担当 |
|--------|--------|------|------|
| rename_folder の大量更新でパフォーマンス低下 | 中 | 初期実装では許容、Phase 3で最適化 | Dev |
| 既存JSONファイルとの非互換 | 低 | Option型で対応済み、テストで確認 | Dev |
| バリデーション漏れ | 低 | 包括的なテスト実装 | Dev |

---

## 関連ドキュメント

- [要件定義書](requirements.md)
- [設計書](design.md)
- [保存クエリのフォルダ管理機能 - WBS](../../local/20260124_保存クエリ管理/tasklist.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-24 | 1.0 | 初版作成 | - |
