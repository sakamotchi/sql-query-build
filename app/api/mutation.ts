import { invoke } from '@tauri-apps/api/core'
import type { InsertQueryModel } from '@/types/mutation-query'
import type { MutationExecuteRequest, MutationResult } from '@/types/mutation-result'

export const mutationApi = {
  /**
   * INSERT SQLを生成
   */
  async generateInsertSql(query: InsertQueryModel, connectionId: string, smartQuote: boolean = true): Promise<string> {
    return invoke('generate_insert_sql', { query, connectionId, smartQuote })
  },

  /**
   * INSERT/UPDATE/DELETEを実行
   */
  async executeMutation(request: MutationExecuteRequest): Promise<MutationResult> {
    return invoke('execute_mutation', { request })
  },
}
