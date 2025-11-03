import { defineStore } from 'pinia';
import { invoke } from '@tauri-apps/api/core';
import type {
  Connection,
  ConnectionFilter,
  ConnectionSort,
  ConnectionStoreState,
  Environment,
  DatabaseType,
} from './types';

/**
 * 接続をソート（ヘルパー関数）
 */
function sortConnections(connections: Connection[], sortBy: ConnectionSort): Connection[] {
  const sorted = [...connections];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'lastUsed':
      return sorted.sort((a, b) => {
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return 1;
        if (!b.lastUsedAt) return -1;
        return (
          new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        );
      });

    case 'environment':
      const envOrder: Record<Environment, number> = {
        development: 0,
        test: 1,
        staging: 2,
        production: 3,
      };
      return sorted.sort(
        (a, b) => envOrder[a.environment] - envOrder[b.environment]
      );

    case 'createdAt':
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    default:
      return sorted;
  }
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionStoreState => ({
    connections: [],
    loading: false,
    error: null,
    filter: {
      searchQuery: '',
      environment: 'all',
      dbType: 'all',
    },
    sort: 'lastUsed',
  }),

  getters: {
    /**
     * フィルタリング済みの接続リスト
     */
    filteredConnections(state): Connection[] {
      let filtered = [...state.connections];

      // 検索フィルター
      if (state.filter.searchQuery) {
        const query = state.filter.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (conn) =>
            conn.name.toLowerCase().includes(query) ||
            conn.host.toLowerCase().includes(query) ||
            conn.database.toLowerCase().includes(query)
        );
      }

      // 環境フィルター
      if (state.filter.environment && state.filter.environment !== 'all') {
        filtered = filtered.filter(
          (conn) => conn.environment === state.filter.environment
        );
      }

      // データベース種別フィルター
      if (state.filter.dbType && state.filter.dbType !== 'all') {
        filtered = filtered.filter((conn) => conn.dbType === state.filter.dbType);
      }

      // ソート
      return sortConnections(filtered, state.sort);
    },

    /**
     * 環境別の接続数
     */
    connectionsByEnvironment(state): Record<Environment, number> {
      return state.connections.reduce(
        (acc: Record<Environment, number>, conn: Connection) => {
          acc[conn.environment] = (acc[conn.environment] || 0) + 1;
          return acc;
        },
        {} as Record<Environment, number>
      );
    },

    /**
     * データベース種別の接続数
     */
    connectionsByDbType(state): Record<DatabaseType, number> {
      return state.connections.reduce(
        (acc: Record<DatabaseType, number>, conn: Connection) => {
          acc[conn.dbType] = (acc[conn.dbType] || 0) + 1;
          return acc;
        },
        {} as Record<DatabaseType, number>
      );
    },

    /**
     * 最近使用した接続 (上位5件)
     */
    recentConnections(state): Connection[] {
      return [...state.connections]
        .filter((conn) => conn.lastUsedAt)
        .sort(
          (a, b) =>
            new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime()
        )
        .slice(0, 5);
    },

    /**
     * IDで接続を取得
     */
    getConnectionById: (state) => (id: string) => {
      return state.connections.find((conn: Connection) => conn.id === id);
    },
  },

  actions: {
    /**
     * すべての接続を取得
     */
    async fetchConnections() {
      this.loading = true;
      this.error = null;

      try {
        const connections = await invoke<Connection[]>('get_connections');
        this.connections = connections;
      } catch (error) {
        this.error = `接続情報の取得に失敗しました: ${error}`;
        console.error('Failed to fetch connections:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * IDで接続を取得（パスワード復号化あり）
     */
    async fetchConnectionById(id: string, includePassword: boolean = false): Promise<Connection | null> {
      try {
        const connection = await invoke<Connection | null>('get_connection', {
          id,
          includePasswordDecrypted: includePassword,
        });
        return connection;
      } catch (error) {
        this.error = `接続情報の取得に失敗しました: ${error}`;
        console.error('Failed to fetch connection by id:', error);
        throw error;
      }
    },

    /**
     * 接続を作成
     */
    async createConnection(connection: Connection) {
      this.loading = true;
      this.error = null;

      try {
        const created = await invoke<Connection>('create_connection', {
          connection,
        });

        this.connections.push(created);
        return created;
      } catch (error) {
        this.error = `接続の作成に失敗しました: ${error}`;
        console.error('Failed to create connection:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 接続を更新
     */
    async updateConnection(connection: Connection) {
      this.loading = true;
      this.error = null;

      try {
        const updated = await invoke<Connection>('update_connection', {
          connection,
        });

        const index = this.connections.findIndex((c: Connection) => c.id === updated.id);
        if (index !== -1) {
          this.connections[index] = updated;
        }

        return updated;
      } catch (error) {
        this.error = `接続の更新に失敗しました: ${error}`;
        console.error('Failed to update connection:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 接続を削除
     */
    async deleteConnection(id: string) {
      console.log('[deleteConnection] 開始 - ID:', id);
      console.log('[deleteConnection] 削除前の接続数:', this.connections.length);

      this.loading = true;
      this.error = null;

      try {
        console.log('[deleteConnection] Tauriコマンド呼び出し中...');
        await invoke('delete_connection', { id });
        console.log('[deleteConnection] Tauriコマンド成功');

        const index = this.connections.findIndex((c: Connection) => c.id === id);
        console.log('[deleteConnection] 配列内のインデックス:', index);

        if (index !== -1) {
          this.connections.splice(index, 1);
          console.log('[deleteConnection] 配列から削除完了 - 削除後の接続数:', this.connections.length);
        } else {
          console.warn('[deleteConnection] 配列内に該当IDが見つかりませんでした');
        }
      } catch (error) {
        this.error = `接続の削除に失敗しました: ${error}`;
        console.error('[deleteConnection] エラー発生:', error);
        throw error;
      } finally {
        this.loading = false;
        console.log('[deleteConnection] 終了');
      }
    },

    /**
     * 最終使用日時を更新
     */
    async markConnectionAsUsed(id: string) {
      try {
        await invoke('mark_connection_used', { id });

        // ローカルの状態も更新
        const connection = this.connections.find((c: Connection) => c.id === id);
        if (connection) {
          connection.lastUsedAt = new Date().toISOString();
        }
      } catch (error) {
        console.error('Failed to mark connection as used:', error);
        // エラーは無視(致命的ではない)
      }
    },

    /**
     * 接続を複製
     */
    async duplicateConnection(id: string) {
      const original = this.getConnectionById(id);
      if (!original) {
        throw new Error('Connection not found');
      }

      const duplicated: Connection = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (コピー)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: undefined,
      };

      return this.createConnection(duplicated);
    },

    /**
     * フィルターを設定
     */
    setFilter(filter: Partial<ConnectionFilter>) {
      this.filter = { ...this.filter, ...filter };
    },

    /**
     * フィルターをリセット
     */
    resetFilter() {
      this.filter = {
        searchQuery: '',
        environment: 'all',
        dbType: 'all',
      };
    },

    /**
     * ソート順を設定
     */
    setSort(sort: ConnectionSort) {
      this.sort = sort;
    },

    /**
     * エラーをクリア
     */
    clearError() {
      this.error = null;
    },
  },
});
