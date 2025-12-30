# 設計書: クエリ履歴機能

**作成日**: 2025年12月30日
**最終更新**: 2025年12月30日
**WBS参照**: Phase 4.3 履歴機能

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QueryBuilderToolbar.vue                            │   │
│  │  - 履歴ボタンクリック → QueryHistorySlideover表示  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QueryHistorySlideover.vue                          │   │
│  │  - 履歴一覧表示                                      │   │
│  │  - 検索/フィルタ                                     │   │
│  │  - 復元/保存/削除                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  query-history.ts (store)                           │   │
│  │  - histories: QueryHistoryMetadata[]                │   │
│  │  - addHistory() / loadHistory() / deleteHistory()   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  queryHistoryApi (api/query-history.ts)             │   │
│  │  - addHistory() / listHistories() / deleteHistory() │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Tauri IPC
┌─────────────────────────────────────────────────────────────┐
│                     バックエンド（Rust）                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  query_history.rs (services)                        │   │
│  │  - QueryHistory struct                              │   │
│  │  - add_history() / list_histories()                 │   │
│  │  - delete_history() / clear_old_histories()         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FileStorage (storage)                              │   │
│  │  - read() / write()                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  {app_data}/query_history.json                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 設計の特徴
- **単一ファイル保存**: 履歴は1つのJSONファイルに配列として保存（読み込み高速化）
- **自動記録**: クエリ実行時に`query-builder.ts`から自動的に履歴を追加
- **自動削除**: 1000件を超えたら古い履歴から自動削除

---

## 2. バックエンド設計（Rust）

### 2.1 ディレクトリ構造

```
src-tauri/src/
├── services/
│   ├── mod.rs              # query_history追加
│   └── query_history.rs    # 新規作成
├── models/
│   ├── mod.rs              # query_history追加
│   └── query_history.rs    # 新規作成
└── commands/
    ├── mod.rs              # query_history_commands追加
    └── query_history_commands.rs  # 新規作成
```

### 2.2 QueryHistory型定義（Rust）

**ファイル**: `src-tauri/src/models/query_history.rs`

```rust
use serde::{Deserialize, Serialize};

/// クエリ履歴
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistory {
    pub id: String,
    pub connection_id: String,
    pub query: serde_json::Value,  // SerializableQueryStateを保存
    pub sql: String,
    pub executed_at: String,       // ISO 8601形式
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// クエリ履歴のメタデータ（一覧表示用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryMetadata {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String,
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
}

impl From<&QueryHistory> for QueryHistoryMetadata {
    fn from(history: &QueryHistory) -> Self {
        QueryHistoryMetadata {
            id: history.id.clone(),
            connection_id: history.connection_id.clone(),
            sql: history.sql.clone(),
            executed_at: history.executed_at.clone(),
            success: history.success,
            result_count: history.result_count,
            execution_time_ms: history.execution_time_ms,
        }
    }
}

/// 履歴追加リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddHistoryRequest {
    pub connection_id: String,
    pub query: serde_json::Value,
    pub sql: String,
    pub success: bool,
    pub result_count: Option<u64>,
    pub execution_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// 履歴検索リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHistoryRequest {
    pub keyword: Option<String>,
    pub connection_id: Option<String>,
    pub success_only: Option<bool>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub limit: Option<usize>,
}

/// 履歴コレクション（ファイル保存用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryCollection {
    pub histories: Vec<QueryHistory>,
}
```

### 2.3 QueryHistoryサービス

**ファイル**: `src-tauri/src/services/query_history.rs`

