import { defineStore } from 'pinia';
import type { QueryInfo, QueryModel } from '@/types/query';

interface QueryBuilderState {
  /** 現在のクエリモデル */
  query: QueryModel | null;
  /** 生成されたSQL */
  generatedSql: string;
  /** クエリ情報 */
  queryInfo: QueryInfo;
  /** 実行中フラグ */
  isExecuting: boolean;
  /** エラーメッセージ */
  error: string | null;
}

const createEmptyQuery = (): QueryModel => ({
  tables: [],
  joins: [],
  columns: [],
  where: [],
  groupBy: [],
  having: [],
  orderBy: [],
  limit: null,
  offset: null,
});

export const useQueryBuilderStore = defineStore('query-builder', {
  state: (): QueryBuilderState => ({
    query: null,
    generatedSql: '',
    queryInfo: {
      rowCount: 0,
      executionTime: null,
      lastExecutedAt: null,
    },
    isExecuting: false,
    error: null,
  }),

  getters: {
    /**
     * クエリ実行可能かどうか
     */
    canExecuteQuery(state): boolean {
      return !!state.query && state.query.tables.length > 0;
    },
  },

  actions: {
    /**
     * クエリをリセット
     */
    resetQuery() {
      this.query = createEmptyQuery();
      this.generatedSql = '';
      this.error = null;
    },

    /**
     * 生成SQLを更新
     */
    setGeneratedSql(sql: string) {
      this.generatedSql = sql;
    },

    /**
     * クエリ情報を更新
     */
    updateQueryInfo(info: Partial<QueryInfo>) {
      this.queryInfo = {
        ...this.queryInfo,
        ...info,
      };
    },

    /**
     * クエリを実行
     */
    async executeQuery() {
      if (!this.canExecuteQuery) return;

      this.isExecuting = true;
      this.error = null;

      try {
        // TODO: タスク1.7.4で実装
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        this.isExecuting = false;
      }
    },
  },
});
