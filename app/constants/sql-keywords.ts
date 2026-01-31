import type { SqlKeyword } from '~/types/sql-completion'

/**
 * SQLキーワード定義
 */
export const SQL_KEYWORDS: SqlKeyword[] = [
  { name: 'SELECT', category: 'dml', description: 'データを取得' },
  { name: 'INSERT', category: 'dml', description: 'データを挿入' },
  { name: 'UPDATE', category: 'dml', description: 'データを更新' },
  { name: 'DELETE', category: 'dml', description: 'データを削除' },

  { name: 'CREATE', category: 'ddl', description: 'オブジェクトを作成' },
  { name: 'ALTER', category: 'ddl', description: 'オブジェクトを変更' },
  { name: 'DROP', category: 'ddl', description: 'オブジェクトを削除' },
  { name: 'TRUNCATE', category: 'ddl', description: 'テーブルを切り詰め' },

  { name: 'FROM', category: 'clause', description: 'テーブルを指定' },
  { name: 'WHERE', category: 'clause', description: '条件を指定' },
  { name: 'GROUP BY', category: 'clause', description: 'グループ化' },
  { name: 'HAVING', category: 'clause', description: 'グループ化後の条件' },
  { name: 'ORDER BY', category: 'clause', description: '並び替え' },
  { name: 'LIMIT', category: 'clause', description: '取得件数を制限' },
  { name: 'OFFSET', category: 'clause', description: '開始位置を指定' },

  { name: 'JOIN', category: 'clause', description: 'テーブルを結合' },
  { name: 'INNER JOIN', category: 'clause', description: '内部結合' },
  { name: 'LEFT JOIN', category: 'clause', description: '左外部結合' },
  { name: 'RIGHT JOIN', category: 'clause', description: '右外部結合' },
  { name: 'FULL JOIN', category: 'clause', description: '完全外部結合' },
  { name: 'CROSS JOIN', category: 'clause', description: '交差結合' },
  { name: 'ON', category: 'clause', description: '結合条件' },

  { name: 'AND', category: 'operator', description: '論理積' },
  { name: 'OR', category: 'operator', description: '論理和' },
  { name: 'NOT', category: 'operator', description: '否定' },
  { name: 'IN', category: 'operator', description: '値のリストに含まれる' },
  { name: 'BETWEEN', category: 'operator', description: '範囲指定' },
  { name: 'LIKE', category: 'operator', description: 'パターンマッチ' },
  { name: 'IS NULL', category: 'operator', description: 'NULL判定' },
  { name: 'IS NOT NULL', category: 'operator', description: '非NULL判定' },
  { name: 'EXISTS', category: 'operator', description: '存在チェック' },

  { name: 'AS', category: 'other', description: '別名定義' },
  { name: 'DISTINCT', category: 'other', description: '重複を除外' },
  { name: 'ALL', category: 'other', description: 'すべて' },
  { name: 'ASC', category: 'other', description: '昇順' },
  { name: 'DESC', category: 'other', description: '降順' },
  { name: 'CASE', category: 'other', description: '条件分岐' },
  { name: 'WHEN', category: 'other', description: 'CASE文の条件' },
  { name: 'THEN', category: 'other', description: 'CASE文の結果' },
  { name: 'ELSE', category: 'other', description: 'CASE文のデフォルト' },
  { name: 'END', category: 'other', description: 'CASE文の終了' },
]

/**
 * Monaco CompletionItemKindへのマッピング
 */
export const COMPLETION_KIND_MAP = {
  keyword: 14,
  function: 1,
  table: 19,
  column: 10,
  schema: 8,
  alias: 4,
} as const
