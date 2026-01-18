# 設計書 - SQLエディタ Phase 4: クエリ保存機能

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vue/Nuxt)                                         │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ SqlEditorLayout  │  │ SqlEditorToolbar                │ │
│  │ ├─ SavedQueryPanel│  │ └─ 保存ボタン追加              │ │
│  │ ├─ SqlTextEditor │  └─────────────────────────────────┘ │
│  │ └─ ResultPanel   │                                      │
│  └──────────────────┘  ┌─────────────────────────────────┐ │
│                        │ SaveQueryDialog                 │ │
│  ┌──────────────────┐  │ (新規/編集)                     │ │
│  │ sql-editor.ts    │  └─────────────────────────────────┘ │
│  │ (Pinia Store)    │                                      │
│  │ ├─ state         │                                      │
│  │ ├─ actions       │                                      │
│  │ └─ getters       │                                      │
│  └────────┬─────────┘                                      │
│           │ invoke()                                        │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│ Tauri API (Rust)                                            │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Tauri Commands   │  │ Services                        │ │
│  │                  │  │                                 │ │
│  │ save_query       ├─→│ QueryStorage                    │ │
│  │ load_query       │  │ ├─ save_query()                │ │
│  │ update_query     │  │ ├─ load_query()                │ │
│  │ delete_query     │  │ ├─ delete_query()              │ │
│  │ list_queries     │  │ └─ list_queries()              │ │
│  │ search_queries   │  └─────────┬───────────────────────┘ │
│  └──────────────────┘            │                         │
│                                  │                         │
│  ┌──────────────────┐            │                         │
│  │ Models           │            │                         │
│  │ SavedQuery       │◄───────────┘                         │
│  └──────────────────┘                                      │
└───────────┬─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│ File System                                                 │
│                                                             │
│  {data_dir}/queries/                                        │
│    ├─ saved_builder/  (クエリビルダー用、既存)              │
│    │    └─ {query_id}.json                                  │
│    └─ saved_editor/   (SQLエディタ用、新規)                 │
│         ├─ {query_id}.json (メタデータ)                     │
│         └─ {query_id}.sql  (SQL本文)                        │
└─────────────────────────────────────────────────────────────┘
```

### 影響範囲

#### フロントエンド

- **新規作成**:
  - `app/components/sql-editor/SavedQueryPanel.vue` - 保存クエリ一覧パネル
  - `app/components/sql-editor/SaveQueryDialog.vue` - 保存/編集ダイアログ
  - `app/api/sql-editor.ts` - SQLエディタAPI（Tauriコマンドラッパー）

- **更新**:
  - `app/components/sql-editor/SqlEditorLayout.vue` - サイドパネル統合
  - `app/components/sql-editor/SqlEditorToolbar.vue` - 保存ボタン追加
  - `app/stores/sql-editor.ts` - 保存クエリ管理ロジック追加
  - `app/types/sql-editor.ts` - 型定義追加

#### バックエンド

- **新規作成**:
  - `src-tauri/src/models/sql_editor_query.rs` - SQLエディタ専用モデル（`SqlEditorQuery`等）
  - `src-tauri/src/services/sql_editor_query_storage.rs` - SQLエディタ専用ストレージサービス（`saved_editor/` を使用）
  - `src-tauri/src/commands/sql_editor.rs` - SQLエディタ専用Tauriコマンド

- **更新**:
  - `src-tauri/src/storage/path_manager.rs` - `saved_editor_dir()` メソッドを追加
  - `src-tauri/src/lib.rs` - コマンド登録

- **既存利用（変更なし）**:
  - `src-tauri/src/models/saved_query.rs` - クエリビルダー用モデル（既存のまま）
  - `src-tauri/src/services/query_storage.rs` - クエリビルダー用サービス（`saved_builder/` を使用）

## 実装方針

### 概要

Phase 4では、既に実装されている `QueryStorage` サービスを活用し、SQLエディタ専用のUI/UXを構築する。バックエンドのモデル定義を調整し、フロントエンドではPiniaストアを中心にクエリ管理ロジックを実装する。

### 詳細

1. **ストレージの分離とファイル形式**
   - SQLエディタ用のクエリは `{data_dir}/queries/saved_editor/` に保存
   - クエリビルダー用は `{data_dir}/queries/saved_builder/` に保存（既存）
   - SQLエディタは2ファイル構成:
     - `{query_id}.json` - メタデータ（名前、説明、タグ、日時）
     - `{query_id}.sql` - SQL本文（純粋なSQLファイル）
   - メリット: 可読性向上、外部編集可能、Git差分が見やすい

2. **既存資産の活用と調整**
   - `src-tauri/src/services/query_storage.rs` の基盤を活用
   - SQLエディタ専用の `SqlEditorQueryStorage` を新規作成（`saved_editor/` を使用）
   - 既存の `SavedQuery` モデルを調整して使用（`query: serde_json::Value` → `sql: String`）

3. **バックエンド実装**
   - `saved_query.rs` に SQLエディタ用のモデルを追加（既存と別構造）:
     - `SqlEditorQuery` - SQL文字列を保存
     - `SavedQuery` - クエリビルダー用（既存、変更なし）
   - `path_manager.rs` に `saved_editor_dir()` メソッドを追加
   - `sql_editor.rs` コマンドを新規作成
   - コマンド一覧:
     - `save_sql_query` - クエリ保存（新規/更新）
     - `load_sql_query` - クエリ読み込み
     - `list_sql_queries` - 一覧取得（メタデータのみ）
     - `search_sql_queries` - 検索
     - `delete_sql_query` - 削除

4. **データモデルの分離**
   - クエリビルダー: `SavedQuery { query: serde_json::Value }` - 既存のまま
   - SQLエディタ: `SqlEditorQuery { sql: String }` - 新規追加

5. **フロントエンド実装**
   - Piniaストア (`sql-editor.ts`) に保存クエリ管理ロジックを追加
   - サイドパネルコンポーネント (`SavedQueryPanel.vue`) で一覧表示・検索
   - ダイアログコンポーネント (`SaveQueryDialog.vue`) で保存/編集
   - ツールバーに保存ボタン追加（Ctrl/Cmd+Sショートカット対応）

6. **データフロー**
   ```
   ユーザー操作
     → ツールバー「保存」ボタンクリック
     → SaveQueryDialog表示
     → フォーム入力（名前、説明、タグ）
     → ストアのsaveQuery()呼び出し
     → api/sql-editor.ts経由でTauriコマンド実行
     → SqlEditorQueryStorage.save_query()でファイル保存:
       1. {data_dir}/queries/saved_editor/{query_id}.json (メタデータ)
       2. {data_dir}/queries/saved_editor/{query_id}.sql (SQL本文)
     → ストアの保存クエリリスト更新
     → SavedQueryPanelに反映
   ```

7. **検索機能**
   - クライアントサイドで実装（Rustのsearch_queriesも利用可能）
   - 検索対象: クエリ名、説明、タグ、SQL本文
   - リアルタイム絞り込み（computedで実装）

## データ構造

### 型定義（TypeScript）

```typescript
/**
 * 保存クエリ（完全版）
 */
