import { invoke } from '@tauri-apps/api/core'
import type { WindowInfo, WindowState, WindowType } from '~/types'

/**
 * ウィンドウAPI
 */
export const windowApi = {
  /**
   * クエリビルダーウィンドウを開く
   */
  async openQueryBuilder(
    connectionId: string,
    connectionName: string,
    environment: string,
  ): Promise<WindowInfo> {
    return invoke('open_query_builder_window', {
      connectionId,
      connectionName,
      environment,
    })
  },

  /**
   * データ変更ビルダーウィンドウを開く
   */
  async openMutationBuilder(
    connectionId: string,
    connectionName: string,
    environment: string,
  ): Promise<WindowInfo> {
    return invoke('open_mutation_builder_window', {
      connectionId,
      connectionName,
      environment,
    })
  },

  /**
   * 設定ウィンドウを開く
   */
  async openSettings(): Promise<WindowInfo> {
    return invoke('open_settings_window')
  },

  /**
   * ウィンドウを閉じる
   */
  async closeWindow(label: string): Promise<void> {
    return invoke('close_window', { label })
  },

  /**
   * ウィンドウにフォーカス
   */
  async focusWindow(label: string): Promise<void> {
    return invoke('focus_window', { label })
  },

  /**
   * すべてのウィンドウを取得
   */
  async listWindows(): Promise<WindowInfo[]> {
    return invoke('list_windows')
  },

  /**
   * 接続IDでウィンドウを検索
   */
  async findWindowByConnection(
    connectionId: string,
    windowType?: WindowType,
  ): Promise<WindowInfo | null> {
    return invoke('find_window_by_connection', { connectionId, windowType })
  },

  /**
   * ウィンドウタイトルを設定
   */
  async setWindowTitle(label: string, title: string): Promise<void> {
    return invoke('set_window_title', { label, title })
  },

  /**
   * 現在のウィンドウ情報を取得
   */
  async getCurrentWindowInfo(label: string): Promise<WindowInfo | null> {
    return invoke('get_current_window_info', { label })
  },

  /**
   * ウィンドウ状態を復元
   */
  async restoreWindows(): Promise<WindowInfo[]> {
    return invoke('restore_windows')
  },

  /**
   * すべてのウィンドウ状態を保存
   */
  async saveAllWindowStates(): Promise<void> {
    return invoke('save_all_window_states')
  },

  /**
   * 保存されたウィンドウ状態を取得
   */
  async getSavedWindowStates(): Promise<WindowState[]> {
    return invoke('get_saved_window_states')
  },

  /**
   * 保存されたウィンドウ状態をクリア
   */
  async clearWindowStates(): Promise<void> {
    return invoke('clear_window_states')
  },

  /**
   * 指定ウィンドウの状態を削除
   */
  async deleteWindowState(label: string): Promise<void> {
    return invoke('delete_window_state', { label })
  },

  /**
   * 現在のウィンドウに紐づく環境を取得
   */
  async getWindowEnvironment(): Promise<string> {
    return invoke('get_window_environment')
  },
}
