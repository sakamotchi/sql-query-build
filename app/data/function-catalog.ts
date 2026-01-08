export interface FunctionDefinition {
  name: string
  category: 'string' | 'date' | 'numeric' | 'conditional' | 'aggregate'
  description: string
  paramCount: number | 'variable'
  example: string
  dbSpecificSyntax?: string
}

export type FunctionCatalogDbType = 'postgresql' | 'mysql' | 'sqlite'

/**
 * データベース種別に応じた関数カタログを取得
 */
export function getFunctionCatalog(dbType: FunctionCatalogDbType): FunctionDefinition[] {
  switch (dbType) {
    case 'postgresql':
      return POSTGRESQL_FUNCTIONS
    case 'mysql':
      return MYSQL_FUNCTIONS
    case 'sqlite':
      return SQLITE_FUNCTIONS
    default:
      return COMMON_FUNCTIONS
  }
}

/**
 * すべてのDBで共通して使える関数
 */
export const COMMON_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'UPPER',
    category: 'string',
    description: '文字列を大文字に変換',
    paramCount: 1,
    example: "UPPER('hello') -> 'HELLO'",
  },
  {
    name: 'LOWER',
    category: 'string',
    description: '文字列を小文字に変換',
    paramCount: 1,
    example: "LOWER('HELLO') -> 'hello'",
  },
  {
    name: 'TRIM',
    category: 'string',
    description: '前後の空白を削除',
    paramCount: 1,
    example: "TRIM('  hello  ') -> 'hello'",
  },
  {
    name: 'LENGTH',
    category: 'string',
    description: '文字列の長さを取得',
    paramCount: 1,
    example: "LENGTH('hello') -> 5",
  },
  {
    name: 'ROUND',
    category: 'numeric',
    description: '数値を四捨五入',
    paramCount: 2,
    example: 'ROUND(123.456, 2) -> 123.46',
  },
  {
    name: 'CEIL',
    category: 'numeric',
    description: '数値を切り上げ',
    paramCount: 1,
    example: 'CEIL(123.45) -> 124',
  },
  {
    name: 'FLOOR',
    category: 'numeric',
    description: '数値を切り捨て',
    paramCount: 1,
    example: 'FLOOR(123.45) -> 123',
  },
  {
    name: 'ABS',
    category: 'numeric',
    description: '絶対値を取得',
    paramCount: 1,
    example: 'ABS(-123) -> 123',
  },
  {
    name: 'COALESCE',
    category: 'conditional',
    description: '最初のNULLでない値を返す',
    paramCount: 'variable',
    example: "COALESCE(null, null, 'default') -> 'default'",
  },
  {
    name: 'NULLIF',
    category: 'conditional',
    description: '2つの値が等しい場合NULLを返す',
    paramCount: 2,
    example: 'NULLIF(value1, value2)',
  },
  {
    name: 'COUNT',
    category: 'aggregate',
    description: '行数をカウント',
    paramCount: 1,
    example: 'COUNT(*) -> 100',
  },
  {
    name: 'SUM',
    category: 'aggregate',
    description: '合計を計算',
    paramCount: 1,
    example: 'SUM(price)',
  },
  {
    name: 'AVG',
    category: 'aggregate',
    description: '平均を計算',
    paramCount: 1,
    example: 'AVG(price)',
  },
  {
    name: 'MIN',
    category: 'aggregate',
    description: '最小値を取得',
    paramCount: 1,
    example: 'MIN(price)',
  },
  {
    name: 'MAX',
    category: 'aggregate',
    description: '最大値を取得',
    paramCount: 1,
    example: 'MAX(price)',
  },
]

/**
 * PostgreSQL専用関数カタログ
 */
export const POSTGRESQL_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,
  {
    name: 'CONCAT',
    category: 'string',
    description: '文字列を連結',
    paramCount: 'variable',
    example: "CONCAT('Hello', ' ', 'World') -> 'Hello World'",
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTRING('hello', 1, 3) -> 'hel'",
  },
  {
    name: 'NOW',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 0,
    example: "NOW() -> '2026-01-03 10:30:00'",
  },
  {
    name: 'CURRENT_DATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 0,
    example: "CURRENT_DATE -> '2026-01-03'",
  },
  {
    name: 'EXTRACT',
    category: 'date',
    description: '日付から特定の部分を抽出',
    paramCount: 2,
    example: 'EXTRACT(YEAR FROM date)',
    dbSpecificSyntax: 'EXTRACT(field FROM source)',
  },
  {
    name: 'TO_CHAR',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "TO_CHAR(date, 'YYYY-MM-DD')",
  },
]

/**
 * MySQL専用関数カタログ
 */
export const MYSQL_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,
  {
    name: 'CONCAT',
    category: 'string',
    description: '文字列を連結',
    paramCount: 'variable',
    example: "CONCAT('Hello', ' ', 'World') -> 'Hello World'",
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTRING('hello', 1, 3) -> 'hel'",
  },
  {
    name: 'NOW',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 0,
    example: "NOW() -> '2026-01-03 10:30:00'",
  },
  {
    name: 'CURDATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 0,
    example: "CURDATE() -> '2026-01-03'",
  },
  {
    name: 'DATE_FORMAT',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "DATE_FORMAT(date, '%Y-%m-%d')",
  },
  {
    name: 'YEAR',
    category: 'date',
    description: '年を抽出',
    paramCount: 1,
    example: 'YEAR(date) -> 2026',
  },
  {
    name: 'MONTH',
    category: 'date',
    description: '月を抽出',
    paramCount: 1,
    example: 'MONTH(date) -> 1',
  },
  {
    name: 'DAY',
    category: 'date',
    description: '日を抽出',
    paramCount: 1,
    example: 'DAY(date) -> 3',
  },
]

/**
 * SQLite専用関数カタログ
 */
export const SQLITE_FUNCTIONS: FunctionDefinition[] = [
  ...COMMON_FUNCTIONS,
  {
    name: 'SUBSTR',
    category: 'string',
    description: '文字列の一部を抽出',
    paramCount: 3,
    example: "SUBSTR('hello', 1, 3) -> 'hel'",
    dbSpecificSyntax: 'SUBSTR(string, start, length)',
  },
  {
    name: '||',
    category: 'string',
    description: '文字列を連結（演算子）',
    paramCount: 2,
    example: "'Hello' || ' ' || 'World' -> 'Hello World'",
    dbSpecificSyntax: 'string1 || string2',
  },
  {
    name: 'DATE',
    category: 'date',
    description: '現在の日付を取得',
    paramCount: 1,
    example: "DATE('now') -> '2026-01-03'",
  },
  {
    name: 'DATETIME',
    category: 'date',
    description: '現在の日時を取得',
    paramCount: 1,
    example: "DATETIME('now') -> '2026-01-03 10:30:00'",
  },
  {
    name: 'STRFTIME',
    category: 'date',
    description: '日付を文字列にフォーマット',
    paramCount: 2,
    example: "STRFTIME('%Y-%m-%d', date)",
  },
]
