/**
 * クエリモデル型定義
 */

/**
 * テーブル情報
 */
export interface TableInfo {
  /** スキーマ名 */
  schema: string;
  /** テーブル名 */
  name: string;
  /** エイリアス */
  alias?: string;
}

/**
 * JOIN情報
 */
export interface JoinInfo {
  /** JOIN種別 */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  /** 結合先テーブル */
  table: TableInfo;
  /** ON条件 */
  on?: {
    left: string;
    right: string;
    operator: string;
  };
}

/**
 * カラム情報
 */
export interface ColumnInfo {
  /** テーブル */
  table: string;
  /** カラム名 */
  name: string;
  /** エイリアス */
  alias?: string;
  /** 集約関数 */
  aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
}

/**
 * WHERE条件
 */
export interface WhereCondition {
  /** カラム */
  column: string;
  /** 演算子 */
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  /** 値 */
  value?: any;
  /** 論理演算子 */
  logic?: 'AND' | 'OR';
}

/**
 * ORDER BY情報
 */
export interface OrderByInfo {
  /** カラム */
  column: string;
  /** 順序 */
  direction: 'ASC' | 'DESC';
}

/**
 * クエリモデル
 */
export interface QueryModel {
  /** テーブル一覧 */
  tables: TableInfo[];
  /** JOIN一覧 */
  joins: JoinInfo[];
  /** カラム一覧 */
  columns: ColumnInfo[];
  /** WHERE条件一覧 */
  where: WhereCondition[];
  /** GROUP BY一覧 */
  groupBy: string[];
  /** HAVING条件一覧 */
  having: WhereCondition[];
  /** ORDER BY一覧 */
  orderBy: OrderByInfo[];
  /** LIMIT */
  limit: number | null;
  /** OFFSET */
  offset: number | null;
}

/**
 * クエリ情報
 */
export interface QueryInfo {
  /** 行数 */
  rowCount: number;
  /** 実行時間（ミリ秒） */
  executionTime: number | null;
  /** 最終実行日時 */
  lastExecutedAt: Date | null;
}

/**
 * クエリ実行結果
 */
export interface QueryResult {
  /** カラム情報 */
  columns: {
    name: string;
    type: string;
  }[];
  /** 行データ */
  rows: any[];
  /** クエリ情報 */
  info: QueryInfo;
}
