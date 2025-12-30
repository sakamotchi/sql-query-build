# 設計書: クエリ保存機能

**作成日**: 2025年12月29日
**最終更新**: 2025年12月30日
**WBS参照**: Phase 4.1 クエリ保存機能

> **重要な実装差異**:
> - `query`フィールドは設計書では`QueryModel`型としていましたが、実装では`SerializableQueryState`型（Rust側では`serde_json::Value`）を使用しています
> - これは、UIの状態をそのまま保存することで、クエリビルダーの状態を完全に復元できるようにするためです
> - バリデーション機能が追加されています（セキュリティ強化）

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QueryBuilderToolbar.vue                            │   │
│  │  - 保存ボタンクリック → SaveQueryDialog表示         │   │
│  │  - 読み込みボタン → SavedQuerySlideover表示         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│               ┌───────────┴───────────┐                    │
│               ▼                       ▼                    │
│  ┌─────────────────────┐  ┌─────────────────────────┐      │
│  │ SaveQueryDialog.vue │  │ SavedQuerySlideover.vue │      │
│  │ - 名前/説明/タグ入力│  │ - 保存済みクエリ一覧    │      │
│  │ - 保存実行          │  │ - 検索/フィルタ         │      │
│  └─────────────────────┘  │ - 読み込み/削除         │      │
│               │           └─────────────────────────┘      │
│               │                       │                    │
│               └───────────┬───────────┘                    │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  saved-query.ts (store)                             │   │
│  │  - savedQueries: SavedQueryMetadata[]               │   │
│  │  - saveQuery() / loadQuery() / deleteQuery()        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  queryStorageApi (api/query-storage.ts)             │   │
│  │  - saveQuery() / loadQuery() / deleteQuery()        │   │
│  │  - listQueries() / searchQueries()                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Tauri IPC
┌─────────────────────────────────────────────────────────────┐
│                     バックエンド（Rust）                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  query_storage.rs (services)                        │   │
│  │  - QueryStorage struct                              │   │
│  │  - save_query() / load_query() / delete_query()     │   │
│  │  - list_queries() / search_queries()                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FileStorage (storage)                              │   │
│  │  - read() / write() / delete() / list_keys()        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  {app_data}/queries/*.json                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. バックエンド設計（Rust）

### 2.1 ディレクトリ構造

```
src-tauri/src/
├── services/
│   ├── mod.rs              # query_storage追加
│   └── query_storage.rs    # 新規作成
├── models/
│   ├── mod.rs              # saved_query追加
│   └── saved_query.rs      # 新規作成
└── commands/
    ├── mod.rs              # query_storage_commands追加
    └── query_storage_commands.rs  # 新規作成
```

### 2.2 SavedQuery型定義（Rust）

**ファイル**: `src-tauri/src/models/saved_query.rs`

```rust
use serde::{Deserialize, Serialize};

/// 保存されたクエリ
///
/// **実装注記**: queryフィールドはserde_json::Value型を使用しています。
/// これにより、クエリビルダーの状態（SerializableQueryState）を
/// 柔軟に保存・復元できるようにしています。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub connection_id: String,
    pub query: serde_json::Value,  // SerializableQueryStateを保存
    pub created_at: String,
    pub updated_at: String,
}

/// 保存されたクエリのメタデータ（一覧表示用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQueryMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub connection_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<&SavedQuery> for SavedQueryMetadata {
    fn from(query: &SavedQuery) -> Self {
        SavedQueryMetadata {
            id: query.id.clone(),
            name: query.name.clone(),
            description: query.description.clone(),
            tags: query.tags.clone(),
            connection_id: query.connection_id.clone(),
            created_at: query.created_at.clone(),
            updated_at: query.updated_at.clone(),
        }
    }
}

/// クエリ保存リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryRequest {
    pub id: Option<String>,      // 更新時はID指定、新規はNone
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub connection_id: String,
    pub query: serde_json::Value,  // SerializableQueryStateを保存
}

/// クエリ検索リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
}
```

### 2.3 QueryStorageサービス

**ファイル**: `src-tauri/src/services/query_storage.rs`

```rust
use crate::models::saved_query::{SavedQuery, SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest};
use crate::storage::file_storage::FileStorage;
use crate::storage::path_manager::PathManager;
use chrono::Utc;
use uuid::Uuid;

pub struct QueryStorage {
    storage: FileStorage,
}

impl QueryStorage {
    pub fn new(path_manager: &PathManager) -> Result<Self, String> {
        let queries_path = path_manager.queries_dir();
        let storage = FileStorage::new(queries_path)
            .map_err(|e| e.to_string())?;
        Ok(Self { storage })
    }

    /// クエリを保存
    pub fn save_query(&self, request: SaveQueryRequest) -> Result<SavedQuery, String> {
        let now = Utc::now().to_rfc3339();

        let saved_query = if let Some(id) = request.id {
            // 更新
            let mut existing: SavedQuery = self.storage
                .read(&id)
                .map_err(|e| e.to_string())?;

            existing.name = request.name;
            existing.description = request.description;
            existing.tags = request.tags;
            existing.connection_id = request.connection_id;
            existing.query = request.query;
            existing.updated_at = now;
            existing
        } else {
            // 新規作成
            SavedQuery {
                id: Uuid::new_v4().to_string(),
                name: request.name,
                description: request.description,
                tags: request.tags,
                connection_id: request.connection_id,
                query: request.query,
                created_at: now.clone(),
                updated_at: now,
            }
        };

        self.storage
            .write(&saved_query.id, &saved_query)
            .map_err(|e| e.to_string())?;

        Ok(saved_query)
    }

    /// クエリを読み込み
    pub fn load_query(&self, id: &str) -> Result<SavedQuery, String> {
        self.storage
            .read(id)
            .map_err(|e| e.to_string())
    }

    /// クエリを削除
    pub fn delete_query(&self, id: &str) -> Result<(), String> {
        self.storage
            .delete(id)
            .map_err(|e| e.to_string())
    }

    /// 全クエリのメタデータを取得
    pub fn list_queries(&self) -> Result<Vec<SavedQueryMetadata>, String> {
        let keys = self.storage
            .list_keys()
            .map_err(|e| e.to_string())?;

        let mut queries = Vec::new();
        for key in keys {
            if let Ok(query) = self.storage.read::<SavedQuery>(&key) {
                queries.push(SavedQueryMetadata::from(&query));
            }
        }

        // 更新日時の降順でソート
        queries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(queries)
    }

    /// クエリを検索
    pub fn search_queries(&self, request: SearchQueryRequest) -> Result<Vec<SavedQueryMetadata>, String> {
        let all_queries = self.list_queries()?;

        let filtered: Vec<SavedQueryMetadata> = all_queries
            .into_iter()
            .filter(|q| {
                // キーワード検索
                if let Some(ref keyword) = request.keyword {
                    let keyword_lower = keyword.to_lowercase();
                    if !q.name.to_lowercase().contains(&keyword_lower)
                        && !q.description.to_lowercase().contains(&keyword_lower)
                    {
                        return false;
                    }
                }

                // タグフィルタ
                if let Some(ref tags) = request.tags {
                    if !tags.is_empty() && !tags.iter().any(|t| q.tags.contains(t)) {
                        return false;
                    }
                }

                // 接続IDフィルタ
                if let Some(ref connection_id) = request.connection_id {
                    if &q.connection_id != connection_id {
                        return false;
                    }
                }

                true
            })
            .collect();

        Ok(filtered)
    }
}
```

### 2.4 Tauriコマンド

**ファイル**: `src-tauri/src/commands/query_storage_commands.rs`

```rust
use crate::models::saved_query::{SavedQuery, SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest};
use crate::services::query_storage::QueryStorage;
use std::sync::Arc;
use tauri::State;

/// クエリIDのバリデーション（セキュリティ対策）
fn validate_query_id(id: &str) -> Result<(), String> {
    // パストラバーサル攻撃対策
    if id.contains("..") || id.contains("/") || id.contains("\\") {
        return Err("不正なクエリIDです".to_string());
    }

    // 長さチェック
    if id.is_empty() || id.len() > 100 {
        return Err("クエリIDは1〜100文字である必要があります".to_string());
    }

    // 許可された文字のみ（UUID形式）
    if !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("クエリIDに不正な文字が含まれています".to_string());
    }

    Ok(())
}

/// 保存リクエストのバリデーション
fn validate_save_request(request: &SaveQueryRequest) -> Result<(), String> {
    // クエリ名のチェック
    if request.name.is_empty() {
        return Err("クエリ名は必須です".to_string());
    }
    if request.name.len() > 200 {
        return Err("クエリ名は200文字以内で入力してください".to_string());
    }

    // 説明文のチェック
    if request.description.len() > 1000 {
        return Err("説明は1000文字以内で入力してください".to_string());
    }

    // タグのチェック
    if request.tags.len() > 20 {
        return Err("タグは20個までです".to_string());
    }
    for tag in &request.tags {
        if tag.len() > 50 {
            return Err("各タグは50文字以内で入力してください".to_string());
        }
    }

    // 接続IDのチェック
    if request.connection_id.is_empty() {
        return Err("接続IDが指定されていません".to_string());
    }

    // IDが指定されている場合はバリデーション
    if let Some(ref id) = request.id {
        validate_query_id(id)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn save_query(
    request: SaveQueryRequest,
    storage: State<'_, Arc<QueryStorage>>,
) -> Result<SavedQuery, String> {
    // バリデーション
    validate_save_request(&request)?;

    let query = SavedQuery {
        id: request.id.unwrap_or_default(),
        name: request.name,
        description: request.description,
        tags: request.tags,
        connection_id: request.connection_id,
        query: request.query,
        created_at: String::new(),
        updated_at: String::new(),
    };

    storage.save_query(query)
}

#[tauri::command]
pub fn load_query(
    id: String,
    state: State<QueryStorageState>,
    path_manager: State<PathManager>,
) -> Result<SavedQuery, String> {
    get_storage(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().load_query(&id)
}

#[tauri::command]
pub fn delete_query(
    id: String,
    state: State<QueryStorageState>,
    path_manager: State<PathManager>,
) -> Result<(), String> {
    get_storage(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().delete_query(&id)
}

#[tauri::command]
pub fn list_saved_queries(
    state: State<QueryStorageState>,
    path_manager: State<PathManager>,
) -> Result<Vec<SavedQueryMetadata>, String> {
    get_storage(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().list_queries()
}

#[tauri::command]
pub fn search_saved_queries(
    request: SearchQueryRequest,
    state: State<QueryStorageState>,
    path_manager: State<PathManager>,
) -> Result<Vec<SavedQueryMetadata>, String> {
    get_storage(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().search_queries(request)
}
```

---

## 3. フロントエンド設計

### 3.1 ディレクトリ構造

```
app/
├── api/
│   └── query-storage.ts           # 新規作成
├── components/query-builder/
│   ├── dialog/
│   │   └── SaveQueryDialog.vue    # 新規作成
│   ├── SavedQuerySlideover.vue    # 新規作成
│   ├── SavedQueryCard.vue         # 新規作成
│   └── QueryBuilderToolbar.vue    # 変更
├── stores/
│   └── saved-query.ts             # 新規作成
└── types/
    └── saved-query.ts             # 新規作成
```

### 3.2 TypeScript型定義

**ファイル**: `app/types/saved-query.ts`

```typescript
import type { QueryModel } from './query'

/**
 * 保存されたクエリ
 */
