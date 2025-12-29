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
  /** エラーメッセージ（DBオリジナル） */
  message: string
  /** 詳細情報 */
  details?: QueryErrorDetails
  /** DBネイティブのエラーコード */
  nativeCode?: string
}

export type QueryErrorCode =
  // 接続関連
  | 'connection_failed'
  | 'connection_timeout'
  | 'authentication_failed'
  // クエリ実行関連
  | 'query_timeout'
  | 'query_cancelled'
  // SQL構文関連
  | 'syntax_error'
  // 権限関連
  | 'permission_denied'
  // オブジェクト関連
  | 'table_not_found'
  | 'column_not_found'
  | 'schema_not_found'
  | 'database_not_found'
  // 制約関連
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'check_violation'
  | 'not_null_violation'
  // データ関連
  | 'data_truncation'
  | 'division_by_zero'
  | 'invalid_data_type'
  // その他
  | 'unknown'

export interface QueryErrorDetails {
  /** エラー位置（行番号、1始まり） */
  line?: number
  /** エラー位置（列番号、1始まり） */
  column?: number
  /** エラー発生箇所のSQL抜粋 */
  sqlSnippet?: string
  /** エラー発生箇所の文字位置 */
  position?: number
  /** 問題のあるオブジェクト名 */
  objectName?: string
  /** 追加のコンテキスト情報 */
  context?: string
}
