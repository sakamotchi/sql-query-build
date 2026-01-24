# 要件定義書：保存クエリフォルダ管理 - Phase 2: バックエンドAPI実装

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 計画中
**親要件**: [保存クエリのフォルダ管理機能](../../local/20260124_保存クエリ管理/requirements.md)

---

## 1. 背景と目的

### 1.1 背景

保存クエリのフォルダ管理機能（Phase 1でデータモデル設計完了）において、フロントエンドからフォルダ操作を行うためのバックエンドAPIが必要です。

**Phase 1で完了した内容**:
- TypeScript型定義の更新（`SavedQueryMetadata`に`folderPath`と`connectionId`のnullable化）
- Rust構造体の更新（`SavedQuery`と`SavedQueryMetadata`に`folder_path`と`connection_id`のOption型追加）
- 既存JSONファイルとの後方互換性確保

**Phase 2で実装する内容**:
- フォルダ一覧取得API（`list_folders`）
- クエリ移動API（`move_query`）
- フォルダ名変更API（`rename_folder`）
- フォルダ削除API（`delete_folder`）
- 検索API拡張（`search_saved_queries`にfolderPathフィルタ追加）
- 既存API互換性確認
- エラーハンドリング強化

### 1.2 目的

フォルダ管理に必要なバックエンドAPIを実装し、フロントエンドから安全にフォルダ操作を行えるようにする。

**具体的な目標**:
1. **フォルダCRUD操作**: フォルダの作成・読み込み・更新・削除をサポート
2. **クエリ移動**: クエリを異なるフォルダ間で移動可能にする
3. **データ整合性**: フォルダ名変更時に配下のクエリのパスも自動更新
4. **バリデーション**: フォルダ名の制約チェック、空フォルダチェック
5. **後方互換性**: 既存APIが正常に動作し続けることを保証

### 1.3 スコープ

**対象範囲**:
- Tauri Commandの実装（Rust）
- TypeScript API関数の実装
- エラーハンドリングとバリデーション
- 後方互換性テスト

**対象外**:
- フロントエンドUI（Phase 4で実装）
- Piniaストア（Phase 3で実装）
- ドラッグ&ドロップ機能（Phase 3-4で実装）

---

## 2. 機能要件

### 2.1 フォルダ一覧取得API

#### FR-1: list_folders

**概要**: 全クエリの`folder_path`からユニークなフォルダパス一覧を取得

**Rust Command仕様**:
```rust
#[tauri::command]
async fn list_folders(state: State<'_, AppState>) -> Result<Vec<String>, String>
```

**処理内容**:
1. 全クエリを読み込み
2. `folder_path`が`Some`の値を抽出
3. 重複を除外してユニークなリストを作成
4. アルファベット順にソート
5. 結果を返す

**TypeScript API仕様**:
```typescript
async listFolders(): Promise<string[]>
```

**成功レスポンス例**:
```json
[
  "/開発環境",
  "/開発環境/ユーザー管理",
  "/ステージング環境",
  "/本番環境"
]
```

**エラーケース**:
- ストレージ読み込みエラー: `"Failed to list folders: {error}"`

---

### 2.2 クエリ移動API

#### FR-2: move_query

**概要**: 指定されたクエリを別のフォルダに移動

**Rust Command仕様**:
```rust
#[tauri::command]
async fn move_query(
    query_id: String,
    folder_path: Option<String>,
    state: State<'_, AppState>
) -> Result<(), String>
```

**処理内容**:
1. `query_id`でクエリを読み込み
2. クエリが存在しない場合はエラー
3. `folder_path`を更新
4. `updated_at`を現在時刻に更新
5. ストレージに保存

**TypeScript API仕様**:
```typescript
async moveQuery(queryId: string, folderPath: string | null): Promise<void>
```

**パラメータ**:
- `queryId`: 移動対象のクエリID
- `folderPath`: 移動先フォルダパス（ルート直下の場合は`null`）

**成功**: `void`

**エラーケース**:
- クエリが存在しない: `"Query not found: {query_id}"`
- ストレージ保存エラー: `"Failed to move query: {error}"`

---

### 2.3 フォルダ名変更API

#### FR-3: rename_folder

**概要**: フォルダ名を変更し、配下の全クエリの`folder_path`も更新

