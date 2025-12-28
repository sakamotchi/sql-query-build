import { defineStore } from 'pinia';
import { databaseStructureApi } from '@/api/database-structure';
import type {
  DatabaseStructure,
} from '@/types/database-structure';

interface DatabaseStructureState {
  /** 接続IDごとの構造データ */
  structures: Record<string, DatabaseStructure>;
  /** 読み込み中の接続ID */
  loadingIds: Set<string>;
  /** エラー情報 */
  errors: Record<string, string>;
}

export const useDatabaseStructureStore = defineStore('database-structure', {
  state: (): DatabaseStructureState => ({
    structures: {},
    loadingIds: new Set(),
    errors: {},
  }),

  getters: {
    /**
     * 接続IDから構造を取得
     */
    getStructure:
      (state) =>
      (connectionId: string): DatabaseStructure | null => {
        return state.structures[connectionId] || null;
      },

    /**
     * 読み込み中かどうか
     */
    isLoading:
      (state) =>
      (connectionId: string): boolean => {
        return state.loadingIds.has(connectionId);
      },

    /**
     * エラーを取得
     */
    getError:
      (state) =>
      (connectionId: string): string | null => {
        return state.errors[connectionId] || null;
      },
  },

  actions: {
    /**
     * データベース構造を取得
     */
    async fetchDatabaseStructure(connectionId: string): Promise<void> {
      if (this.loadingIds.has(connectionId)) return;

      this.loadingIds.add(connectionId);
      delete this.errors[connectionId];

      try {
        const structure = await databaseStructureApi.getDatabaseStructure(connectionId);
        this.structures[connectionId] = structure;
      } catch (error) {
        console.error('[database-structure store] fetchDatabaseStructure error:', error);
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = JSON.stringify(error) || 'Unknown error';
        }
        this.errors[connectionId] = errorMessage;
        throw error;
      } finally {
        this.loadingIds.delete(connectionId);
      }
    },

    /**
     * 構造を更新(再取得)
     */
    async refreshDatabaseStructure(connectionId: string): Promise<void> {
      delete this.structures[connectionId];
      await this.fetchDatabaseStructure(connectionId);
    },

    /**
     * キャッシュをクリア
     */
    clearCache(connectionId?: string): void {
      if (connectionId) {
        delete this.structures[connectionId];
        delete this.errors[connectionId];
      } else {
        this.structures = {};
        this.errors = {};
      }
    },
  },
});