export interface SavedQuery {
  /** UUID */
  id: string
  /** 接続ID */
  connectionId: string
  /** クエリ名（必須、最大100文字） */
  name: string
  /** 説明（任意、最大500文字） */
  description?: string
  /** SQL本文 */
  sql: string
  /** タグ（配列） */
  tags: string[]
  /** 作成日時（ISO 8601形式） */
  createdAt: string
  /** 更新日時（ISO 8601形式） */
  updatedAt: string
}

/**
 * 保存クエリメタデータ（一覧表示用）
 */
export interface SavedQueryMetadata {
  id: string
  connectionId: string
  name: string
  description?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * クエリ保存リクエスト
 */
export interface SaveQueryRequest {
  /** ID（更新時のみ指定） */
  id?: string
  /** 接続ID */
  connectionId: string
  /** クエリ名 */
  name: string
  /** 説明 */
  description?: string
  /** SQL本文 */
  sql: string
  /** タグ */
  tags: string[]
}

/**
 * クエリ検索リクエスト
 */
export interface SearchQueryRequest {
  /** キーワード（名前、説明で検索） */
  keyword?: string
  /** タグフィルタ */
  tags?: string[]
  /** 接続ID */
  connectionId?: string
}
```

### 型定義（Rust）

**SQLエディタ専用のモデル（新規作成）:**

```rust
/// SQLエディタ用の保存クエリ（完全版、メモリ上）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorQuery {
    pub id: String,
    pub connection_id: String,
    pub name: String,
    pub description: String,  // フロントエンドではOptionalだが、Rustでは空文字で扱う
    pub sql: String,          // SQL文字列（メモリ上で保持、ファイルは別）
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// SQLエディタ用の保存クエリメタデータ（一覧表示用、{query_id}.jsonに保存）
/// 注: SQL本文は含まれない（別ファイル {query_id}.sql として保存）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlEditorQueryMetadata {
    pub id: String,
    pub connection_id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    // 注: sqlフィールドは含まれない（別ファイル）
}