**Rust Command仕様**:
```rust
#[tauri::command]
async fn rename_folder(
    old_path: String,
    new_path: String,
    state: State<'_, AppState>
) -> Result<(), String>
```

**処理内容**:
1. 全クエリを読み込み
2. `folder_path`が`old_path`で始まるクエリを検索
3. 各クエリの`folder_path`を`new_path`に置換
   - 例: `old_path="/開発環境"`, `new_path="/Dev"`
   - `/開発環境/ユーザー管理` → `/Dev/ユーザー管理`
4. `updated_at`を更新
5. 全クエリを保存

**TypeScript API仕様**:
```typescript
async renameFolder(oldPath: string, newPath: string): Promise<void>
```

**パラメータ**:
- `oldPath`: 現在のフォルダパス
- `newPath`: 新しいフォルダパス

**バリデーション**:
- フォルダ名の制約違反チェック（不正文字、最大長）
- 新しいフォルダパスが既存と重複しないか

**成功**: `void`

**エラーケース**:
- 不正なフォルダ名: `"Invalid folder name: {reason}"`
- 重複するフォルダパス: `"Folder already exists: {new_path}"`
- ストレージ保存エラー: `"Failed to rename folder: {error}"`

---

### 2.4 フォルダ削除API

#### FR-4: delete_folder

**概要**: 空のフォルダを削除（クエリが含まれる場合はエラー）

**Rust Command仕様**:
```rust
#[tauri::command]
async fn delete_folder(
    folder_path: String,
    state: State<'_, AppState>
) -> Result<(), String>
```

**処理内容**:
1. 全クエリを読み込み
2. `folder_path`が一致または子パスのクエリが存在するかチェック
   - 例: `folder_path="/開発環境"`の場合
   - `/開発環境` または `/開発環境/ユーザー管理` のようなパスを持つクエリを検索
3. クエリが存在する場合はエラー
4. クエリが存在しない場合は成功（フォルダはパスとして存在するだけなので実際の削除操作は不要）

**TypeScript API仕様**:
```typescript
async deleteFolder(folderPath: string): Promise<void>
```

**パラメータ**:
- `folderPath`: 削除対象のフォルダパス

**成功**: `void`

**エラーケース**:
- フォルダにクエリが含まれる: `"Cannot delete folder with queries: {folder_path}"`

---

### 2.5 検索API拡張

#### FR-5: search_saved_queries拡張

**概要**: 既存の検索APIに`folder_path`フィルタを追加

**Rust構造体拡張**:
```rust
#[derive(Deserialize)]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,  // 新規追加
}
```

**処理内容**:
1. 既存の検索ロジック（keyword, tags, connection_id）を実行
2. `folder_path`が指定されている場合、追加でフィルタリング
   - 完全一致で絞り込み（サブフォルダは含まない）

**TypeScript API仕様**:
```typescript
interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
  folderPath?: string  // 新規追加
}

async searchSavedQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]>
```

**成功レスポンス例**:
```json
[
  {
    "id": "query-001",
    "name": "ユーザー検索",
    "folder_path": "/開発環境",
    "connection_id": "conn-001",
    ...
  }
]
```

---

### 2.6 既存API互換性

#### FR-6: 既存APIの動作保証

**対象API**:
- `save_query`: `folder_path`が`null`の場合でも保存可能
- `load_query`: `folder_path`フィールドが正しく返される
- `delete_query`: フォルダに関わらず削除可能
- `search_saved_queries`: `folder_path`が`None`でも検索可能

**テスト内容**:
- 既存のクエリJSON（`folder_path`フィールドなし）を読み込み
- 正常にデシリアライズされ、`folder_path: None`として扱われることを確認
- 既存のテストケースを実行して回帰テストを実施

---

## 3. 非機能要件

### 3.1 パフォーマンス

| 要件 | 目標値 |
|------|--------|
| `list_folders`の実行時間（1000件のクエリ） | < 100ms |
| `move_query`の実行時間 | < 50ms |
| `rename_folder`の実行時間（配下に100件のクエリ） | < 500ms |
| `delete_folder`の実行時間 | < 100ms |

### 3.2 信頼性