```rust
use crate::models::query_history::{
    QueryHistory, QueryHistoryMetadata, AddHistoryRequest,
    SearchHistoryRequest, QueryHistoryCollection
};
use crate::storage::file_storage::FileStorage;
use crate::storage::path_manager::PathManager;
use chrono::Utc;
use uuid::Uuid;

const MAX_HISTORY_COUNT: usize = 1000;
const HISTORY_FILE_KEY: &str = "query_history";

pub struct QueryHistoryService {
    storage: FileStorage,
}

impl QueryHistoryService {
    pub fn new(path_manager: &PathManager) -> Result<Self, String> {
        let history_dir = path_manager.history_dir();
        let storage = FileStorage::new(history_dir)
            .map_err(|e| e.to_string())?;
        Ok(Self { storage })
    }

    /// 履歴コレクションを読み込み
    fn load_collection(&self) -> Result<QueryHistoryCollection, String> {
        match self.storage.read::<QueryHistoryCollection>(HISTORY_FILE_KEY) {
            Ok(collection) => Ok(collection),
            Err(_) => Ok(QueryHistoryCollection {
                histories: Vec::new(),
            }),
        }
    }

    /// 履歴コレクションを保存
    fn save_collection(&self, collection: &QueryHistoryCollection) -> Result<(), String> {
        self.storage
            .write(HISTORY_FILE_KEY, collection)
            .map_err(|e| e.to_string())
    }

    /// 履歴を追加
    pub fn add_history(&self, request: AddHistoryRequest) -> Result<QueryHistory, String> {
        let mut collection = self.load_collection()?;

        let history = QueryHistory {
            id: Uuid::new_v4().to_string(),
            connection_id: request.connection_id,
            query: request.query,
            sql: request.sql,
            executed_at: Utc::now().to_rfc3339(),
            success: request.success,
            result_count: request.result_count,
            execution_time_ms: request.execution_time_ms,
            error_message: request.error_message,
        };

        // 先頭に追加（最新が最初）
        collection.histories.insert(0, history.clone());

        // 最大件数を超えたら古いものを削除
        if collection.histories.len() > MAX_HISTORY_COUNT {
            collection.histories.truncate(MAX_HISTORY_COUNT);
        }

        self.save_collection(&collection)?;

        Ok(history)
    }

    /// 履歴を読み込み
    pub fn load_history(&self, id: &str) -> Result<QueryHistory, String> {
        let collection = self.load_collection()?;
        collection
            .histories
            .iter()
            .find(|h| h.id == id)
            .cloned()
            .ok_or_else(|| format!("履歴が見つかりません: {}", id))
    }

    /// 履歴を削除
    pub fn delete_history(&self, id: &str) -> Result<(), String> {
        let mut collection = self.load_collection()?;
        collection.histories.retain(|h| h.id != id);
        self.save_collection(&collection)
    }

    /// 全履歴のメタデータを取得
    pub fn list_histories(&self) -> Result<Vec<QueryHistoryMetadata>, String> {
        let collection = self.load_collection()?;
        Ok(collection
            .histories
            .iter()
            .map(QueryHistoryMetadata::from)
            .collect())
    }

    /// 履歴を検索
    pub fn search_histories(&self, request: SearchHistoryRequest) -> Result<Vec<QueryHistoryMetadata>, String> {
        let collection = self.load_collection()?;

        let filtered: Vec<QueryHistoryMetadata> = collection
            .histories
            .iter()
            .filter(|h| {
                // キーワード検索
                if let Some(ref keyword) = request.keyword {
                    let keyword_lower = keyword.to_lowercase();
                    if !h.sql.to_lowercase().contains(&keyword_lower) {
                        return false;
                    }
                }

                // 接続IDフィルタ
                if let Some(ref connection_id) = request.connection_id {
                    if &h.connection_id != connection_id {
                        return false;
                    }
                }

                // 成功のみフィルタ
                if let Some(success_only) = request.success_only {
                    if success_only && !h.success {
                        return false;
                    }
                }

                // 日付範囲フィルタ（簡易版）
                if let Some(ref from_date) = request.from_date {
                    if h.executed_at < *from_date {
                        return false;
                    }
                }
                if let Some(ref to_date) = request.to_date {
                    if h.executed_at > *to_date {
                        return false;
                    }
                }

                true
            })
            .take(request.limit.unwrap_or(100))
            .map(QueryHistoryMetadata::from)
            .collect();

        Ok(filtered)
    }

    /// 古い履歴をクリア
    pub fn clear_old_histories(&self, days: u32) -> Result<usize, String> {
        let mut collection = self.load_collection()?;
        let cutoff_date = Utc::now() - chrono::Duration::days(days as i64);
        let cutoff_str = cutoff_date.to_rfc3339();

        let original_count = collection.histories.len();
        collection.histories.retain(|h| h.executed_at >= cutoff_str);
        let deleted_count = original_count - collection.histories.len();

        self.save_collection(&collection)?;

        Ok(deleted_count)
    }

    /// 全履歴を削除
    pub fn clear_all_histories(&self) -> Result<(), String> {
        let collection = QueryHistoryCollection {
            histories: Vec::new(),
        };
        self.save_collection(&collection)
    }
}
```

### 2.4 Tauriコマンド

**ファイル**: `src-tauri/src/commands/query_history_commands.rs`

