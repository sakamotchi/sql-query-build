import { defineStore } from 'pinia';
import { ConnectionAPI } from '@/api/connection';
import { Logger } from '@/utils/logger';
import { getUserFriendlyErrorMessage } from '@/utils/errorHandler';
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
        Logger.info('接続情報を取得中...');
        const connections = await ConnectionAPI.getAll();
        this.connections = connections;
        Logger.info('接続情報を取得しました', { count: connections.length });
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        this.error = message;
        Logger.error('接続情報の取得に失敗しました', error);
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
        Logger.debug('接続情報を取得中', { id, includePassword });
        const connection = await ConnectionAPI.getById(id, includePassword);
        Logger.debug('接続情報を取得しました', { id, found: connection !== null });
        return connection;
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        this.error = message;
        Logger.error('接続情報の取得に失敗しました', error);
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
        Logger.info('接続を作成中', { name: connection.name });
        const created = await ConnectionAPI.create(connection);
        this.connections.push(created);
        Logger.info('接続を作成しました', { id: created.id, name: created.name });
        return created;
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        this.error = message;
        Logger.error('接続の作成に失敗しました', error);
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
        Logger.info('接続を更新中', { id: connection.id, name: connection.name });
        const updated = await ConnectionAPI.update(connection);

        const index = this.connections.findIndex((c: Connection) => c.id === updated.id);
        if (index !== -1) {
          this.connections[index] = updated;
        }

        Logger.info('接続を更新しました', { id: updated.id });
        return updated;
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        this.error = message;
        Logger.error('接続の更新に失敗しました', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 接続を削除
     */
    async deleteConnection(id: string) {
      Logger.info('接続を削除中', { id });

      this.loading = true;
      this.error = null;

      try {
        await ConnectionAPI.delete(id);

        const index = this.connections.findIndex((c: Connection) => c.id === id);
        if (index !== -1) {
          this.connections.splice(index, 1);
          Logger.info('接続を削除しました', { id });
        } else {
          Logger.warn('削除対象の接続が見つかりませんでした', { id });
        }
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        this.error = message;
        Logger.error('接続の削除に失敗しました', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 最終使用日時を更新
     */
    async markConnectionAsUsed(id: string) {
      try {
        Logger.debug('最終使用日時を更新中', { id });
        await ConnectionAPI.markAsUsed(id);

        // ローカルの状態も更新
        const connection = this.connections.find((c: Connection) => c.id === id);
        if (connection) {
          connection.lastUsedAt = new Date().toISOString();
        }
      } catch (error) {
        // エラーは無視(致命的ではない)
        Logger.warn('最終使用日時の更新に失敗しました', error);
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
