
import type { QueryExecuteError, QueryErrorCode } from '@/types/query-result'

export interface ErrorMessage {
  title: string
  description: string
}

export interface ErrorHint {
  title: string
  suggestion: string
  examples?: string[]
}

const ERROR_MESSAGES: Record<QueryErrorCode, ErrorMessage> = {
  // 接続関連
  connection_failed: {
    title: '接続エラー',
    description: 'データベースへの接続に失敗しました。',
  },
  connection_timeout: {
    title: '接続タイムアウト',
    description: 'データベースへの接続がタイムアウトしました。',
  },
  authentication_failed: {
    title: '認証エラー',
    description: 'ユーザー名またはパスワードが正しくありません。',
  },

  // クエリ実行関連
  query_timeout: {
    title: 'クエリタイムアウト',
    description: 'クエリの実行がタイムアウトしました。',
  },
  query_cancelled: {
    title: 'クエリキャンセル',
    description: 'クエリの実行がキャンセルされました。',
  },

  // SQL構文関連
  syntax_error: {
    title: 'SQL構文エラー',
    description: 'SQLの構文に誤りがあります。',
  },

  // 権限関連
  permission_denied: {
    title: '権限エラー',
    description: 'この操作を実行する権限がありません。',
  },

  // オブジェクト関連
  table_not_found: {
    title: 'テーブルが見つかりません',
    description: '指定されたテーブルが存在しません。',
  },
  column_not_found: {
    title: 'カラムが見つかりません',
    description: '指定されたカラムが存在しません。',
  },
  schema_not_found: {
    title: 'スキーマが見つかりません',
    description: '指定されたスキーマが存在しません。',
  },
  database_not_found: {
    title: 'データベースが見つかりません',
    description: '指定されたデータベースが存在しません。',
  },

  // 制約関連
  unique_violation: {
    title: '一意制約違反',
    description: '重複する値を挿入しようとしました。',
  },
  foreign_key_violation: {
    title: '外部キー制約違反',
    description: '参照先のレコードが存在しません。',
  },
  check_violation: {
    title: 'CHECK制約違反',
    description: 'CHECK制約の条件を満たしていません。',
  },
  not_null_violation: {
    title: 'NOT NULL制約違反',
    description: 'NULL値を許可しないカラムにNULLを挿入しようとしました。',
  },

  // データ関連
  data_truncation: {
    title: 'データ切り捨て',
    description: '値がカラムのサイズを超えています。',
  },
  division_by_zero: {
    title: 'ゼロ除算エラー',
    description: '0で除算することはできません。',
  },
  invalid_data_type: {
    title: 'データ型エラー',
    description: '値のデータ型が不正です。',
  },

  // その他
  unknown: {
    title: '予期しないエラー',
    description: '予期しないエラーが発生しました。',
  },
}

const ERROR_HINTS: Partial<Record<QueryErrorCode, ErrorHint>> = {
  syntax_error: {
    title: '構文を確認してください',
    suggestion: 'SQLの構文を確認し、キーワードのスペルや括弧の対応をチェックしてください。',
    examples: [
      'カンマやセミコロンが正しい位置にあるか確認',
      '予約語を識別子として使用していないか確認',
      '文字列リテラルのクォートが閉じているか確認',
    ],
  },
  table_not_found: {
    title: 'テーブル名を確認してください',
    suggestion: 'テーブル名のスペルやスキーマ名を確認してください。',
    examples: [
      'テーブル名の大文字小文字を確認',
      'スキーマ名を指定して再試行（例: schema_name.table_name）',
      'データベースツリーでテーブル名を確認',
    ],
  },
  column_not_found: {
    title: 'カラム名を確認してください',
    suggestion: 'カラム名のスペルを確認するか、テーブルのスキーマを確認してください。',
    examples: [
      'カラム名の大文字小文字を確認',
      'エイリアスが正しく定義されているか確認',
    ],
  },
  permission_denied: {
    title: '権限を確認してください',
    suggestion: 'ユーザーに必要な権限が付与されているか管理者に確認してください。',
  },
  foreign_key_violation: {
    title: '参照整合性を確認してください',
    suggestion: '挿入または更新しようとしているデータが参照先のテーブルに存在することを確認してください。',
  },
}

const ERROR_ICONS: Record<QueryErrorCode, string> = {
  connection_failed: 'i-heroicons-globe-alt',
  connection_timeout: 'i-heroicons-clock',
  authentication_failed: 'i-heroicons-key',
  query_timeout: 'i-heroicons-clock',
  query_cancelled: 'i-heroicons-stop',
  syntax_error: 'i-heroicons-code-bracket-square',
  permission_denied: 'i-heroicons-lock-closed',
  table_not_found: 'i-heroicons-table-cells',
  column_not_found: 'i-heroicons-view-columns',
  schema_not_found: 'i-heroicons-folder',
  database_not_found: 'i-heroicons-server',
  unique_violation: 'i-heroicons-exclamation-circle',
  foreign_key_violation: 'i-heroicons-link',
  check_violation: 'i-heroicons-shield-check',
  not_null_violation: 'i-heroicons-no-symbol',
  data_truncation: 'i-heroicons-scissors',
  division_by_zero: 'i-heroicons-divide',
  invalid_data_type: 'i-heroicons-variable',
  unknown: 'i-heroicons-exclamation-triangle',
}

/**
 * エラーメッセージを取得
 */
export function getErrorMessage(error: QueryExecuteError): ErrorMessage {
  if (!error) {
    return ERROR_MESSAGES.unknown
  }
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.unknown
}

/**
 * エラーヒントを取得
 */
export function getErrorHint(error: QueryExecuteError): ErrorHint | undefined {
  if (!error) {
    return undefined
  }
  return ERROR_HINTS[error.code]
}

/**
 * エラーアイコンを取得
 */
export function getErrorIcon(code: QueryErrorCode): string {
  return ERROR_ICONS[code] || ERROR_ICONS.unknown
}