- **データ整合性**: フォルダ名変更時に配下の全クエリのパスが正しく更新される
- **トランザクション性**: 複数クエリ更新中にエラーが発生した場合のロールバック（将来的に検討）
- **後方互換性**: `folder_path`フィールドがないJSONファイルも正常に読み込める

### 3.3 保守性

- **エラーメッセージ**: ユーザーにわかりやすいエラーメッセージを返す
- **ログ出力**: デバッグ時に役立つログを出力
- **コードの可読性**: Rustのベストプラクティスに従う

---

## 4. バリデーション仕様

### 4.1 フォルダ名の制約

| 制約項目 | 条件 | エラーメッセージ |
|---------|------|-----------------|
| 禁止文字 | `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `\|` を含まない | `"Invalid characters in folder name"` |
| 最大長 | 100文字以内 | `"Folder name too long (max 100 characters)"` |
| 空文字 | 空でない | `"Folder name cannot be empty"` |

### 4.2 フォルダパスの制約

| 制約項目 | 条件 | エラーメッセージ |
|---------|------|-----------------|
| 階層深さ | 10階層まで | `"Folder nesting too deep (max 10 levels)"` |
| パス形式 | `/`で始まる | `"Folder path must start with /"` |
| 連続スラッシュ | `//`を含まない | `"Invalid folder path format"` |

### 4.3 フォルダ削除の制約

| 制約項目 | 条件 | エラーメッセージ |
|---------|------|-----------------|
| 空フォルダ | 配下にクエリが存在しない | `"Cannot delete folder with queries"` |

---

## 5. API一覧

| API名 | Rust Command | TypeScript関数 | 説明 |
|------|-------------|---------------|------|
| フォルダ一覧取得 | `list_folders` | `listFolders()` | 全フォルダパスを取得 |
| クエリ移動 | `move_query` | `moveQuery(queryId, folderPath)` | クエリをフォルダに移動 |
| フォルダ名変更 | `rename_folder` | `renameFolder(oldPath, newPath)` | フォルダ名を変更 |
| フォルダ削除 | `delete_folder` | `deleteFolder(folderPath)` | 空フォルダを削除 |
| 検索拡張 | `search_saved_queries` | `searchSavedQueries(request)` | folderPathフィルタ追加 |

---

## 6. データフロー

### 6.1 フォルダ名変更時のデータフロー

```
フロントエンド
    │
    ▼
renameFolder(oldPath, newPath)
    │
    ▼
Tauri IPC
    │
    ▼
rename_folder コマンド
    │
    ▼
全クエリを読み込み
    │
    ▼
oldPathで始まるクエリを検索
    │
    ▼
各クエリのfolder_pathを置換
    │
    ▼
updated_atを更新
    │
    ▼
全クエリを保存
    │
    ▼
Result<(), String>
    │
    ▼
フロントエンドへ返却
```

### 6.2 クエリ移動時のデータフロー

```
フロントエンド
    │
    ▼
moveQuery(queryId, folderPath)
    │
    ▼
Tauri IPC
    │
    ▼
move_query コマンド
    │
    ▼
クエリを読み込み
    │
    ▼
folder_pathを更新
    │
    ▼
updated_atを更新
    │
    ▼
ストレージに保存
    │
    ▼
Result<(), String>
    │
    ▼
フロントエンドへ返却
```

---

## 7. エラーハンドリング

### 7.1 エラー分類

| エラー種別 | HTTPステータス相当 | 対応方法 |
|-----------|------------------|---------|
| バリデーションエラー | 400 Bad Request | ユーザーに修正を促すメッセージ |
| リソース不在エラー | 404 Not Found | クエリIDやフォルダパスの確認を促す |
| ストレージエラー | 500 Internal Server Error | システムエラーとして通知 |

### 7.2 エラーメッセージ形式

```rust
// 成功
Ok(result)

// エラー
Err(format!("Failed to {operation}: {error_details}"))
```

**例**:
- `"Failed to move query: Query not found: query-123"`
- `"Failed to rename folder: Invalid folder name"`
- `"Failed to delete folder: Folder contains queries"`

---

## 8. テスト要件

### 8.1 単体テスト（Rust）

