import { invoke } from '@tauri-apps/api/core';
import type { JoinSuggestion } from '@/types/join-suggestion';

export const joinSuggestionsApi = {
  /**
   * JOIN提案を取得
   */
  async getJoinSuggestions(
    connectionId: string,
    fromTable: string,
    toTable: string,
    schema?: string
  ): Promise<JoinSuggestion[]> {
    return await invoke<JoinSuggestion[]>('get_join_suggestions', {
      connectionId,
      fromTable,
      toTable,
      schema: schema ?? null,
    });
  },
};
