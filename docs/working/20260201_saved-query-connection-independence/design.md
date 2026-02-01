# 設計書 - 保存クエリの接続非依存化

**作成日**: 2026-02-01
**要件名**: saved-query-connection-independence
**作業タイプ**: 新規機能開発（既存機能の改善）
**親要件**: [requirements.md](./requirements.md)

---

## アーキテクチャ

### 対象コンポーネント

```
┌─────────────────────────────────────────────┐
│  SQLエディタ / クエリビルダー                 │
│  (app/pages/sql-editor.vue)                 │
│  (app/pages/query-builder.vue)              │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Piniaストア                                 │
│  - useSqlEditorStore                        │
│  - useSavedQueryStore                       │
└─────────────────┬───────────────────────────┘
                  │ invoke()
┌─────────────────▼───────────────────────────┐
│  Tauri API Wrapper                          │
│  - app/api/sql-editor.ts                    │
│  - app/api/query-storage.ts                 │
└─────────────────┬───────────────────────────┘
                  │ IPC
┌─────────────────▼───────────────────────────┐
│  Rust Commands                              │
│  - save_sql_query                           │
│  - list_sql_queries                         │
│  - save_query (クエリビルダー)               │
│  - search_saved_queries (クエリビルダー)     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Storage Services                           │
│  - SqlEditorQueryStorage                    │
│  - QueryStorage                             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  JSON File Storage                          │
│  ~/.sql-query-build/sql-editor-queries/     │
│  ~/.sql-query-build/saved-queries/          │
└─────────────────────────────────────────────┘
```

### 影響範囲

- **フロントエンド**:
  - `app/stores/sql-editor.ts` - 保存クエリ読み込み時の接続IDフィルタ削除
  - `app/stores/saved-query.ts` - 保存クエリ読み込み時の接続IDフィルタ削除
  - `app/components/sql-editor/dialogs/SaveQueryDialog.vue` - 接続選択UI削除
  - `app/components/query-builder/dialog/SaveQueryDialog.vue` - 接続選択UI削除（必要に応じて）

- **バックエンド**:
  - `src-tauri/src/commands/sql_editor.rs` - バリデーション関数の修正
  - `src-tauri/src/commands/query_storage_commands.rs` - バリデーション関数の修正

- **ドキュメント**:
  - `docs/steering/features/query-builder.md` - 機能詳細仕様の更新

---

## 実装方針

### 概要

1. **バックエンド修正**: `connectionId` の必須バリデーションを削除し、オプショナルとして扱う
2. **フロントエンド修正**: 保存クエリ一覧取得時に接続IDでフィルタしないように変更
3. **UI修正**: 保存ダイアログから接続選択UIを削除（SQLエディタ側のみ、クエリビルダーは既にUI削除済み）
4. **下位互換性**: 既存の保存クエリ（connectionIdが設定されているもの）も引き続き表示・使用可能

### 詳細

#### 1. バックエンド修正（Rust）

**ファイル**: `src-tauri/src/commands/sql_editor.rs`

- `validate_save_request()` 関数から `connectionId` の必須チェックを削除
- 空文字列チェックは削除するが、データモデルは変更しない（既に `Option<String>`）

**ファイル**: `src-tauri/src/commands/query_storage_commands.rs`

- 同様に `validate_save_request()` から `connectionId` の必須チェックを削除

#### 2. フロントエンド修正（TypeScript）

**ファイル**: `app/stores/sql-editor.ts`

- `loadSavedQueries()` アクション: 接続IDを渡さないように修正
- `saveQuery()` アクション: `connectionId: null` を設定

**ファイル**: `app/stores/saved-query.ts`

- `fetchQueries()` アクション: 検索リクエストで `connectionId` を指定しない

#### 3. UI修正（Vue）

**ファイル**: `app/components/sql-editor/dialogs/SaveQueryDialog.vue`

- 接続選択フィールドを削除
- 保存時に `connectionId: null` を設定

**注意**: クエリビルダー側の `SaveQueryDialog.vue` は既に接続選択UIがないため、修正不要（確認のみ）

---

## データ構造

### 型定義（TypeScript）

既存の型定義をそのまま使用（変更なし）:

```typescript
// app/types/saved-query.ts
export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null
  connectionId: string | null  // 既にnullable
  query: SerializableBuilderState
  createdAt: string
  updatedAt: string
}

export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null
  connectionId: string | null  // 既にnullable
  createdAt: string
  updatedAt: string
}

export interface SaveQueryRequest {
  id?: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null
  connectionId: string | null  // 既にnullable
  query: SerializableBuilderState
}
```

**SQLエディタ用の型定義も同様**:

```typescript
// app/types/sql-editor.ts
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null
  connectionId: string  // ← 注意: こちらは現在必須型だが、実際にはnullableに変更済み
  createdAt: string
  updatedAt: string
}
```

