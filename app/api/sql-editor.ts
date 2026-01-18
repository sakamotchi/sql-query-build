import { invoke } from '@tauri-apps/api/core'
import type {
  AddSqlEditorHistoryRequest,
  SavedQuery,
  SavedQueryMetadata,
  SaveQueryRequest,
  SearchQueryRequest,
  SearchSqlEditorHistoryRequest,
  SqlEditorHistoryEntry,
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

  /**
   * 履歴を追加
   */
  async addHistory(request: AddSqlEditorHistoryRequest): Promise<SqlEditorHistoryEntry> {
    return await invoke<SqlEditorHistoryEntry>('add_sql_editor_history', { request })
  },

  /**
   * 履歴一覧を取得
   */
  async getHistories(
    request: SearchSqlEditorHistoryRequest
  ): Promise<SqlEditorHistoryEntry[]> {
    return await invoke<SqlEditorHistoryEntry[]>('get_sql_editor_histories', { request })
  },

  /**
   * 履歴を削除
   */
  async deleteHistory(connectionId: string, id: string): Promise<void> {
    await invoke('delete_sql_editor_history', { connectionId, id })
  },
}
