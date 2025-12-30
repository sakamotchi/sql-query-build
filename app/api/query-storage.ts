import { invoke } from '@tauri-apps/api/core'
import type {
  SavedQuery,
  SavedQueryMetadata,
  SaveQueryRequest,
  SearchQueryRequest,
} from '@/types/saved-query'

export const queryStorageApi = {
  /**
   * クエリを保存する
   */
  async saveQuery(request: SaveQueryRequest): Promise<SavedQuery> {
    return await invoke<SavedQuery>('save_query', { request })
  },

  /**
   * クエリを読み込む
   */
  async loadQuery(id: string): Promise<SavedQuery> {
    return await invoke<SavedQuery>('load_query', { id })
  },

  /**
   * クエリを削除する
   */
  async deleteQuery(id: string): Promise<void> {
    await invoke('delete_query', { id })
  },

  /**
   * 保存済みクエリの一覧を取得する
   */
  async listSavedQueries(): Promise<SavedQueryMetadata[]> {
    return await invoke<SavedQueryMetadata[]>('list_saved_queries')
  },

  /**
   * クエリを検索する
   */
  async searchSavedQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]> {
    return await invoke<SavedQueryMetadata[]>('search_saved_queries', { request })
  },
}