```rust
use crate::models::query_history::{
    QueryHistory, QueryHistoryMetadata, AddHistoryRequest, SearchHistoryRequest
};
use crate::services::query_history::QueryHistoryService;
use crate::storage::path_manager::PathManager;
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct QueryHistoryState(pub Mutex<Option<QueryHistoryService>>);

fn get_service(
    state: &State<QueryHistoryState>,
    path_manager: &State<PathManager>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(QueryHistoryService::new(path_manager)?);
    }
    Ok(())
}

#[tauri::command]
pub fn add_query_history(
    request: AddHistoryRequest,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<QueryHistory, String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().add_history(request)
}

#[tauri::command]
pub fn load_query_history(
    id: String,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<QueryHistory, String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().load_history(&id)
}

#[tauri::command]
pub fn delete_query_history(
    id: String,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<(), String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().delete_history(&id)
}

#[tauri::command]
pub fn list_query_histories(
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<Vec<QueryHistoryMetadata>, String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().list_histories()
}

#[tauri::command]
pub fn search_query_histories(
    request: SearchHistoryRequest,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<Vec<QueryHistoryMetadata>, String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().search_histories(request)
}

#[tauri::command]
pub fn clear_old_query_histories(
    days: u32,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<usize, String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().clear_old_histories(days)
}

#[tauri::command]
pub fn clear_all_query_histories(
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<(), String> {
    get_service(&state, &path_manager)?;
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.as_ref().unwrap().clear_all_histories()
}
```

---

## 3. フロントエンド設計

### 3.1 ディレクトリ構造

```
app/
├── api/
│   └── query-history.ts           # 新規作成
├── components/query-builder/
│   ├── QueryHistorySlideover.vue  # 新規作成
│   └── QueryBuilderToolbar.vue    # 変更
├── stores/
│   ├── query-history.ts           # 新規作成
│   └── query-builder.ts           # 変更（履歴記録追加）
└── types/
    └── query-history.ts           # 新規作成
```

### 3.2 TypeScript型定義

**ファイル**: `app/types/query-history.ts`

```typescript
import type { SerializableQueryState } from './query'

/**
 * クエリ履歴
 */
export interface QueryHistory {
  id: string
  connectionId: string
  query: SerializableQueryState
  sql: string
  executedAt: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
  errorMessage?: string
}

/**
 * クエリ履歴のメタデータ（一覧表示用）
 */
export interface QueryHistoryMetadata {
  id: string
  connectionId: string
  sql: string
  executedAt: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
}

/**
 * 履歴追加リクエスト
 */
export interface AddHistoryRequest {
  connectionId: string
  query: SerializableQueryState
  sql: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
  errorMessage?: string
}

/**
 * 履歴検索リクエスト
 */
export interface SearchHistoryRequest {
  keyword?: string
  connectionId?: string
  successOnly?: boolean
  fromDate?: string
  toDate?: string
  limit?: number
}
```

### 3.3 API実装

**ファイル**: `app/api/query-history.ts`

```typescript
import { invoke } from '@tauri-apps/api/core'
import type {
  QueryHistory,
  QueryHistoryMetadata,
  AddHistoryRequest,
  SearchHistoryRequest
} from '@/types/query-history'

export const queryHistoryApi = {
  /**
   * 履歴を追加
   */
  async addHistory(request: AddHistoryRequest): Promise<QueryHistory> {
    return invoke<QueryHistory>('add_query_history', { request })
  },

  /**
   * 履歴を読み込み
   */
  async loadHistory(id: string): Promise<QueryHistory> {
    return invoke<QueryHistory>('load_query_history', { id })
  },

  /**
   * 履歴を削除
   */
  async deleteHistory(id: string): Promise<void> {
    return invoke<void>('delete_query_history', { id })
  },

  /**
   * 全履歴のメタデータを取得
   */
  async listHistories(): Promise<QueryHistoryMetadata[]> {
    return invoke<QueryHistoryMetadata[]>('list_query_histories')
  },

  /**
   * 履歴を検索
   */
  async searchHistories(request: SearchHistoryRequest): Promise<QueryHistoryMetadata[]> {
    return invoke<QueryHistoryMetadata[]>('search_query_histories', { request })
  },

  /**
   * 古い履歴をクリア
   */
  async clearOldHistories(days: number): Promise<number> {
    return invoke<number>('clear_old_query_histories', { days })
  },

  /**
   * 全履歴を削除
   */
  async clearAllHistories(): Promise<void> {
    return invoke<void>('clear_all_query_histories')
  },
}
```