/// SQLエディタ用のクエリ保存リクエスト
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSqlEditorQueryRequest {
    pub id: Option<String>,
    pub connection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub sql: String,
    pub tags: Vec<String>,
}

/// SQLエディタ用の検索リクエスト
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSqlEditorQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
}
```

**既存のクエリビルダー用モデル（変更なし）:**

```rust
/// クエリビルダー用の保存クエリ（既存、変更なし）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub connection_id: String,
    pub name: String,
    pub description: String,
    pub query: serde_json::Value,  // クエリビルダーのJSON構造
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `save_sql_query` | `SaveSqlEditorQueryRequest` | `Result<SqlEditorQuery, String>` | クエリを保存（新規/更新）。2ファイル作成: `{id}.json` + `{id}.sql` |
| `load_sql_query` | `id: String` | `Result<SqlEditorQuery, String>` | 指定IDのクエリを完全な形で読み込む（JSONとSQLを結合） |
| `list_sql_queries` | `connection_id: Option<String>` | `Result<Vec<SqlEditorQueryMetadata>, String>` | 保存クエリ一覧を取得（`.json`ファイルのみ読み込み、SQL本文は含まない） |
| `search_sql_queries` | `SearchSqlEditorQueryRequest` | `Result<Vec<SqlEditorQueryMetadata>, String>` | クエリを検索（SQL本文も検索する場合は`.sql`ファイルも読み込む） |
| `delete_sql_query` | `id: String` | `Result<(), String>` | クエリを削除（`.json`と`.sql`の両方を削除） |

### フロントエンドAPI (`app/api/sql-editor.ts`)

```typescript
import { invoke } from '@tauri-apps/api/core'
import type {
  SavedQuery,
  SavedQueryMetadata,
  SaveQueryRequest,
  SearchQueryRequest,
} from '~/types/sql-editor'

/**
 * クエリを保存
 */
export async function saveQuery(request: SaveQueryRequest): Promise<SavedQuery> {
  return await invoke<SavedQuery>('save_sql_query', { request })
}

/**
 * クエリを読み込み
 */
export async function loadQuery(id: string): Promise<SavedQuery> {
  return await invoke<SavedQuery>('load_sql_query', { id })
}

/**
 * 保存クエリ一覧を取得
 */
export async function listQueries(connectionId?: string): Promise<SavedQueryMetadata[]> {
  return await invoke<SavedQueryMetadata[]>('list_sql_queries', { connectionId })
}

/**
 * クエリを検索
 */
export async function searchQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]> {
  return await invoke<SavedQueryMetadata[]>('search_sql_queries', { request })
}

/**
 * クエリを削除
 */
export async function deleteQuery(id: string): Promise<void> {
  return await invoke<void>('delete_sql_query', { id })
}
```

