import type * as monaco from 'monaco-editor'
import type { QueryExecuteError, QueryExecuteResult } from './query-result'

/**
 * SQLエディタの状態
 */
export interface SqlEditorState {
  /** 接続ID */
  connectionId: string | null
  /** 現在のSQL文字列 */
  sql: string
  /** エディタが変更されたか（保存判定用） */
  isDirty: boolean
  /** 実行中フラグ（Phase 3で使用） */
  isExecuting: boolean
  /** 実行結果（Phase 3で使用） */
  result: QueryExecuteResult | null
  /** エラー情報（Phase 3で使用） */
  error: QueryExecuteError | null
  /** 実行中のクエリID（キャンセル用） */
  executingQueryId: string | null
  /** 現在の選択SQL（未選択時はnull） */
  selectionSql: string | null
  /** 保存済みクエリ一覧 */
  savedQueries: SavedQueryMetadata[]
  /** 読み込み中の保存クエリ */
  currentQuery: SavedQuery | null
  /** 保存クエリの読み込み中フラグ */
  isSavedQueriesLoading: boolean
  /** 保存クエリ関連のエラー */
  savedQueryError: string | null
  /** 保存クエリSQLキャッシュ */
  savedQuerySqlCache: Record<string, string>
  /** 保存ダイアログの表示状態 */
  isSaveDialogOpen: boolean
  /** 編集対象の保存クエリID */
  editingQueryId: string | null
  /** 実行履歴一覧 */
  histories: SqlEditorHistoryEntry[]
  /** 履歴読み込み中フラグ */
  isLoadingHistories: boolean
  /** 履歴検索キーワード */
  historySearchKeyword: string
  /** 成功のみフィルタ */
  historySuccessOnly: boolean
}

/**
 * SQLエディタタブ（Phase 6で使用）
 */
export interface SqlEditorTab {
  /** タブID */
  id: string
  /** タブ名 */
  name: string
  /** SQL文字列 */
  sql: string
  /** 変更フラグ */
  isDirty: boolean
  /** 作成日時 */
  createdAt: string
}

/**
 * 保存クエリ（完全版）
 */
export interface SavedQuery {
  id: string
  connectionId: string
  name: string
  description?: string
  sql: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * 保存クエリメタデータ（一覧表示用）
 */
export interface SavedQueryMetadata {
  id: string
  connectionId: string
  name: string
  description?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * クエリ保存リクエスト
 */
export interface SaveQueryRequest {
  id?: string
  connectionId: string
  name: string
  description?: string
  sql: string
  tags: string[]
}

/**
 * クエリ検索リクエスト
 */
export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
}

/**
 * SQLエディタの実行履歴エントリ
 * 注: Query Builder用の QueryHistory とは別の型です
 */
export interface SqlEditorHistoryEntry {
  /** 履歴ID */
  id: string
  /** 接続ID */
  connectionId: string
  /** 実行したSQL文 */
  sql: string
  /** 実行日時（ISO 8601形式） */
  executedAt: string
  /** 実行時間（ミリ秒） */
  executionTimeMs: number
  /** 実行ステータス */
  status: 'success' | 'error'
  /** 結果行数（成功時のみ） */
  rowCount?: number
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string
}

/**
 * 履歴追加リクエスト
 */
export interface AddSqlEditorHistoryRequest {
  connectionId: string
  sql: string
  status: 'success' | 'error'
  executionTimeMs: number
  rowCount?: number
  errorMessage?: string
}

/**
 * 履歴検索リクエスト
 */
export interface SearchSqlEditorHistoryRequest {
  connectionId?: string
  keyword?: string
  successOnly?: boolean
  limit?: number
}

/**
 * Monaco Editorオプション
 */
export interface MonacoEditorOptions {
  /** テーマ */
  theme: 'vs' | 'vs-dark'
  /** 言語 */
  language: 'sql'
  /** 自動レイアウト */
  automaticLayout: boolean
  /** ミニマップ表示 */
  minimap: monaco.editor.IEditorMinimapOptions
  /** 行番号表示 */
  lineNumbers: monaco.editor.IStandaloneEditorConstructionOptions['lineNumbers']
  /** フォントサイズ */
  fontSize: number
  /** 読み取り専用 */
  readOnly: boolean
}