### 3.4 Piniaストア

**ファイル**: `app/stores/query-history.ts`

```typescript
import { defineStore } from 'pinia'
import { queryHistoryApi } from '@/api/query-history'
import type {
  QueryHistory,
  QueryHistoryMetadata,
  AddHistoryRequest,
  SearchHistoryRequest
} from '@/types/query-history'

interface QueryHistoryState {
  histories: QueryHistoryMetadata[]
  isLoading: boolean
  error: string | null
  searchKeyword: string
  selectedConnectionId: string | null
  successOnly: boolean
}

export const useQueryHistoryStore = defineStore('query-history', {
  state: (): QueryHistoryState => ({
    histories: [],
    isLoading: false,
    error: null,
    searchKeyword: '',
    selectedConnectionId: null,
    successOnly: false,
  }),

  getters: {
    filteredHistories(state): QueryHistoryMetadata[] {
      return state.histories.filter(h => {
        // キーワード検索
        if (state.searchKeyword) {
          const keyword = state.searchKeyword.toLowerCase()
          if (!h.sql.toLowerCase().includes(keyword)) {
            return false
          }
        }

        // 接続フィルタ
        if (state.selectedConnectionId && h.connectionId !== state.selectedConnectionId) {
          return false
        }

        // 成功のみフィルタ
        if (state.successOnly && !h.success) {
          return false
        }

        return true
      })
    },
  },

  actions: {
    /**
     * 履歴一覧を読み込み
     */
    async fetchHistories() {
      this.isLoading = true
      this.error = null
      try {
        this.histories = await queryHistoryApi.listHistories()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 履歴を追加
     */
    async addHistory(request: AddHistoryRequest): Promise<QueryHistory | null> {
      try {
        const history = await queryHistoryApi.addHistory(request)
        await this.fetchHistories() // 一覧を更新
        return history
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return null
      }
    },

    /**
     * 履歴を読み込み
     */
    async loadHistory(id: string): Promise<QueryHistory | null> {
      this.isLoading = true
      this.error = null
      try {
        return await queryHistoryApi.loadHistory(id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 履歴を削除
     */
    async deleteHistory(id: string): Promise<boolean> {
      try {
        await queryHistoryApi.deleteHistory(id)
        await this.fetchHistories() // 一覧を更新
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        return false
      }
    },

    /**
     * クエリビルダーに読み込み
     */
    async loadToBuilder(id: string): Promise<QueryHistory | null> {
      const history = await this.loadHistory(id)
      if (history) {
        // query-builderストアに状態を復元
        const { useQueryBuilderStore } = await import('./query-builder')
        const queryBuilderStore = useQueryBuilderStore()
        queryBuilderStore.$patch(history.query)
      }
      return history
    },

    /**
     * 検索キーワードを設定
     */
    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword
    },

    /**
     * 接続IDフィルタを設定
     */
    setSelectedConnectionId(connectionId: string | null) {
      this.selectedConnectionId = connectionId
    },

    /**
     * 成功のみフィルタを設定
     */
    setSuccessOnly(successOnly: boolean) {
      this.successOnly = successOnly
    },
  },
})
```

### 3.5 QueryHistorySlideover.vue