export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  query: QueryModel
  createdAt: string
  updatedAt: string
}

/**
 * 保存されたクエリのメタデータ（一覧表示用）
 */
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  createdAt: string
  updatedAt: string
}

/**
 * クエリ保存リクエスト
 */
export interface SaveQueryRequest {
  id?: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  query: QueryModel
}

/**
 * クエリ検索リクエスト
 */
export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
}
```

### 3.3 API実装

**ファイル**: `app/api/query-storage.ts`

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { SavedQuery, SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest } from '@/types/saved-query'

export const queryStorageApi = {
  /**
   * クエリを保存
   */
  async saveQuery(request: SaveQueryRequest): Promise<SavedQuery> {
    return invoke<SavedQuery>('save_query', { request })
  },

  /**
   * クエリを読み込み
   */
  async loadQuery(id: string): Promise<SavedQuery> {
    return invoke<SavedQuery>('load_query', { id })
  },

  /**
   * クエリを削除
   */
  async deleteQuery(id: string): Promise<void> {
    return invoke<void>('delete_query', { id })
  },

  /**
   * 全クエリのメタデータを取得
   */
  async listQueries(): Promise<SavedQueryMetadata[]> {
    return invoke<SavedQueryMetadata[]>('list_saved_queries')
  },

  /**
   * クエリを検索
   */
  async searchQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]> {
    return invoke<SavedQueryMetadata[]>('search_saved_queries', { request })
  },
}
```

