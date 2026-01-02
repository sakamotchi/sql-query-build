import { invoke } from '@tauri-apps/api/core'
import type {
  ValidateQueryTablesRequest,
  TableValidationInfo,
} from '@/types/query-validation'

/**
 * クエリで使用されるテーブルが現在の接続に存在するかをチェック
 */
export async function validateQueryTables(
  connectionId: string,
  tables: Array<{ schema: string; table: string }>
): Promise<TableValidationInfo[]> {
  const request: ValidateQueryTablesRequest = {
    tables,
    connectionId,
  }

  const response = await invoke<TableValidationInfo[]>('validate_query_tables', {
    connectionId: request.connectionId,
    tables: request.tables,
  })

  return response
}

export const queryValidationApi = {
  validateQueryTables,
}