**ファイル**: `app/components/query-builder/QueryHistorySlideover.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQueryHistoryStore } from '@/stores/query-history'
import { useSavedQueryStore } from '@/stores/saved-query'
import type { QueryHistoryMetadata } from '@/types/query-history'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'loaded', id: string): void
}>()

const store = useQueryHistoryStore()
const savedQueryStore = useSavedQueryStore()
const toast = useToast()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const searchQuery = ref('')
const successOnly = ref(false)
const deleteTargetId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const showSaveDialog = ref(false)
const saveTargetId = ref<string | null>(null)

// 初期ロード
onMounted(() => {
  store.fetchHistories()
})

// 検索・フィルタリング
watch([searchQuery, successOnly], () => {
  store.setSearchKeyword(searchQuery.value)
  store.setSuccessOnly(successOnly.value)
})

// ダイアログが開かれたときにリストを更新
watch(() => props.open, (newVal) => {
  if (newVal) {
    store.fetchHistories()
  }
})

// 履歴を読み込み
const handleLoad = async (history: QueryHistoryMetadata) => {
  const loaded = await store.loadToBuilder(history.id)
  if (loaded) {
    toast.add({
      title: '読み込み成功',
      description: 'クエリを読み込みました',
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

  const success = await store.deleteHistory(deleteTargetId.value)
  if (success) {
    toast.add({
      title: '削除完了',
      description: '履歴を削除しました',
      color: 'green',
      icon: 'i-heroicons-check-circle',
    })
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

// 保存ダイアログを開く
const handleSaveClick = (id: string) => {
  saveTargetId.value = id
  showSaveDialog.value = true
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

// SQLプレビュー（3行まで）
const getSqlPreview = (sql: string) => {
  const lines = sql.split('\n')
  if (lines.length <= 3) return sql
  return lines.slice(0, 3).join('\n') + '...'
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    title="クエリ履歴"
    :ui="{ width: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- 検索・フィルタ -->
        <div class="space-y-2">
          <UInput
            v-model="searchQuery"
            placeholder="SQLで検索..."
            icon="i-heroicons-magnifying-glass"
          />
          <UCheckbox
            v-model="successOnly"
            label="成功したクエリのみ表示"
          />
        </div>

        <!-- ローディング -->
        <div v-if="store.isLoading" class="flex justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
        </div>

        <!-- 空の状態 -->
        <div
          v-else-if="store.filteredHistories.length === 0"
          class="text-center py-8 text-muted"
        >
          <UIcon name="i-heroicons-clock" class="text-4xl mb-2" />
          <p>履歴はありません</p>
        </div>

        <!-- 履歴一覧 -->
        <div v-else class="space-y-2">
          <div
            v-for="history in store.filteredHistories"
            :key="history.id"
            class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
            @click="handleLoad(history)"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="history.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  :class="history.success ? 'text-green-500' : 'text-red-500'"
                />
                <span class="text-xs text-muted">{{ formatDate(history.executedAt) }}</span>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100">
                <UButton
                  icon="i-heroicons-document-arrow-down"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  @click.stop="handleSaveClick(history.id)"
                />
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click.stop="handleDeleteClick(history.id)"
                />
              </div>
            </div>

            <pre class="text-sm font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">{{ getSqlPreview(history.sql) }}</pre>

            <div class="flex items-center gap-4 mt-2 text-xs text-muted">
              <span v-if="history.resultCount !== undefined">
                {{ history.resultCount }}件
              </span>
              <span v-if="history.executionTimeMs !== undefined">
                {{ history.executionTimeMs }}ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- 削除確認ダイアログ -->
  <ConfirmDialog
    v-model:open="showDeleteConfirm"
    title="履歴の削除"
    message="この履歴を削除してもよろしいですか？"
    @confirm="handleDeleteConfirm"
  />

  <!-- 保存ダイアログ -->
  <!-- TODO: SaveQueryDialogを統合 -->
</template>
```

---

## 4. PathManager拡張

**ファイル**: `src-tauri/src/storage/path_manager.rs`

```rust
// 既存のPathManagerに追加

impl PathManager {
    // ... 既存のメソッド ...

    /// 履歴保存ディレクトリのパスを取得
    pub fn history_dir(&self) -> PathBuf {
        self.data_dir.join("history")
    }
}
```

---

## 5. query-builderストアの変更

**ファイル**: `app/stores/query-builder.ts`

クエリ実行時に履歴を自動記録する処理を追加：

```typescript
// executeQuery メソッドに履歴記録を追加
async executeQuery() {
  const startTime = Date.now()

  try {
    // クエリ実行
    const result = await queryExecutionApi.executeQuery(this.connectionId, sql)
    const executionTimeMs = Date.now() - startTime

    // 履歴を記録（成功）
    const { useQueryHistoryStore } = await import('./query-history')
    const historyStore = useQueryHistoryStore()
    await historyStore.addHistory({
      connectionId: this.connectionId,
      query: this.toSerializable(),
      sql: sql,
      success: true,
      resultCount: result.rows.length,
      executionTimeMs,
    })

    return result
  } catch (error) {
    const executionTimeMs = Date.now() - startTime

    // 履歴を記録（失敗）
    const { useQueryHistoryStore } = await import('./query-history')
    const historyStore = useQueryHistoryStore()
    await historyStore.addHistory({
      connectionId: this.connectionId,
      query: this.toSerializable(),
      sql: sql,
      success: false,
      executionTimeMs,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}
```

---

## 6. 変更点まとめ

