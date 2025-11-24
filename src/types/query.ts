export interface QueryTable {
  /** テーブルのユニークID */
  id: string;
  /** テーブル名 */
  name: string;
  /** スキーマ名 */
  schema?: string;
  /** エイリアス */
  alias?: string;
}

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface QueryJoin {
  id?: string;
  fromTableId: string;
  toTableId: string;
  type: JoinType;
  condition: string;
}

export interface QueryColumn {
  tableId: string;
  name: string;
  alias?: string;
  aggregate?: string;
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: string | number | boolean | null;
  conjunction?: 'AND' | 'OR';
}

export interface QueryOrderBy {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryModel {
  tables: QueryTable[];
  joins: QueryJoin[];
  columns: QueryColumn[];
  where: QueryCondition[];
  groupBy: string[];
  having: QueryCondition[];
  orderBy: QueryOrderBy[];
  limit: number | null;
  offset: number | null;
}

export interface QueryInfo {
  rowCount: number;
  executionTime: number | null;
  lastExecutedAt: string | null;
}
