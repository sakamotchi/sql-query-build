import type { SerializableQueryState } from '@/stores/query-builder'

/**
 * クエリ履歴
 */
export interface QueryHistory {
  id: string
  connectionId: string
  query: SerializableQueryState
  sql: string
  executedAt: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
  errorMessage?: string
}

/**
 * クエリ履歴のメタデータ（一覧表示用）
 */
export interface QueryHistoryMetadata {
  id: string
  connectionId: string
  sql: string
  executedAt: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
}

/**
 * 履歴追加リクエスト
 */
export interface AddHistoryRequest {
  connectionId: string
  query: SerializableQueryState
  sql: string
  success: boolean
  resultCount?: number
  executionTimeMs?: number
  errorMessage?: string
}

/**
 * 履歴検索リクエスト
 */
export interface SearchHistoryRequest {
  keyword?: string
  connectionId?: string
  successOnly?: boolean
  fromDate?: string
  toDate?: string
  limit?: number
}
