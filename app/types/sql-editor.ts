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
