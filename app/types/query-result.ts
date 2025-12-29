/**
 * クエリ実行結果（Rust側QueryResultと対応）
 */
export interface QueryExecuteResult {
  /** カラム情報 */
  columns: QueryResultColumn[]
  /** 行データ */
  rows: QueryResultRow[]
  /** 取得行数 */
  rowCount: number
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
  /** 警告メッセージ */
  warnings: string[]
}

/**
 * カラム情報
 */
export interface QueryResultColumn {
  /** カラム名 */
  name: string
  /** データ型 */
  dataType: string
  /** NULL許容 */
  nullable: boolean
}

/**
 * 行データ
 */
export interface QueryResultRow {
  /** 値の配列（カラム順） */
  values: QueryValue[]
}

/**
 * 値の型
 */
export type QueryValue = null | boolean | number | string | number[]

/**
 * クエリ実行リクエスト
 */
export interface QueryExecuteRequest {
  /** 接続ID */
  connectionId: string
  /** 実行するSQL */
  sql: string
  /** タイムアウト（秒） */
  timeoutSeconds?: number
}

/**
 * クエリ実行レスポンス
 */
export interface QueryExecuteResponse {
  /** クエリID（キャンセル用） */
  queryId: string
  /** 実行結果 */
  result: QueryExecuteResult
}

/**
 * クエリエラー
 */
export interface QueryExecuteError {
  /** エラーコード */
  code: QueryErrorCode
  /** エラーメッセージ */
  message: string
  /** 詳細情報 */
  details?: QueryErrorDetails
}

export type QueryErrorCode =
  | 'connection_failed'
  | 'query_timeout'
  | 'query_cancelled'
  | 'syntax_error'
  | 'permission_denied'
  | 'table_not_found'
  | 'column_not_found'
  | 'unknown'

export interface QueryErrorDetails {
  /** エラー位置（行） */
  line?: number
  /** エラー位置（列） */
  column?: number
  /** エラー発生箇所のSQL */
  sqlSnippet?: string
}