## ストレージ実装の詳細

### ファイル構成例

```
{data_dir}/queries/saved_editor/
├── 550e8400-e29b-41d4-a716-446655440000.json
├── 550e8400-e29b-41d4-a716-446655440000.sql
├── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.json
└── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.sql
```

### ファイル内容例

**550e8400-e29b-41d4-a716-446655440000.json** (メタデータ):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "connectionId": "conn-123",
  "name": "月次売上レポート",
  "description": "月次の売上集計クエリ",
  "tags": ["売上", "レポート", "月次"],
  "createdAt": "2026-01-18T12:00:00Z",
  "updatedAt": "2026-01-18T15:30:00Z"
}
```

**550e8400-e29b-41d4-a716-446655440000.sql** (SQL本文):
```sql
-- 月次売上レポート
WITH monthly_sales AS (
  SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS total_amount,
    COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
  month,
  total_amount,
  order_count,
  total_amount / order_count AS avg_order_value
FROM monthly_sales
ORDER BY month DESC
LIMIT 12;
```

### ストレージサービスの実装ポイント

#### `SqlEditorQueryStorage::save_query()`

1. UUIDの生成（新規の場合）
2. 日時の設定（created_at, updated_at）
3. **メタデータをJSONファイルに保存** (`{id}.json`)
   - `SqlEditorQueryMetadata` 構造体をシリアライズ
   - pretty-print形式で書き込み
4. **SQL本文をSQLファイルに保存** (`{id}.sql`)
   - UTF-8プレーンテキストとして書き込み
   - 改行はそのまま保持

#### `SqlEditorQueryStorage::load_query()`

1. **メタデータを読み込み** (`{id}.json`)
   - `SqlEditorQueryMetadata` としてデシリアライズ
2. **SQL本文を読み込み** (`{id}.sql`)
   - UTF-8テキストとして読み込み
3. **結合して `SqlEditorQuery` を返す**

#### `SqlEditorQueryStorage::list_queries()`

1. ディレクトリ内の `.json` ファイルを列挙
2. 各JSONファイルを読み込み、`SqlEditorQueryMetadata` にデシリアライズ
3. `.sql` ファイルは読み込まない（一覧表示にSQL本文は不要）
4. 更新日時順（降順）にソート

#### `SqlEditorQueryStorage::search_queries()`

1. `list_queries()` でメタデータ一覧を取得
2. キーワード検索が名前・説明・タグに該当するかチェック
3. **SQL本文も検索対象の場合**: 対応する `.sql` ファイルを読み込んで検索
4. フィルタリング後の結果を返す

#### `SqlEditorQueryStorage::delete_query()`

1. **`.json` ファイルを削除**
2. **`.sql` ファイルを削除**
3. 両方が正常に削除されたことを確認

## UI設計

### 画面構成

```
┌──────────────────────────────────────────────────────────────┐
│ SqlEditorToolbar                                             │
│ [▶実行] [■停止] [💾保存] [📋履歴] | DB名 | 環境               │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│ SavedQueryPanel│  SqlTextEditor                              │
│ ┌────────────┐ │  ┌──────────────────────────────────────┐  │
│ │ [検索...]  │ │  │ 1 SELECT * FROM users;               │  │
│ └────────────┘ │  │ 2                                    │  │
│                │  │ 3                                    │  │
│ ● 全ユーザー   │  └──────────────────────────────────────┘  │
│   #admin       │                                             │
│   2026-01-18   │  ResultPanel                                │
│                │  ┌──────────────────────────────────────┐  │
│ ● 月次売上     │  │ 実行時間: 0.023秒 | 100件            │  │
│   #report      │  ├──────────────────────────────────────┤  │
│   2026-01-17   │  │ id │ name  │ email                 │  │
│                │  │ 1  │ Alice │ alice@example.com     │  │
│ ● 在庫確認     │  └──────────────────────────────────────┘  │
│   #inventory   │                                             │
│   2026-01-15   │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### SavedQueryPanel コンポーネント構成

```vue
<template>
  <div class="saved-query-panel">
    <!-- 検索ボックス -->
    <UFormField label="検索" name="search">
      <UInput
        v-model="searchKeyword"
        placeholder="クエリを検索..."
        icon="i-heroicons-magnifying-glass"
      />
    </UFormField>

    <!-- クエリ一覧 -->
    <div class="query-list">
      <div
        v-for="query in filteredQueries"
        :key="query.id"
        class="query-item"
        @click="loadQuery(query.id)"
      >
        <div class="query-name">{{ query.name }}</div>
        <div class="query-tags">
          <UBadge v-for="tag in query.tags" :key="tag" size="xs">
            {{ tag }}
          </UBadge>
        </div>
        <div class="query-date">{{ formatDate(query.updatedAt) }}</div>

        <!-- ホバー時のアクション -->
        <div class="query-actions">
          <UButton
            icon="i-heroicons-play"
            size="xs"
            variant="ghost"
            @click.stop="executeQuery(query.id)"
          />
          <UButton
            icon="i-heroicons-pencil"
            size="xs"
            variant="ghost"
            @click.stop="editQuery(query.id)"
          />
          <UButton
            icon="i-heroicons-trash"
            size="xs"
            variant="ghost"
            color="red"
            @click.stop="confirmDelete(query.id)"
          />
        </div>
      </div>
    </div>

    <!-- 空状態 -->
    <div v-if="filteredQueries.length === 0" class="empty-state">
      <p>保存されたクエリがありません</p>
    </div>
  </div>
</template>
```

### SaveQueryDialog コンポーネント構成

```vue
<template>
  <UDialog v-model="isOpen" title="クエリを保存">
    <form @submit.prevent="handleSave">
      <!-- クエリ名 -->
      <UFormField
        label="クエリ名"
        name="name"
        required
        :error="errors.name"
      >
        <UInput
          v-model="form.name"
          placeholder="例: 全ユーザー一覧"
          :maxlength="100"
        />
      </UFormField>

      <!-- 説明 -->
      <UFormField
        label="説明"
        name="description"
        hint="任意"
      >
        <UTextarea
          v-model="form.description"
          placeholder="このクエリの用途を説明..."
          :maxlength="500"
          :rows="3"
        />
      </UFormField>

      <!-- タグ -->
      <UFormField
        label="タグ"
        name="tags"
        hint="カンマ区切りで入力"
      >
        <UInput
          v-model="tagsInput"
          placeholder="例: admin, report"
        />
      </UFormField>

      <!-- アクション -->
      <div class="dialog-actions">
        <UButton type="button" variant="ghost" @click="cancel">
          キャンセル
        </UButton>
        <UButton type="submit" :loading="isSaving">
          保存
        </UButton>
      </div>
    </form>
  </UDialog>
</template>
```

### Piniaストア拡張 (`app/stores/sql-editor.ts`)

```typescript
export const useSqlEditorStore = defineStore('sql-editor', () => {
  // ... 既存のstate/actions

  // 保存クエリ関連のstate
  const savedQueries = ref<SavedQueryMetadata[]>([])
  const currentQuery = ref<SavedQuery | null>(null)

  // 保存クエリを読み込み
  async function loadSavedQueries() {
    if (!connectionId.value) return
    try {
      savedQueries.value = await listQueries(connectionId.value)
    } catch (error) {
      console.error('Failed to load saved queries:', error)
      toast.add({ title: 'クエリの読み込みに失敗しました', color: 'red' })
    }
  }

  // クエリを保存
  async function saveCurrentQuery(request: SaveQueryRequest) {
    try {
      const saved = await saveQuery(request)
      toast.add({ title: 'クエリを保存しました', color: 'green' })
      await loadSavedQueries() // 一覧を再読み込み
      return saved
    } catch (error) {
      console.error('Failed to save query:', error)
      toast.add({ title: 'クエリの保存に失敗しました', color: 'red' })
      throw error
    }
  }

  // 保存クエリをエディタに読み込み
  async function loadSavedQuery(id: string) {
    try {
      const query = await loadQuery(id)
      currentQuery.value = query
      sql.value = query.sql
      isDirty.value = false
      toast.add({ title: `「${query.name}」を読み込みました` })
    } catch (error) {
      console.error('Failed to load query:', error)
      toast.add({ title: 'クエリの読み込みに失敗しました', color: 'red' })
    }
  }

  // クエリを削除
  async function deleteSavedQuery(id: string) {
    try {
      await deleteQuery(id)
      toast.add({ title: 'クエリを削除しました' })
      await loadSavedQueries()
    } catch (error) {
      console.error('Failed to delete query:', error)
      toast.add({ title: 'クエリの削除に失敗しました', color: 'red' })
    }
  }

  return {
    // ... 既存のreturn
    savedQueries,
    currentQuery,
    loadSavedQueries,
    saveCurrentQuery,
    loadSavedQuery,
    deleteSavedQuery,
  }
})
```

## テストコード

### ユニットテスト例（Vitest）

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSqlEditorStore } from '~/stores/sql-editor'
import * as sqlEditorApi from '~/api/sql-editor'

