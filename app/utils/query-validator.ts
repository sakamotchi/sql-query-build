import type { SavedQuery } from '@/types/saved-query'
import type { QueryValidationResult } from '@/types/query-validation'
import type { SerializableQueryState } from '@/stores/query-builder'
import type { SerializableMutationState } from '@/stores/mutation-builder'
import { queryValidationApi } from '@/api/query-validation'

/**
 * クエリからテーブル一覧を抽出
 */
function extractTablesFromQuery(query: SerializableQueryState | SerializableMutationState): Array<{ schema: string; table: string }> {
  const tables: Array<{ schema: string; table: string }> = []

  if ('selectedTables' in query) {
    // QueryBuilderの場合
    for (const table of query.selectedTables) {
      const [schema, tableName] = table.id.split('.')
      if (schema && tableName) {
        tables.push({ schema, table: tableName })
      }
    }
  } else if ('table' in query && query.table) {
    // MutationBuilderの場合
    const tableId = query.table as { id: string }
    const [schema, tableName] = tableId.id.split('.')
    if (schema && tableName) {
      tables.push({ schema, table: tableName })
    }
  }

  return tables
}

/**
 * 保存されたクエリをバリデーション
 */
export async function validateSavedQuery(
  savedQuery: SavedQuery,
  currentConnectionId: string
): Promise<QueryValidationResult> {
  const tables = extractTablesFromQuery(savedQuery.query)

  // テーブルがない場合は有効とする
  if (tables.length === 0) {
    return {
      status: 'valid',
      connectionMatches: savedQuery.connectionId === currentConnectionId,
      tables: [],
      missingTables: [],
    }
  }

  // 接続が同じ場合はバリデーション不要
  if (savedQuery.connectionId === currentConnectionId) {
    return {
      status: 'valid',
      connectionMatches: true,
      tables: tables.map(t => ({ ...t, exists: true })),
      missingTables: [],
    }
  }

  // テーブル存在チェック
  const validationResults = await queryValidationApi.validateQueryTables(currentConnectionId, tables)

  const missingTables = validationResults.filter(t => !t.exists)

  // すべてのテーブルが存在しない
  if (missingTables.length === tables.length) {
    return {
      status: 'error',
      connectionMatches: false,
      tables: validationResults,
      missingTables,
      message: 'このクエリのテーブルがすべて見つかりません',
      originalConnectionId: savedQuery.connectionId,
      currentConnectionId,
    }
  }

  // 一部のテーブルが存在しない
  if (missingTables.length > 0) {
    return {
      status: 'warning',
      connectionMatches: false,
      tables: validationResults,
      missingTables,
      message: `${tables.length}テーブル中${missingTables.length}個が見つかりません`,
      originalConnectionId: savedQuery.connectionId,
      currentConnectionId,
    }
  }

  // すべてのテーブルが存在するが、接続が異なる
  return {
    status: 'valid',
    connectionMatches: false,
    tables: validationResults,
    missingTables: [],
    message: `別の接続のクエリを開きました (${tables.length}テーブル)`,
    originalConnectionId: savedQuery.connectionId,
    currentConnectionId,
  }
}
