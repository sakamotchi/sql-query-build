/**
 * データ変更クエリ実行結果
 */
export interface MutationResult {
  /** 影響行数 */
  affectedRows: number
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
}

/**
 * データ変更クエリ実行リクエスト
 */
export interface MutationExecuteRequest {
  /** 接続ID */
  connectionId: string
  /** 実行するSQL */
  sql: string
  /** タイムアウト（秒） */
  timeoutSeconds?: number
}
