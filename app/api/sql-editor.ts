import { invoke } from '@tauri-apps/api/core'
import type {
  SavedQuery,
  SavedQueryMetadata,
  SaveQueryRequest,
  SearchQueryRequest,
} from '~/types/sql-editor'

export const sqlEditorApi = {
  /**
   * クエリを保存
   */
  async saveQuery(request: SaveQueryRequest): Promise<SavedQuery> {
    return await invoke<SavedQuery>('save_sql_query', { request })
  },

  /**
   * クエリを読み込み
   */
  async loadQuery(id: string): Promise<SavedQuery> {
    return await invoke<SavedQuery>('load_sql_query', { id })
  },

  /**
   * 保存クエリ一覧を取得
   */
  async listQueries(connectionId?: string): Promise<SavedQueryMetadata[]> {
    return await invoke<SavedQueryMetadata[]>('list_sql_queries', { connectionId })
  },

  /**
   * クエリを検索
   */
  async searchQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]> {
    return await invoke<SavedQueryMetadata[]>('search_sql_queries', { request })
  },

  /**
   * クエリを削除
   */
  async deleteQuery(id: string): Promise<void> {
    await invoke('delete_sql_query', { id })
  },
}
