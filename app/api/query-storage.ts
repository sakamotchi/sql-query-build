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
   * フォルダ一覧を取得する
   */
  async listFolders(): Promise<string[]> {
    return await invoke<string[]>('list_folders')
  },

  /**
   * クエリを指定フォルダに移動する
   */
  async moveQuery(queryId: string, folderPath: string | null): Promise<void> {
    await invoke('move_query', { queryId, folderPath })
  },

  /**
   * フォルダ名を変更する（配下のクエリも更新）
   */
  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    await invoke('rename_folder', { oldPath, newPath })
  },

  /**
   * フォルダを削除する（空のフォルダのみ）
   */
  async deleteFolder(folderPath: string): Promise<void> {
    await invoke('delete_folder', { folderPath })
  },

  /**
   * クエリを検索する
   */
  async searchSavedQueries(request: SearchQueryRequest): Promise<SavedQueryMetadata[]> {
    return await invoke<SavedQueryMetadata[]>('search_saved_queries', { request })
  },
}
