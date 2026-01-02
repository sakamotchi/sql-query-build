import type { SerializableBuilderState } from '@/types/saved-query'
import type { SerializableMutationState } from '@/stores/mutation-builder'

export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * 保存されたクエリの種類を判定
 */
export function detectQueryType(query: SerializableBuilderState): QueryType {
  // QueryBuilderの場合（selectedTablesプロパティがある）
  if ('selectedTables' in query) {
    return 'SELECT'
  }

  // MutationBuilderの場合（mutationTypeプロパティがある）
  if ('mutationType' in query) {
    const mutationQuery = query as SerializableMutationState
    return mutationQuery.mutationType as QueryType
  }

  // デフォルトはSELECT
  return 'SELECT'
}

/**
 * クエリタイプに応じた画面パスを取得
 */
export function getQueryBuilderPath(queryType: QueryType): string {
  switch (queryType) {
    case 'SELECT':
      return '/query-builder'
    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
      return '/mutation-builder'
    default:
      return '/query-builder'
  }
}

/**
 * クエリタイプの表示名を取得
 */
export function getQueryTypeLabel(queryType: QueryType): string {
  switch (queryType) {
    case 'SELECT':
      return 'データ参照'
    case 'INSERT':
      return 'データ追加'
    case 'UPDATE':
      return 'データ更新'
    case 'DELETE':
      return 'データ削除'
    default:
      return 'クエリ'
  }
}