### 3.4 Piniaストア

**ファイル**: `app/stores/saved-query.ts`

```typescript
import { defineStore } from 'pinia'
import { queryStorageApi } from '@/api/query-storage'
import type { SavedQuery, SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest } from '@/types/saved-query'

interface SavedQueryState {
  queries: SavedQueryMetadata[]
  isLoading: boolean
  error: string | null
  searchKeyword: string
}

export const useSavedQueryStore = defineStore('saved-query', {
  state: (): SavedQueryState => ({
    queries: [],
    isLoading: false,
    error: null,
    searchKeyword: '',
  }),

  getters: {
    filteredQueries(state): SavedQueryMetadata[] {
      if (!state.searchKeyword) {
        return state.queries
      }
      const keyword = state.searchKeyword.toLowerCase()
      return state.queries.filter(
        q => q.name.toLowerCase().includes(keyword) ||
             q.description.toLowerCase().includes(keyword)
      )
    },
  },

  actions: {
    /**
     * クエリ一覧を読み込み
     */
    async fetchQueries() {
      this.isLoading = true
      this.error = null
      try {
        this.queries = await queryStorageApi.listQueries()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを保存
     */
    async saveQuery(request: SaveQueryRequest): Promise<SavedQuery | null> {
      this.isLoading = true
      this.error = null
      try {
        const saved = await queryStorageApi.saveQuery(request)
        await this.fetchQueries() // 一覧を更新
        return saved
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを読み込み
     */
    async loadQuery(id: string): Promise<SavedQuery | null> {
      this.isLoading = true
      this.error = null
      try {
        return await queryStorageApi.loadQuery(id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを削除
     */
    async deleteQuery(id: string): Promise<boolean> {
      this.isLoading = true
      this.error = null
      try {
        await queryStorageApi.deleteQuery(id)
        await this.fetchQueries() // 一覧を更新
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 検索キーワードを設定
     */
    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword
    },
  },
})
```

