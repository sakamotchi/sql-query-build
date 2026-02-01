import type * as monaco from 'monaco-editor'

/**
 * SQL補完アイテムの種類
 */
export type SqlCompletionKind =
  | 'keyword'
  | 'function'
  | 'table'
  | 'column'
  | 'schema'
  | 'alias'

/**
 * SQL補完アイテム
 */
export interface SqlCompletionItem {
  label: string
  kind: SqlCompletionKind
  insertText: string
  detail?: string
  documentation?: string
  sortText?: string
  filterText?: string
}

/**
 * SQLキーワード定義
 */
export interface SqlKeyword {
  name: string
  description?: string
  category: 'dml' | 'ddl' | 'clause' | 'operator' | 'other'
}

/**
 * 補完コンテキスト
 */
export interface CompletionContext {
  connectionId: string | null
  databaseType: 'postgresql' | 'mysql' | 'sqlite' | null
  selectedDatabase: string | null          // 選択中のデータベース/スキーマ
  currentWord: string
  previousWord: string | null
  lineText: string
  position: monaco.Position
  fullSql: string                          // SQL文全体
  aliases: Record<string, string>          // エイリアス → テーブル名のマップ
  range: monaco.IRange                     // 補完の適用範囲
}
