import { invoke } from '@tauri-apps/api/core';
import type { QueryModel } from '@/types/query-model';

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
};