// APIモック
vi.mock('~/api/sql-editor', () => ({
  saveQuery: vi.fn(),
  loadQuery: vi.fn(),
  listQueries: vi.fn(),
  deleteQuery: vi.fn(),
}))

describe('SqlEditorStore - 保存クエリ機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('保存クエリ一覧を読み込める', async () => {
    const mockQueries = [
      {
        id: '1',
        connectionId: 'conn-1',
        name: 'Test Query',
        description: 'Test',
        tags: ['test'],
        createdAt: '2026-01-18T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z',
      },
    ]

    vi.mocked(sqlEditorApi.listQueries).mockResolvedValue(mockQueries)

    const store = useSqlEditorStore()
    store.connectionId = 'conn-1'
    await store.loadSavedQueries()

    expect(store.savedQueries).toEqual(mockQueries)
    expect(sqlEditorApi.listQueries).toHaveBeenCalledWith('conn-1')
  })

  it('クエリを保存できる', async () => {
    const mockSaved = {
      id: '1',
      connectionId: 'conn-1',
      name: 'New Query',
      description: 'Test',
      sql: 'SELECT * FROM users',
      tags: ['test'],
      createdAt: '2026-01-18T00:00:00Z',
      updatedAt: '2026-01-18T00:00:00Z',
    }

    vi.mocked(sqlEditorApi.saveQuery).mockResolvedValue(mockSaved)
    vi.mocked(sqlEditorApi.listQueries).mockResolvedValue([])

    const store = useSqlEditorStore()
    store.connectionId = 'conn-1'

    const result = await store.saveCurrentQuery({
      connectionId: 'conn-1',
      name: 'New Query',
      description: 'Test',
      sql: 'SELECT * FROM users',
      tags: ['test'],
    })

    expect(result).toEqual(mockSaved)
    expect(sqlEditorApi.saveQuery).toHaveBeenCalled()
  })

  it('保存クエリをエディタに読み込める', async () => {
    const mockQuery = {
      id: '1',
      connectionId: 'conn-1',
      name: 'Test Query',
      description: 'Test',
      sql: 'SELECT * FROM users',
      tags: ['test'],
      createdAt: '2026-01-18T00:00:00Z',
      updatedAt: '2026-01-18T00:00:00Z',
    }

    vi.mocked(sqlEditorApi.loadQuery).mockResolvedValue(mockQuery)

    const store = useSqlEditorStore()
    await store.loadSavedQuery('1')

    expect(store.sql).toBe('SELECT * FROM users')
    expect(store.currentQuery).toEqual(mockQuery)
    expect(store.isDirty).toBe(false)
  })
})
```

### Rustテスト例

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::saved_query::{SavedQuery, SaveQueryRequest};
    use crate::services::query_storage::QueryStorage;
    use crate::storage::FileStorage;
    use std::sync::Arc;

    #[test]
    fn test_save_and_load_query() {
        let storage = Arc::new(FileStorage::new_test());
        let query_storage = QueryStorage::new(storage);

        let request = SaveQueryRequest {
            id: None,
            connection_id: "conn-1".to_string(),
            name: "Test Query".to_string(),
            description: Some("Test".to_string()),
            sql: "SELECT * FROM users".to_string(),
            tags: vec!["test".to_string()],
        };

        // 保存
        let saved = query_storage
            .save_query(SavedQuery {
                id: String::new(),
                connection_id: request.connection_id.clone(),
                name: request.name.clone(),
                description: request.description.clone().unwrap_or_default(),
                sql: request.sql.clone(),
                tags: request.tags.clone(),
                created_at: String::new(),
                updated_at: String::new(),
            })
            .unwrap();

        assert!(!saved.id.is_empty());
        assert_eq!(saved.name, "Test Query");

        // 読み込み
        let loaded = query_storage.load_query(&saved.id).unwrap();
        assert_eq!(loaded.id, saved.id);
        assert_eq!(loaded.sql, "SELECT * FROM users");
    }

    #[test]
    fn test_list_queries() {
        let storage = Arc::new(FileStorage::new_test());
        let query_storage = QueryStorage::new(storage);

        // 2件保存
        for i in 1..=2 {
            query_storage
                .save_query(SavedQuery {
                    id: String::new(),
                    connection_id: "conn-1".to_string(),
                    name: format!("Query {}", i),
                    description: String::new(),
                    sql: format!("SELECT {}", i),
                    tags: vec![],
                    created_at: String::new(),
                    updated_at: String::new(),
                })
                .unwrap();
        }

        let list = query_storage.list_queries().unwrap();
        assert_eq!(list.len(), 2);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| 既存の `QueryStorage` サービスを活用 | 既に実装済みで安定している。車輪の再発明を避ける | 新規にSQLエディタ専用のストレージサービスを作成 |
| `SavedQuery.query` を `SavedQuery.sql` に変更 | SQLエディタではクエリビルダーのJSON構造（`query`）ではなく、プレーンなSQL文字列を保存するため | 既存のまま `query: serde_json::Value` を使い、SQL文字列をJSON化して保存 |
| 検索はクライアントサイドで実装 | 保存クエリ数が100件程度と想定され、クライアント検索で十分 | Rust側のsearch_queriesを使ってサーバーサイド検索 |
| ファイル保存は1クエリ=1ファイル | 既存のFileStorageパターンに準拠。並行書き込みのリスクを回避 | 接続ごとに1ファイル（JSON配列）で全クエリを管理 |
| タグは自由入力（プリセットなし） | Phase 4ではシンプルに実装。将来のPhaseでプリセット追加可能 | タグのマスタ管理機能を実装 |

## 未解決事項

- [ ] 保存クエリの最大件数制限を設けるか？（パフォーマンス懸念）
  - 対応案: 100件を超えたら警告を表示、500件でエラーにする
- [ ] クエリ名の重複チェックは必要か？
  - 対応案: Phase 4では許容、将来的にユニーク制約を追加
- [ ] 削除したクエリの復元機能は必要か？
  - 対応案: Phase 4では実装せず、Phase 5以降で検討（ゴミ箱機能）