| テスト対象 | テストケース |
|-----------|-------------|
| `list_folders` | 空の場合、複数フォルダがある場合、nullを除外する |
| `move_query` | 正常系（クエリが移動）、異常系（存在しないクエリID） |
| `rename_folder` | 正常系（配下のクエリも更新）、異常系（重複フォルダパス） |
| `delete_folder` | 正常系（空フォルダ削除）、異常系（クエリ含むフォルダ） |
| 後方互換性 | `folder_path`フィールドなしのJSONを正常に読み込み |

### 8.2 統合テスト（TypeScript）

| テスト対象 | テストケース |
|-----------|-------------|
| API呼び出し | 全APIが正常に呼び出せる |
| エラーハンドリング | エラーが適切にキャッチされる |
| 型安全性 | TypeScript型定義と実際のレスポンスが一致 |

### 8.3 既存API互換性テスト

| テスト対象 | テストケース |
|-----------|-------------|
| `save_query` | `folder_path: null`で保存可能 |
| `load_query` | `folder_path`が正しく返される |
| `delete_query` | フォルダに関わらず削除可能 |
| `search_saved_queries` | `folder_path`なしでも検索可能 |

---

## 9. セキュリティ考慮事項

### 9.1 入力検証

- **フォルダパスのサニタイズ**: パストラバーサル攻撃（`../`等）を防ぐ
- **SQLインジェクション防止**: 該当なし（JSONファイルベースストレージ）
- **XSS防止**: フォルダ名のHTMLエスケープ（フロントエンド側で実施）

### 9.2 権限管理

- **現時点では該当なし**: 将来的にマルチユーザー対応時に検討

---

## 10. 受け入れ基準

### 10.1 必須機能

- [ ] `list_folders` APIが正常に動作する
- [ ] `move_query` APIでクエリを移動できる
- [ ] `rename_folder` APIでフォルダ名を変更でき、配下のクエリも更新される
- [ ] `delete_folder` APIで空フォルダを削除できる
- [ ] `search_saved_queries` APIに`folder_path`フィルタが追加され、正常に動作する
- [ ] 既存API（`save_query`, `load_query`, `delete_query`）が正常に動作する

### 10.2 非機能要件

- [ ] パフォーマンス要件を満たす
- [ ] 後方互換性テストが全てパスする
- [ ] エラーメッセージがユーザーフレンドリーである

### 10.3 品質

- [ ] 単体テストが全てパスする
- [ ] 統合テストが全てパスする
- [ ] コードレビューが完了している

---

## 11. 制約事項

### 11.1 技術的制約

- **ストレージ形式**: JSONファイルベース（FileStorage）
- **トランザクション**: ファイルシステムレベルのトランザクション未サポート
- **同時アクセス**: 単一ユーザー前提（マルチユーザー対応は将来的に検討）

### 11.2 スコープ外

- フロントエンドUI実装（Phase 4）
- Piniaストア実装（Phase 3）
- ドラッグ&ドロップ機能（Phase 3-4）
- フォルダのドラッグ&ドロップ（Phase 2以降）

---

## 12. 依存関係

### 12.1 前提条件（Phase 1完了事項）

- [ ] TypeScript型定義の更新完了
- [ ] Rust構造体の更新完了
- [ ] 既存JSONファイルとの後方互換性確保

### 12.2 Phase 2完了後の次ステップ

- **Phase 3**: Piniaストア実装
- **Phase 4**: UIコンポーネント実装

---

## 13. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| フォルダ名変更時の大量更新でパフォーマンス低下 | 中 | バッチ処理の最適化、進捗表示 |
| 既存JSONファイルとの非互換 | 低 | Option型による後方互換性確保済み |
| ストレージエラー時のデータ不整合 | 中 | エラー時のロールバック実装（将来） |
| バリデーション漏れによる不正データ | 低 | 包括的なバリデーション実装 |

---

## 14. 参考資料

### 14.1 関連ドキュメント

- [保存クエリのフォルダ管理機能 - 要件定義書](../../local/20260124_保存クエリ管理/requirements.md)
- [保存クエリのフォルダ管理機能 - WBS](../../local/20260124_保存クエリ管理/tasklist.md)
- [技術仕様書](../../steering/03_architecture_specifications.md)
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md)

### 14.2 参考実装

- 既存の`query_storage_commands.rs`
- 既存の`app/api/query-storage.ts`

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-24 | 1.0 | 初版作成 | - |
