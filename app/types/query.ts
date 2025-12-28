import type { Column } from './database-structure'

/**
 * クエリモデル型定義
 */

/**
 * 選択されたテーブル（テーブルカード用）
 */
export interface SelectedTable {
  /** 一意識別子（schema.table_name） */
  id: string
  /** スキーマ名 */
  schema: string
  /** テーブル名 */
  name: string
  /** エイリアス */
  alias: string
  /** カラム一覧 */
  columns: Column[]
}

/**
 * WHERE演算子
 */
export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'IS NULL'
  | 'IS NOT NULL'

/**
 * WHERE条件
 */
export interface WhereCondition {
  id: string
  type: 'condition'
  column: {
    tableAlias: string
    columnName: string
  } | null
  operator: WhereOperator
  value: string | string[] | { from: string; to: string }
  isValid: boolean
}

/**
 * 条件グループ
 */
export interface ConditionGroup {
  id: string
  type: 'group'
  logic: 'AND' | 'OR'
  conditions: Array<WhereCondition | ConditionGroup>
}

/**
 * 選択されたカラム（カラム選択UI用）
 */
export interface SelectedColumn {
  /** テーブルID（SelectedTable.idに対応） */
  tableId: string
  /** テーブルエイリアス */
  tableAlias: string
  /** カラム名 */
  columnName: string
  /** カラムエイリアス */
  columnAlias: string | null
  /** データ型 */
  dataType: string
}

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
  /** WHERE条件一覧 (ルートはグループまたは条件のリスト) */
  where: Array<WhereCondition | ConditionGroup>;
  /** GROUP BY一覧 */
  groupBy: string[];
  /** HAVING条件一覧 */
  having: Array<WhereCondition | ConditionGroup>;
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
