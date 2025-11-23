import { invoke } from '@tauri-apps/api/core';
import type { WindowInfo } from '@/types/window';

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
    environment: string
  ): Promise<WindowInfo> {
    return invoke('open_query_builder_window', {
      connectionId,
      connectionName,
      environment,
    });
  },

  /**
   * 設定ウィンドウを開く
   */
  async openSettings(): Promise<WindowInfo> {
    return invoke('open_settings_window');
  },

  /**
   * ウィンドウを閉じる
   */
  async closeWindow(label: string): Promise<void> {
    return invoke('close_window', { label });
  },

  /**
   * ウィンドウにフォーカス
   */
  async focusWindow(label: string): Promise<void> {
    return invoke('focus_window', { label });
  },

  /**
   * すべてのウィンドウを取得
   */
  async listWindows(): Promise<WindowInfo[]> {
    return invoke('list_windows');
  },

  /**
   * 接続IDでウィンドウを検索
   */
  async findWindowByConnection(connectionId: string): Promise<WindowInfo | null> {
    return invoke('find_window_by_connection', { connectionId });
  },

  /**
   * ウィンドウタイトルを設定
   */
  async setWindowTitle(label: string, title: string): Promise<void> {
    return invoke('set_window_title', { label, title });
  },

  /**
   * 現在のウィンドウ情報を取得
   */
  async getCurrentWindowInfo(label: string): Promise<WindowInfo | null> {
    return invoke('get_current_window_info', { label });
  },

  /**
   * ウィンドウ状態を復元
   */
  async restoreWindows(): Promise<WindowInfo[]> {
    return invoke('restore_windows');
  },

  /**
   * すべてのウィンドウ状態を保存
   */
  async saveAllWindowStates(): Promise<void> {
    return invoke('save_all_window_states');
  },
};
