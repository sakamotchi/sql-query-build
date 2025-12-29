import { invoke } from '@tauri-apps/api/core';
import type { QueryModel } from '@/types/query-model';
import type { QueryExecuteRequest, QueryExecuteResponse } from '@/types/query-result';

export const queryApi = {
  /**
   * SQLを生成
   */
  async generateSql(query: QueryModel): Promise<string> {
    return invoke('generate_sql', { query });
  },

  /**
   * SQLを生成（フォーマット指定）
   */
  async generateSqlFormatted(query: QueryModel, pretty: boolean, smartQuote: boolean = true): Promise<string> {
    return invoke('generate_sql_formatted', { query, pretty, smartQuote });
  },

  /**
   * クエリを実行
   */
  async executeQuery(request: QueryExecuteRequest): Promise<QueryExecuteResponse> {
    return await invoke<QueryExecuteResponse>('execute_query', { request })
  },

  /**
   * クエリをキャンセル
   */
  async cancelQuery(queryId: string): Promise<boolean> {
    return await invoke<boolean>('cancel_query', { queryId })
  },
};
