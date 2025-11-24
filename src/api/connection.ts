import { invoke } from '@tauri-apps/api/core';
import type { Connection } from '@/stores/types';

/**
 * 接続API クライアント
 */
export class ConnectionAPI {
  /**
   * すべての接続を取得
   */
  static async getAll(): Promise<Connection[]> {
    try {
      return await invoke<Connection[]>('get_connections');
    } catch (error) {
      throw new Error(`接続情報の取得に失敗しました: ${error}`);
    }
  }

  /**
   * IDで接続を取得
   */
  static async getById(id: string, includePassword = false): Promise<Connection | null> {
    try {
      return await invoke<Connection | null>('get_connection', {
        id,
        includePasswordDecrypted: includePassword,
      });
    } catch (error) {
      throw new Error(`接続情報の取得に失敗しました: ${error}`);
    }
  }

  /**
   * 接続を作成
   */
  static async create(connection: Connection): Promise<Connection> {
    try {
      return await invoke<Connection>('create_connection', {
        connection,
      });
    } catch (error) {
      throw new Error(`接続の作成に失敗しました: ${error}`);
    }
  }

  /**
   * 接続を更新
   */
  static async update(connection: Connection): Promise<Connection> {
    try {
      return await invoke<Connection>('update_connection', {
        connection,
      });
    } catch (error) {
      throw new Error(`接続の更新に失敗しました: ${error}`);
    }
  }

  /**
   * 接続を削除
   */
  static async delete(id: string): Promise<void> {
    try {
      await invoke<void>('delete_connection', { id });
    } catch (error) {
      throw new Error(`接続の削除に失敗しました: ${error}`);
    }
  }

  /**
   * 最終使用日時を更新
   */
  static async markAsUsed(id: string): Promise<void> {
    try {
      await invoke<void>('mark_connection_used', { id });
    } catch (error) {
      // エラーは無視(致命的ではない)
      console.warn('Failed to mark connection as used:', error);
    }
  }

  /**
   * 接続をテスト
   */
  static async testConnection(connection: Connection): Promise<TestConnectionResult> {
    try {
      return await invoke<TestConnectionResult>('test_connection', {
        connection,
        timeout: connection.timeout,
      });
    } catch (error) {
      throw new Error(`接続テストに失敗しました: ${error}`);
    }
  }
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  duration?: number; // ミリ秒
  serverVersion?: string;
  serverInfo?: {
    version: string;
    databaseName: string;
    currentUser: string;
    encoding?: string;
  };
  errorDetails?: string;
}
