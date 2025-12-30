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
