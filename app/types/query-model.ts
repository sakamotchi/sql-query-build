/**
 * クエリモデル（完全版）
 */
export interface QueryModel {
  /** クエリID（保存時に使用） */
  id?: string
  /** クエリ名（保存時に使用） */
  name?: string
  /** クエリの説明（保存時に使用） */
  description?: string
  /** 接続ID */
  connectionId: string
  /** SELECT句 */
  select: SelectClause
  /** FROM句 */
  from: FromClause
  /** JOIN句 */
  joins: JoinClause[]
  /** WHERE句 */
  whereClause?: WhereClause
  /** GROUP BY句 */
  groupBy?: GroupByClause
  /** HAVING句 */
  having?: HavingClause
  /** ORDER BY句 */
  orderBy?: OrderByClause
  /** LIMIT/OFFSET */
  limit: LimitClause | null
  /** 作成日時 */
  createdAt?: string
  /** 更新日時 */
  updatedAt?: string
}

/**
 * SELECT句
 */
export interface SelectClause {
  /** DISTINCT */
  distinct: boolean
  /** 選択カラム */
  columns: SelectColumn[]
}

/**
 * 選択カラム
 */
export interface SelectColumn {
  /** カラムタイプ */
  type: 'column' | 'expression' | 'aggregate' | 'all'
  /** テーブルエイリアス（type: 'column' | 'all' の場合） */
  tableAlias?: string
  /** カラム名（type: 'column' の場合） */
  columnName?: string
  /** 式（type: 'expression' の場合） */
  expression?: string
  /** 集計関数（type: 'aggregate' の場合） */
  aggregate?: AggregateFunction
  /** 出力エイリアス（AS句） */
  alias?: string | null
}

/**
 * 集計関数
 */
export interface AggregateFunction {
  /** 関数名 */
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT'
  /** 対象カラム */
  column:
    | {
        tableAlias: string
        columnName: string
      }
    | '*'
}

/**
 * FROM句
 */
export interface FromClause {
  /** メインテーブル */
  table: TableReference
}

/**
 * テーブル参照
 */
export interface TableReference {
  /** スキーマ名 */
  schema: string
  /** テーブル名 */
  name: string
  /** エイリアス */
  alias: string
}

/**
 * JOIN句
 */
export interface JoinClause {
  /** JOIN ID */
  id: string
  /** JOIN種別 */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  /** 結合テーブル */
  table: TableReference
  /** 結合条件 */
  conditions: JoinCondition[]
  /** 条件の結合方法 */
  conditionLogic: 'AND' | 'OR'
}

/**
 * JOIN条件
 */
export interface JoinCondition {
  /** 左側（元テーブル） */
  left: {
    tableAlias: string
    columnName: string
  }
  /** 演算子 */
  operator: '=' | '!=' | '>' | '>=' | '<' | '<='
  /** 右側（結合テーブル） */
  right: {
    tableAlias: string
    columnName: string
  }
}

/**
 * WHERE句
 */
export interface WhereClause {
  /** 条件の結合方法 */
  logic: 'AND' | 'OR'
  /** 条件リスト */
  conditions: WhereConditionItem[]
}

/**
 * WHERE条件アイテム（条件またはグループ）
 */
export type WhereConditionItem = WhereCondition | WhereConditionGroup

/**
 * WHERE条件
 */
export interface WhereCondition {
  /** タイプ */
  type: 'condition'
  /** 条件ID */
  id: string
  /** カラム */
  column: {
    tableAlias: string
    columnName: string
  }
  /** 演算子 */
  operator: WhereOperator
  /** 値 */
  value: WhereValue
}

/**
 * WHERE演算子
 */
export type WhereOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'NOT ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'NOT BETWEEN'
  | 'IS NULL'
  | 'IS NOT NULL'

/**
 * WHERE値
 */
export type WhereValue =
  | { type: 'literal'; value: string | number | boolean | null }
  | { type: 'list'; values: Array<string | number> }
  | { type: 'range'; from: string | number; to: string | number }
  | { type: 'column'; tableAlias: string; columnName: string }
  | { type: 'subquery'; query: QueryModel }

/**
 * 条件グループ
 */
export interface WhereConditionGroup {
  /** タイプ */
  type: 'group'
  /** グループID */
  id: string
  /** グループ内の結合方法 */
  logic: 'AND' | 'OR'
  /** 条件リスト */
  conditions: WhereConditionItem[]
}

/**
 * GROUP BY句
 */
export interface GroupByClause {
  /** グループ化カラム */
  columns: GroupByColumn[]
}

/**
 * グループ化カラム
 */
export interface GroupByColumn {
  /** テーブルエイリアス */
  tableAlias: string
  /** カラム名 */
  columnName: string
}

/**
 * HAVING句
 */
export interface HavingClause {
  /** 条件の結合方法 */
  logic: 'AND' | 'OR'
  /** 条件リスト */
  conditions: HavingCondition[]
}

/**
 * HAVING条件
 */
export interface HavingCondition {
  /** 条件ID */
  id: string
  /** 集計関数 */
  aggregate: AggregateFunction
  /** 演算子 */
  operator: WhereOperator
  /** 値 */
  value: string | number
}

/**
 * ORDER BY句
 */
export interface OrderByClause {
  /** ソート項目 */
  items: OrderByItem[]
}

/**
 * ソート項目
 */
export interface OrderByItem {
  /** テーブルエイリアス */
  tableAlias: string
  /** カラム名 */
  columnName: string
  /** ソート順 */
  direction: 'ASC' | 'DESC'
  /** NULL値の位置（PostgreSQL） */
  nulls?: 'FIRST' | 'LAST'
}

/**
 * LIMIT/OFFSET句
 */
export interface LimitClause {
  /** 取得件数 */
  limit: number
  /** オフセット */
  offset?: number
}

/**
 * フロントエンド用クエリ状態
 */
export interface QueryBuilderState {
  /** 選択されたテーブル */
  selectedTables: SelectedTable[]
  /** 選択されたカラム */
  selectedColumns: SelectedColumn[]
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | WhereConditionGroup>
  /** WHERE条件の結合方法 */
  whereLogic: 'AND' | 'OR'
  /** GROUP BY カラム（フェーズ2） */
  groupByColumns: GroupByColumn[]
  /** HAVING条件（フェーズ2） */
  havingConditions: HavingCondition[]
  /** ORDER BY項目（フェーズ2） */
  orderByItems: OrderByItem[]
  /** LIMIT（フェーズ2） */
  limit: number | null
  /** OFFSET（フェーズ2） */
  offset: number | null
  /** DISTINCT */
  distinct: boolean
  /** JOIN設定（フェーズ2） */
  joins: JoinClause[]
}

/**
 * 選択されたテーブル
 */
export interface SelectedTable {
  /** 一意識別子 */
  id: string
  /** スキーマ名 */
  schema: string
  /** テーブル名 */
  name: string
  /** エイリアス */
  alias: string
  /** カラム情報 */
  columns: Column[]
}

/**
 * カラム情報（SelectedTable内部用）
 */
export interface Column {
  name: string
  dataType: string
}

/**
 * 選択されたカラム
 */
export interface SelectedColumn {
  /** テーブルID */
  tableId: string
  /** テーブルエイリアス */
  tableAlias: string
  /** カラム名 */
  columnName: string
  /** カラムエイリアス（AS句） */
  columnAlias: string | null
  /** データ型 */
  dataType: string
}