### 3.5 SaveQueryDialog.vue

**ファイル**: `app/components/query-builder/dialog/SaveQueryDialog.vue`

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import { convertToQueryModel } from '@/utils/query-converter'

const props = defineProps<{
  editId?: string  // 編集時のID
}>()

const emit = defineEmits<{
  saved: [id: string]
  cancel: []
}>()

const isOpen = defineModel<boolean>('open')

const savedQueryStore = useSavedQueryStore()
const queryBuilderStore = useQueryBuilderStore()
const connectionStore = useConnectionStore()
const windowStore = useWindowStore()

const toast = useToast()

// フォーム状態
const name = ref('')
const description = ref('')
const tagsInput = ref('')
const isSaving = ref(false)

// バリデーション
const isValid = computed(() => {
  return name.value.trim().length > 0
})

// タグをパース
const parsedTags = computed(() => {
  return tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
})

// 現在の接続ID
const currentConnectionId = computed(() => {
  return connectionStore.activeConnection?.id || windowStore.currentConnectionId || ''
})

// ダイアログが開いたときにフォームをリセット
watch(isOpen, async (open) => {
  if (open) {
    if (props.editId) {
      // 編集モード: 既存データを読み込み
      const query = await savedQueryStore.loadQuery(props.editId)
      if (query) {
        name.value = query.name
        description.value = query.description
        tagsInput.value = query.tags.join(', ')
      }
    } else {
      // 新規モード: フォームをリセット
      name.value = ''
      description.value = ''
      tagsInput.value = ''
    }
  }
})

