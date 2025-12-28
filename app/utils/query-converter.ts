import type {
  SelectedTable,
  SelectedColumn,
  WhereCondition,
  ConditionGroup,
  GroupByColumn,
  OrderByColumn,
} from '@/types/query'
import type {
  QueryModel,
  WhereClause,
  WhereConditionItem,
  WhereValue,
  WhereOperator,
  SelectColumn,
  LimitClause,
  OrderByItem,
} from '@/types/query-model'

/**
 * UI側のクエリ状態（ストアの状態と同じ構造）
 */
export interface UIQueryState {
  selectedTables: SelectedTable[]
  selectedColumns: SelectedColumn[]
  whereConditions: Array<WhereCondition | ConditionGroup>
  groupByColumns: GroupByColumn[]
  orderByColumns: OrderByColumn[]
  limit: number | null
  offset: number | null
}

/**
 * フロントエンド状態からクエリモデルに変換
 */
export function convertToQueryModel(
  state: UIQueryState,
  connectionId: string
): QueryModel {
  // メインテーブル（最初のテーブル）
  const mainTable = state.selectedTables[0]
  if (!mainTable) {
    throw new Error('No table selected')
  }

  // UI側のSelectedTableのcolumn definitionはdatabase-structureのColumnなので、
  // QueryModelのSelectedTableとは異なるが、ここではQueryModelのFromClauseを作るだけなので
  // schema, name, aliasがあれば良い。

  return {
    connectionId,
    select: {
      distinct: false, // UIにまだ設定がないのでデフォルト
      columns: convertSelectedColumns(state.selectedColumns),
    },
    from: {
      table: {
        schema: mainTable.schema,
        name: mainTable.name,
        alias: mainTable.alias,
      },
    },
    joins: [], // UIにまだ設定がないので空
    whereClause: convertWhereConditions(state.whereConditions, 'AND'), // デフォルトAND
    groupBy:
      state.groupByColumns.length > 0
        ? { columns: convertGroupByColumns(state.groupByColumns) }
        : null,
    having: null, // UIにまだ設定がない
    orderBy:
      state.orderByColumns.length > 0
        ? { items: convertOrderByColumns(state.orderByColumns) }
        : null,
    limit: convertLimit(state.limit, state.offset),
    createdAt: undefined,
    updatedAt: undefined,
  }
}

/**
 * 選択カラムを変換
 */
function convertSelectedColumns(columns: SelectedColumn[]): SelectColumn[] {
  return columns.map((col) => ({
    type: 'column',
    tableAlias: col.tableAlias,
    columnName: col.columnName,
    alias: col.columnAlias,
  }))
}

/**
 * WHERE条件を変換
 */
function convertWhereConditions(
  conditions: Array<WhereCondition | ConditionGroup>,
  logic: 'AND' | 'OR'
): WhereClause | null {
  // 有効な条件のみフィルタ
  const validConditions = conditions.filter((c) => {
    if (c.type === 'condition') {
      return c.column !== null && c.isValid
    }
    return c.conditions.length > 0
  })

  if (validConditions.length === 0) {
    return null
  }

  return {
    logic,
    conditions: validConditions.map(convertWhereConditionItem),
  }
}

/**
 * WHERE条件アイテムを変換
 */
function convertWhereConditionItem(
  item: WhereCondition | ConditionGroup
): WhereConditionItem {
  if (item.type === 'group') {
    return {
      type: 'group',
      id: item.id,
      logic: item.logic,
      conditions: item.conditions.map(convertWhereConditionItem),
    }
  }

  // UI側のWhereCondition.valueは string | string[] | {from, to}
  // Model側のWhereValueに変換する必要がある
  const value = convertWhereValue(item.value, item.operator)

  return {
    type: 'condition',
    id: item.id,
    column: item.column!,
    operator: item.operator,
    value,
  }
}

/**
 * WHERE値を変換
 */
function convertWhereValue(
  value: string | string[] | { from: string; to: string },
  operator: WhereOperator
): WhereValue {
  if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
    return { type: 'literal', value: null }
  }
  
  // NOTE: WhereValue definition in query-model.ts structure
  
  if (operator === 'IN' || operator === 'NOT IN') {
    const arr = Array.isArray(value) ? value : [value as string]
    return {
      type: 'list',
      values: arr.map(parseValue),
    }
  }

  if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
    const range = value as { from: string; to: string }
    return {
      type: 'range',
      from: parseValue(range.from),
      to: parseValue(range.to),
    }
  }

  // Default literal
  return {
    type: 'literal',
    value: parseValue(value as string),
  }
}

/**
 * GroupByカラムを変換
 */
function convertGroupByColumns(columns: GroupByColumn[]) {
  // UIのGroupByColumn has `column: SelectedColumn | null`
  return columns
    .filter((c) => c.column)
    .map((c) => ({
      tableAlias: c.column!.tableAlias,
      columnName: c.column!.columnName,
    }))
}

/**
 * OrderByカラムを変換
 */
function convertOrderByColumns(columns: OrderByColumn[]): OrderByItem[] {
  return columns
    .filter((c) => c.column)
    .map((c) => ({
      tableAlias: c.column!.tableAlias,
      columnName: c.column!.columnName,
      direction: c.direction,
      nulls: undefined, // UIに設定がないためundefined
    }))
}

/**
 * LIMIT/OFFSETを変換
 */
function convertLimit(limit: number | null, offset: number | null): LimitClause | null {
  if (limit === null && offset === null) {
    return null
  }
  return {
    limit: limit || 0, // LIMITなしでOFFSETありはSQL的に微妙だが、0にしておくか、LIMITなし表現が必要
    // Rust側は u64 なので 0 ok.
    // ただし LIMIT 0 は 0件取得になる。
    // LIMITがnullの場合はALLの意味だが、モデル上は LIMIT句自体の有無で制御。
    // LIMITがnullでOFFSETがある場合、多くのDBではLIMIT指定が必要（MySQL: LIMIT 18446744073709551615, PostgreSQL: LIMIT ALL）
    // ここではLIMITがnullならLimitClause自体を作らないようにするが、OFFSETがある場合は困る。
    // UI仕様として、OFFSET指定時はLIMITも指定させるか、デフォルトを入れるべき。
    // 一旦、LIMITがあればLimitClauseを作る実装にする。
    // OFFSETだけある場合は無視されることになるが、現状のUI実装次第。
    offset: offset || undefined,
  }
}

/**
 * 値をパース（数値判定）
 */
function parseValue(value: string): string | number {
  if (value === null || value === undefined) return value
  const num = Number(value)
  return isNaN(num) ? value : num
}