### 型定義（Rust）

既存の型定義をそのまま使用（変更なし）:

```rust
// src-tauri/src/models/saved_query.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub connection_id: Option<String>,  // 既にOption
    pub query: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

// src-tauri/src/models/sql_editor_query.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorQuery {
    pub id: String,
    pub connection_id: String,  // ← 注意: こちらは必須型だが、実装では既にOptionとして扱われている
    pub name: String,
    pub description: String,
    pub sql: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

**重要**: `SqlEditorQuery` の `connection_id` フィールドは型定義上は `String` だが、実際の使用では空文字列を許容している実装になっている。今回の修正で、この矛盾を解消する。

---

## API設計

### 変更が必要なTauriコマンド

#### 1. `save_sql_query` (SQLエディタ)

**ファイル**: `src-tauri/src/commands/sql_editor.rs`

**変更前のバリデーション**:
```rust
fn validate_save_request(request: &SaveSqlEditorQueryRequest) -> Result<(), String> {
    // ... 他のバリデーション ...

    if request.connection_id.trim().is_empty() {
        return Err("接続IDが指定されていません".to_string());
    }

    // ...
}
```

**変更後のバリデーション**:
```rust
fn validate_save_request(request: &SaveSqlEditorQueryRequest) -> Result<(), String> {
    // ... 他のバリデーション ...

    // connection_idのバリデーションを削除
    // オプショナルフィールドとして扱う

    // ...
}
```

#### 2. `list_sql_queries` (SQLエディタ)

**ファイル**: `src-tauri/src/commands/sql_editor.rs`

**変更前**:
```rust
#[tauri::command]
pub async fn list_sql_queries(
    connection_id: Option<String>,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<Vec<SqlEditorQueryMetadata>, String> {
    let mut queries = storage.list_queries()?;

    if let Some(connection_id) = connection_id {
        queries.retain(|q| q.connection_id == connection_id);
    }

    Ok(queries)
}
```

**変更後**:
```rust
#[tauri::command]
pub async fn list_sql_queries(
    connection_id: Option<String>,
    storage: State<'_, Arc<SqlEditorQueryStorage>>,
) -> Result<Vec<SqlEditorQueryMetadata>, String> {
    let queries = storage.list_queries()?;

    // 接続IDでのフィルタリングを削除
    // すべてのクエリを返す

    Ok(queries)
}
```

**注意**: パラメータ `connection_id` は互換性のため残すが、使用しない。将来的には削除を検討。

#### 3. `save_query` (クエリビルダー)

**ファイル**: `src-tauri/src/commands/query_storage_commands.rs`

同様に `validate_save_request()` から `connectionId` の必須チェックを削除。

#### 4. `search_saved_queries` (クエリビルダー)

**ファイル**: `src-tauri/src/services/query_storage.rs`

検索機能は既に `connectionId` でのフィルタがオプショナルなので、変更不要（確認のみ）。

---

## フロントエンド実装詳細

### 1. SQLエディタストアの修正

**ファイル**: `app/stores/sql-editor.ts`

**変更箇所1**: `loadSavedQueries()` アクション

**変更前**:
```typescript
async loadSavedQueries() {
  if (!this.connectionId) return
  this.isSavedQueriesLoading = true
  this.savedQueryError = null

  try {
    const queries = await sqlEditorApi.listQueries(this.connectionId)
    this.savedQueries = queries
    // ...
  } catch (error) {
    // ...
  }
}
```

**変更後**:
```typescript
async loadSavedQueries() {
  // 接続IDのチェックを削除
  this.isSavedQueriesLoading = true
  this.savedQueryError = null

  try {
    // 接続IDを渡さない（全クエリを取得）
    const queries = await sqlEditorApi.listQueries()
    this.savedQueries = queries
    // ...
  } catch (error) {
    // ...
  }
}
```

**変更箇所2**: `saveQuery()` アクション内で `connectionId: null` を設定

**変更前**:
```typescript
const request: SaveQueryRequest = {
  id: options.id,
  name: options.name,
  description: options.description,
  tags: options.tags || [],
  folderPath: options.folderPath,
  connectionId: this.connectionId!,  // 現在の接続IDを使用
  sql: this.sql,
}
```

**変更後**:
```typescript
const request: SaveQueryRequest = {
  id: options.id,
  name: options.name,
  description: options.description,
  tags: options.tags || [],
  folderPath: options.folderPath,
  connectionId: null,  // 接続非依存にする
  sql: this.sql,
}
```

### 2. クエリビルダーストアの修正

**ファイル**: `app/stores/saved-query.ts`

**変更箇所**: `fetchQueries()` アクション

**変更前**:
```typescript
async fetchQueries() {
  this.isLoading = true
  this.error = null
  try {
    const request: SearchQueryRequest = {
      keyword: this.searchKeyword || undefined,
      tags: this.searchTags.length > 0 ? this.searchTags : undefined,
      connectionId: this.currentConnectionId || undefined,  // ← 削除
      folderPath: this.currentFolderPath || undefined,
    }
    this.queries = await queryStorageApi.searchSavedQueries(request)
  } catch (e) {
    // ...
  }
}
```

**変更後**:
```typescript
async fetchQueries() {
  this.isLoading = true
  this.error = null
  try {
    const request: SearchQueryRequest = {
      keyword: this.searchKeyword || undefined,
      tags: this.searchTags.length > 0 ? this.searchTags : undefined,
      // connectionId を削除（全接続のクエリを取得）
      folderPath: this.currentFolderPath || undefined,
    }
    this.queries = await queryStorageApi.searchSavedQueries(request)
  } catch (e) {
    // ...
  }
}
```

### 3. 保存ダイアログの修正（SQLエディタ）

**ファイル**: `app/components/sql-editor/dialogs/SaveQueryDialog.vue`

**変更前の接続選択フィールド（削除対象）**:
```vue
<UFormField
  :label="t('sqlEditor.saveQuery.fields.connection.label')"
  name="connection"
>
  <USelect
    v-model="form.connectionId"
    :items="connectionItems"
  />
</UFormField>
```

**変更後**: このフィールド全体を削除

**保存ロジックの変更**:
```typescript
// 変更前
const handleSave = async () => {
  await sqlEditorStore.saveQuery({
    // ...
    connectionId: form.connectionId,  // ← 削除
  })
}

// 変更後
const handleSave = async () => {
  await sqlEditorStore.saveQuery({
    // ...
    connectionId: null,  // または、このフィールド自体を削除
  })
}
```

### 4. API呼び出しの修正

**ファイル**: `app/api/sql-editor.ts`

**変更前**:
```typescript
async listQueries(connectionId: string): Promise<SavedQueryMetadata[]> {
  return await invoke<SavedQueryMetadata[]>('list_sql_queries', { connectionId })
}
```

**変更後**:
```typescript
async listQueries(connectionId?: string): Promise<SavedQueryMetadata[]> {
  // connectionIdはオプショナルにして、指定されない場合は全クエリを取得
  return await invoke<SavedQueryMetadata[]>('list_sql_queries', {
    connectionId: connectionId || null
  })
}
```

---

## 多言語対応チェック

### 設計時のチェックリスト

- [x] ハードコードされた文字列がないか確認 → 既存の翻訳キーを使用
- [x] 翻訳キー構造を設計 → 接続選択UIを削除するため、翻訳キーの削除のみ
- [x] ja.json と en.json への追加内容を定義 → 追加なし、削除のみ
- [x] 動的な値のプレースホルダーを設計 → 該当なし
- [x] 条件分岐がある場合、各条件の翻訳キーを定義 → 該当なし
- [x] 日付・時刻表示はロケール対応を考慮 → 変更なし
- [x] バリデーションエラーメッセージも翻訳キーで管理 → 変更なし

### 翻訳キーの変更

**削除対象の翻訳キー** (SQLエディタの保存ダイアログ):

```json
{
  "sqlEditor": {
    "saveQuery": {
      "fields": {
        "connection": {
          "label": "接続",  // ← 削除
          "placeholder": "接続を選択"  // ← 削除
        }
      }
    }
  }
}
```

**注意**: これらの翻訳キーは実際には削除せず、そのまま残しておく（将来的に接続フィルタ機能を追加する可能性があるため）。

---

## テストコード

### ユニットテスト例

**ファイル**: `tests/stores/sql-editor.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '@/stores/sql-editor'

// モック
vi.mock('@/api/sql-editor', () => ({
  sqlEditorApi: {
    listQueries: vi.fn(),
    saveQuery: vi.fn(),
  },
}))

describe('useSqlEditorStore - 保存クエリの接続非依存化', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadSavedQueries()は接続IDを渡さずに全クエリを取得する', async () => {
    const store = useSqlEditorStore()
    const { sqlEditorApi } = await import('@/api/sql-editor')

    // モックの設定
    vi.mocked(sqlEditorApi.listQueries).mockResolvedValue([
      {
        id: 'q1',
        name: 'Query 1',
        description: '',
        tags: [],
        folderPath: null,
        connectionId: null,
        createdAt: '2026-02-01',
        updatedAt: '2026-02-01',
      },
    ])

    await store.loadSavedQueries()

    // 接続IDを渡していないことを確認
    expect(sqlEditorApi.listQueries).toHaveBeenCalledWith()
    expect(store.savedQueries).toHaveLength(1)
  })

  it('saveQuery()はconnectionId: nullで保存する', async () => {
    const store = useSqlEditorStore()
    const { sqlEditorApi } = await import('@/api/sql-editor')

    store.connectionId = 'test-connection-id'
    store.sql = 'SELECT * FROM users'

    vi.mocked(sqlEditorApi.saveQuery).mockResolvedValue({
      id: 'new-query',
      name: 'New Query',
      description: '',
      tags: [],
      folderPath: null,
      connectionId: null,
      sql: 'SELECT * FROM users',
      createdAt: '2026-02-01',
      updatedAt: '2026-02-01',
    })

    await store.saveQuery({
      name: 'New Query',
      description: '',
      tags: [],
      updateEditor: false,
    })

    // connectionId: null で保存されることを確認
    expect(sqlEditorApi.saveQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: null,
      })
    )
  })
})
```

### Rustテスト例

**ファイル**: `src-tauri/src/commands/sql_editor.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_save_request_without_connection_id() {
        let request = SaveSqlEditorQueryRequest {
            id: None,
            name: "Test Query".to_string(),
            description: Some("Test description".to_string()),
            sql: "SELECT * FROM users".to_string(),
            tags: vec![],
            folder_path: None,
            connection_id: "".to_string(),  // 空文字列
        };

        // connectionIdが空でもバリデーションエラーにならないことを確認
        let result = validate_save_request(&request);
        assert!(result.is_ok());
    }

    #[test]
    fn test_list_queries_returns_all_queries() {
        // list_sql_queries が接続IDに関係なく全クエリを返すことを確認
        // （実際の実装では統合テストで確認）
    }
}
```

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `connectionId` を完全に削除せず、nullable として維持 | 既存のデータモデルとの互換性を保つため | `connectionId` フィールドを完全削除（破壊的変更） |
| バックエンドのAPIパラメータ `connectionId` を残す | フロントエンドとの互換性を保つため（将来的に削除検討） | すぐにパラメータを削除（破壊的変更） |
| フロントエンドで `connectionId: null` を明示的に設定 | 意図を明確にするため | フィールド自体を省略 |
| 接続選択UIを削除（SQLエディタ側のみ） | 保存時に接続を選択する必要がなくなるため | UIは残してデフォルトでnullを設定 |
| クエリ履歴は接続ごとに管理を継続 | 履歴は「どの接続で実行したか」の記録として意味があるため | 履歴も接続非依存にする |

---

## 未解決事項

- [ ] パフォーマンステスト: 大量の保存クエリ（100件以上）が存在する場合のパフォーマンスを確認
- [ ] ユーザーフィードバック: 実際のユーザーが接続フィルタなしで問題ないか確認
- [ ] 将来的な機能追加: 「最近使用したクエリ」「お気に入り」等のスマートフィルタの検討

---

## 実装チェックリスト

### Phase 1: バックエンド修正
- [ ] `src-tauri/src/commands/sql_editor.rs` の `validate_save_request()` を修正
- [ ] `src-tauri/src/commands/query_storage_commands.rs` の `validate_save_request()` を修正（確認）
- [ ] `src-tauri/src/commands/sql_editor.rs` の `list_sql_queries()` を修正
- [ ] Rustのユニットテスト追加

### Phase 2: フロントエンド修正（ストア）
- [ ] `app/stores/sql-editor.ts` の `loadSavedQueries()` を修正
- [ ] `app/stores/sql-editor.ts` の `saveQuery()` を修正
- [ ] `app/stores/saved-query.ts` の `fetchQueries()` を修正
- [ ] `app/api/sql-editor.ts` の `listQueries()` シグネチャを修正

### Phase 3: フロントエンド修正（UI）
- [ ] `app/components/sql-editor/dialogs/SaveQueryDialog.vue` から接続選択フィールドを削除
- [ ] クエリビルダーの `SaveQueryDialog.vue` を確認（既に対応済みか確認）

### Phase 4: テストと検証
- [ ] フロントエンドのユニットテスト追加
- [ ] 手動テスト: 既存の保存クエリが表示されるか確認
- [ ] 手動テスト: 新規保存クエリが正しく保存されるか確認
- [ ] 手動テスト: 異なる接続で同じクエリを読み込めるか確認

### Phase 5: ドキュメント更新
- [ ] `docs/steering/features/query-builder.md` を更新
- [ ] `docs/steering/06_ubiquitous_language.md` を確認・更新（必要に応じて）

---

## 参考資料

- [docs/working/20260125_SQLエディタ用保存クエリ管理/design.md](../20260125_SQLエディタ用保存クエリ管理/design.md)
- [docs/steering/03_architecture_specifications.md](../../steering/03_architecture_specifications.md)
- [docs/steering/04_repository_structure.md](../../steering/04_repository_structure.md)
- [docs/steering/05_development_guidelines.md](../../steering/05_development_guidelines.md)