const handleSave = async () => {
  if (!isValid.value) return

  isSaving.value = true

  try {
    const queryModel = convertToQueryModel(
      queryBuilderStore.$state as any,
      currentConnectionId.value
    )

    const result = await savedQueryStore.saveQuery({
      id: props.editId,
      name: name.value.trim(),
      description: description.value.trim(),
      tags: parsedTags.value,
      connectionId: currentConnectionId.value,
      query: queryModel,
    })

    if (result) {
      toast.add({
        title: '保存完了',
        description: `クエリ「${result.name}」を保存しました`,
        color: 'green',
        icon: 'i-heroicons-check-circle',
      })
      emit('saved', result.id)
      isOpen.value = false
    }
  } catch (error) {
    toast.add({
      title: '保存エラー',
      description: error instanceof Error ? error.message : '保存に失敗しました',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="クエリを保存"
    :ui="{ width: 'max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- クエリ名 -->
        <UFormField label="クエリ名" required>
          <UInput
            v-model="name"
            placeholder="例: ユーザー一覧取得"
            autofocus
          />
        </UFormField>

        <!-- 説明 -->
        <UFormField label="説明">
          <UTextarea
            v-model="description"
            placeholder="クエリの説明を入力..."
            :rows="3"
          />
        </UFormField>

        <!-- タグ -->
        <UFormField label="タグ（カンマ区切り）">
          <UInput
            v-model="tagsInput"
            placeholder="例: users, report, daily"
          />
          <template #hint>
            <div v-if="parsedTags.length > 0" class="flex flex-wrap gap-1 mt-1">
              <UBadge
                v-for="tag in parsedTags"
                :key="tag"
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ tag }}
              </UBadge>
            </div>
          </template>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          color="neutral"
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </UButton>
        <UButton
          color="primary"
          :disabled="!isValid || isSaving"
          :loading="isSaving"
          @click="handleSave"
        >
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### 3.6 SavedQuerySlideover.vue

**ファイル**: `app/components/query-builder/SavedQuerySlideover.vue`

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSavedQueryStore } from '@/stores/saved-query'
import { useQueryBuilderStore } from '@/stores/query-builder'
import type { SavedQueryMetadata } from '@/types/saved-query'

const emit = defineEmits<{
  loaded: [id: string]
}>()

const isOpen = defineModel<boolean>('open')

const savedQueryStore = useSavedQueryStore()
const queryBuilderStore = useQueryBuilderStore()
const toast = useToast()

// 削除確認ダイアログ
const deleteTargetId = ref<string | null>(null)
const showDeleteConfirm = ref(false)

// 一覧を取得
onMounted(() => {
  savedQueryStore.fetchQueries()
})

// クエリを読み込み
const handleLoad = async (query: SavedQueryMetadata) => {
  const loaded = await savedQueryStore.loadQuery(query.id)
  if (loaded) {
    // クエリビルダーに読み込み
    // NOTE: この実装はquery-builderストアに loadFromSavedQuery アクションを追加する必要あり
    // queryBuilderStore.loadFromSavedQuery(loaded.query)

    toast.add({
      title: '読み込み完了',
      description: `クエリ「${loaded.name}」を読み込みました`,
      color: 'green',
      icon: 'i-heroicons-check-circle',
    })
    emit('loaded', loaded.id)
    isOpen.value = false
  }
}

// 削除確認
const handleDeleteClick = (id: string) => {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

// 削除実行
const handleDeleteConfirm = async () => {
  if (!deleteTargetId.value) return

  const success = await savedQueryStore.deleteQuery(deleteTargetId.value)
  if (success) {
    toast.add({
      title: '削除完了',
      description: 'クエリを削除しました',
      color: 'green',
      icon: 'i-heroicons-check-circle',
    })
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

// 日時フォーマット
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    title="保存済みクエリ"
    :ui="{ width: 'max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- 検索 -->
        <UInput
          v-model="savedQueryStore.searchKeyword"
          placeholder="クエリを検索..."
          icon="i-heroicons-magnifying-glass"
        />

        <!-- ローディング -->
        <div v-if="savedQueryStore.isLoading" class="flex justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
        </div>

        <!-- 空の状態 -->
        <div
          v-else-if="savedQueryStore.filteredQueries.length === 0"
          class="text-center py-8 text-muted"
        >
          <UIcon name="i-heroicons-document-text" class="text-4xl mb-2" />
          <p>保存されたクエリはありません</p>
        </div>

        <!-- クエリ一覧 -->
        <div v-else class="space-y-2">
          <div
            v-for="query in savedQueryStore.filteredQueries"
            :key="query.id"
            class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
            @click="handleLoad(query)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h4 class="font-medium truncate">{{ query.name }}</h4>
                <p v-if="query.description" class="text-sm text-muted truncate mt-1">
                  {{ query.description }}
                </p>
                <div class="flex flex-wrap gap-1 mt-2">
                  <UBadge
                    v-for="tag in query.tags"
                    :key="tag"
                    color="neutral"
                    variant="soft"
                    size="xs"
                  >
                    {{ tag }}
                  </UBadge>
                </div>
                <p class="text-xs text-muted mt-2">
                  更新: {{ formatDate(query.updatedAt) }}
                </p>
              </div>
              <UButton
                icon="i-heroicons-trash"
                color="red"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="handleDeleteClick(query.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- 削除確認ダイアログ -->
  <UModal
    v-model:open="showDeleteConfirm"
    title="クエリの削除"
  >
    <template #body>
      <p>このクエリを削除してもよろしいですか？</p>
      <p class="text-sm text-muted mt-2">この操作は取り消せません。</p>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          color="neutral"
          variant="outline"
          @click="showDeleteConfirm = false"
        >
          キャンセル
        </UButton>
        <UButton
          color="red"
          @click="handleDeleteConfirm"
        >
          削除
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### 3.7 QueryBuilderToolbar.vue の変更

**ファイル**: `app/components/query-builder/QueryBuilderToolbar.vue`

```vue
<script setup lang="ts">
// 既存のimportに追加
import SaveQueryDialog from './dialog/SaveQueryDialog.vue'
import SavedQuerySlideover from './SavedQuerySlideover.vue'

// 保存ダイアログの表示状態
const showSaveDialog = ref(false)

// 保存済みクエリSlideoverの表示状態
const showSavedQueries = ref(false)

/**
 * クエリ保存
 */
const saveQuery = () => {
  showSaveDialog.value = true
}

/**
 * 保存済みクエリを開く
 */
const openSavedQueries = () => {
  showSavedQueries.value = true
}

// 保存完了ハンドラ
const handleQuerySaved = (id: string) => {
  console.log('Query saved:', id)
}

// 読み込み完了ハンドラ
const handleQueryLoaded = (id: string) => {
  console.log('Query loaded:', id)
}
</script>

<template>
  <!-- 既存のテンプレート -->

  <!-- 保存ボタン（既存） -->
  <UButton
    variant="ghost"
    color="gray"
    size="sm"
    @click="saveQuery"
  >
    <template #leading>
      <UIcon name="i-heroicons-document-arrow-down" />
    </template>
    保存
  </UButton>

  <!-- 読み込みボタン（新規追加） -->
  <UButton
    variant="ghost"
    color="gray"
    size="sm"
    @click="openSavedQueries"
  >
    <template #leading>
      <UIcon name="i-heroicons-folder-open" />
    </template>
    開く
  </UButton>

  <!-- 保存ダイアログ -->
  <SaveQueryDialog
    v-model:open="showSaveDialog"
    @saved="handleQuerySaved"
  />

  <!-- 保存済みクエリSlideover -->
  <SavedQuerySlideover
    v-model:open="showSavedQueries"
    @loaded="handleQueryLoaded"
  />
</template>
```

---

## 4. PathManager拡張

**ファイル**: `src-tauri/src/storage/path_manager.rs`

```rust
// 既存のPathManagerに追加

impl PathManager {
    // ... 既存のメソッド ...

    /// クエリ保存ディレクトリのパスを取得
    pub fn queries_dir(&self) -> PathBuf {
        self.data_dir.join("queries")
    }
}
```

---

## 5. テストコード設計

### 5.1 Rustユニットテスト

**ファイル**: `src-tauri/src/services/query_storage.rs` (テスト部分)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_storage() -> (QueryStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let path_manager = PathManager::new_with_base(temp_dir.path().to_path_buf());
        let storage = QueryStorage::new(&path_manager).unwrap();
        (storage, temp_dir)
    }

    fn create_test_request() -> SaveQueryRequest {
        SaveQueryRequest {
            id: None,
            name: "Test Query".to_string(),
            description: "Test description".to_string(),
            tags: vec!["tag1".to_string(), "tag2".to_string()],
            connection_id: "conn-123".to_string(),
            query: QueryModel::default(),
        }
    }

    #[test]
    fn test_save_new_query() {
        let (storage, _temp) = create_test_storage();
        let request = create_test_request();

        let result = storage.save_query(request).unwrap();

        assert!(!result.id.is_empty());
        assert_eq!(result.name, "Test Query");
        assert_eq!(result.tags.len(), 2);
    }

    #[test]
    fn test_update_query() {
        let (storage, _temp) = create_test_storage();

        // 新規作成
        let request = create_test_request();
        let saved = storage.save_query(request).unwrap();

        // 更新
        let update_request = SaveQueryRequest {
            id: Some(saved.id.clone()),
            name: "Updated Query".to_string(),
            description: "Updated description".to_string(),
            tags: vec!["new-tag".to_string()],
            connection_id: "conn-123".to_string(),
            query: QueryModel::default(),
        };
        let updated = storage.save_query(update_request).unwrap();

        assert_eq!(updated.id, saved.id);
        assert_eq!(updated.name, "Updated Query");
        assert_eq!(updated.tags.len(), 1);
    }

    #[test]
    fn test_delete_query() {
        let (storage, _temp) = create_test_storage();
        let request = create_test_request();
        let saved = storage.save_query(request).unwrap();

        storage.delete_query(&saved.id).unwrap();

        let result = storage.load_query(&saved.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_list_queries() {
        let (storage, _temp) = create_test_storage();

        // 複数クエリを保存
        for i in 0..3 {
            let mut request = create_test_request();
            request.name = format!("Query {}", i);
            storage.save_query(request).unwrap();
        }

        let queries = storage.list_queries().unwrap();
        assert_eq!(queries.len(), 3);
    }

    #[test]
    fn test_search_queries_by_keyword() {
        let (storage, _temp) = create_test_storage();

        let mut request1 = create_test_request();
        request1.name = "User Query".to_string();
        storage.save_query(request1).unwrap();

        let mut request2 = create_test_request();
        request2.name = "Sales Query".to_string();
        storage.save_query(request2).unwrap();

        let search_request = SearchQueryRequest {
            keyword: Some("User".to_string()),
            tags: None,
            connection_id: None,
        };
        let results = storage.search_queries(search_request).unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "User Query");
    }
}
```

### 5.2 フロントエンドテスト

**ファイル**: `app/stores/__tests__/saved-query.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSavedQueryStore } from '../saved-query'
import { queryStorageApi } from '@/api/query-storage'

vi.mock('@/api/query-storage')

describe('saved-query store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchQueries should load queries', async () => {
    const mockQueries = [
      { id: '1', name: 'Query 1', description: '', tags: [], connectionId: 'conn1', createdAt: '', updatedAt: '' },
      { id: '2', name: 'Query 2', description: '', tags: [], connectionId: 'conn1', createdAt: '', updatedAt: '' },
    ]
    vi.mocked(queryStorageApi.listQueries).mockResolvedValue(mockQueries)

    const store = useSavedQueryStore()
    await store.fetchQueries()

    expect(store.queries).toHaveLength(2)
    expect(store.queries[0].name).toBe('Query 1')
  })

  it('filteredQueries should filter by keyword', async () => {
    const store = useSavedQueryStore()
    store.queries = [
      { id: '1', name: 'User Query', description: '', tags: [], connectionId: 'conn1', createdAt: '', updatedAt: '' },
      { id: '2', name: 'Sales Query', description: '', tags: [], connectionId: 'conn1', createdAt: '', updatedAt: '' },
    ]

    store.setSearchKeyword('User')

    expect(store.filteredQueries).toHaveLength(1)
    expect(store.filteredQueries[0].name).toBe('User Query')
  })

  it('deleteQuery should remove query and refresh list', async () => {
    vi.mocked(queryStorageApi.deleteQuery).mockResolvedValue()
    vi.mocked(queryStorageApi.listQueries).mockResolvedValue([])

    const store = useSavedQueryStore()
    const result = await store.deleteQuery('1')

    expect(result).toBe(true)
    expect(queryStorageApi.deleteQuery).toHaveBeenCalledWith('1')
    expect(queryStorageApi.listQueries).toHaveBeenCalled()
  })
})
```

---

## 6. 変更点まとめ

### 6.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `src-tauri/src/models/saved_query.rs` | 保存クエリの型定義（Rust） |
| `src-tauri/src/services/query_storage.rs` | クエリストレージサービス |
| `src-tauri/src/commands/query_storage_commands.rs` | Tauriコマンド |
| `app/types/saved-query.ts` | 保存クエリの型定義（TypeScript） |
| `app/api/query-storage.ts` | API実装 |
| `app/stores/saved-query.ts` | Piniaストア |
| `app/components/query-builder/dialog/SaveQueryDialog.vue` | 保存ダイアログ |
| `app/components/query-builder/SavedQuerySlideover.vue` | 保存済みクエリ一覧 |

### 6.2 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/storage/path_manager.rs` | queries_dir()メソッド追加 |
| `src-tauri/src/models/mod.rs` | saved_queryモジュール追加 |
| `src-tauri/src/services/mod.rs` | query_storageモジュール追加 |
| `src-tauri/src/commands/mod.rs` | query_storage_commandsモジュール追加 |
| `src-tauri/src/lib.rs` | コマンド登録追加 |
| `app/components/query-builder/QueryBuilderToolbar.vue` | 保存/読み込みダイアログ統合 |