### 6.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `src-tauri/src/models/query_history.rs` | 履歴の型定義（Rust） |
| `src-tauri/src/services/query_history.rs` | 履歴サービス |
| `src-tauri/src/commands/query_history_commands.rs` | Tauriコマンド |
| `app/types/query-history.ts` | 履歴の型定義（TypeScript） |
| `app/api/query-history.ts` | API実装 |
| `app/stores/query-history.ts` | Piniaストア |
| `app/components/query-builder/QueryHistorySlideover.vue` | 履歴一覧UI |

### 6.2 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/storage/path_manager.rs` | history_dir()メソッド追加 |
| `src-tauri/src/models/mod.rs` | query_historyモジュール追加 |
| `src-tauri/src/services/mod.rs` | query_historyモジュール追加 |
| `src-tauri/src/commands/mod.rs` | query_history_commandsモジュール追加 |
| `src-tauri/src/lib.rs` | コマンド登録、State追加 |
| `app/stores/query-builder.ts` | executeQuery()に履歴記録処理追加 |
| `app/components/query-builder/QueryBuilderToolbar.vue` | 履歴ボタン追加 |

---

## 7. 実装順序

1. **バックエンド**:
   1. PathManager拡張（history_dir）
   2. query_history.rs型定義
   3. query_history.rsサービス実装
   4. query_history_commands.rs実装
   5. lib.rsでコマンド登録

2. **フロントエンド**:
   1. query-history.ts型定義
   2. query-history.ts API実装
   3. query-history.ts ストア実装
   4. QueryHistorySlideover.vue実装
   5. query-builder.tsに履歴記録処理追加
   6. QueryBuilderToolbar.vueに履歴ボタン追加

3. **テスト**:
   1. バックエンドユニットテスト
   2. フロントエンドストアテスト
   3. E2Eテスト

---

## 8. テストコード設計

### 8.1 Rustユニットテスト

**ファイル**: `src-tauri/src/services/query_history.rs` (テスト部分)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_service() -> (QueryHistoryService, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let path_manager = PathManager::new_with_base(temp_dir.path().to_path_buf());
        let service = QueryHistoryService::new(&path_manager).unwrap();
        (service, temp_dir)
    }

    fn create_test_request() -> AddHistoryRequest {
        AddHistoryRequest {
            connection_id: "conn-123".to_string(),
            query: serde_json::json!({}),
            sql: "SELECT * FROM users".to_string(),
            success: true,
            result_count: Some(10),
            execution_time_ms: Some(150),
            error_message: None,
        }
    }

    #[test]
    fn test_add_history() {
        let (service, _temp) = create_test_service();
        let request = create_test_request();

        let result = service.add_history(request).unwrap();

        assert!(!result.id.is_empty());
        assert_eq!(result.sql, "SELECT * FROM users");
        assert_eq!(result.success, true);
        assert_eq!(result.result_count, Some(10));
    }

    #[test]
    fn test_list_histories() {
        let (service, _temp) = create_test_service();

        // 複数履歴を追加
        for i in 0..3 {
            let mut request = create_test_request();
            request.sql = format!("SELECT * FROM table_{}", i);
            service.add_history(request).unwrap();
        }

        let histories = service.list_histories().unwrap();
        assert_eq!(histories.len(), 3);
        // 最新が最初
        assert!(histories[0].sql.contains("table_2"));
    }

    #[test]
    fn test_max_history_limit() {
        let (service, _temp) = create_test_service();

        // 1001件追加
        for i in 0..1001 {
            let mut request = create_test_request();
            request.sql = format!("SELECT {}", i);
            service.add_history(request).unwrap();
        }

        let histories = service.list_histories().unwrap();
        assert_eq!(histories.len(), 1000);
    }

    #[test]
    fn test_delete_history() {
        let (service, _temp) = create_test_service();
        let request = create_test_request();
        let added = service.add_history(request).unwrap();

        service.delete_history(&added.id).unwrap();

        let result = service.load_history(&added.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_search_by_keyword() {
        let (service, _temp) = create_test_service();

        let mut req1 = create_test_request();
        req1.sql = "SELECT * FROM users".to_string();
        service.add_history(req1).unwrap();

        let mut req2 = create_test_request();
        req2.sql = "SELECT * FROM orders".to_string();
        service.add_history(req2).unwrap();

        let search_request = SearchHistoryRequest {
            keyword: Some("users".to_string()),
            connection_id: None,
            success_only: None,
            from_date: None,
            to_date: None,
            limit: None,
        };

        let results = service.search_histories(search_request).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].sql.contains("users"));
    }
}
```

---

**承認者**: -
**承認日**: -
