import type {
  QueryModel,
  QueryBuilderState,
  SelectedColumn as StateSelectedColumn,
  SelectColumn,
  WhereClause,
  WhereCondition,
  WhereConditionGroup,
  WhereConditionItem,
  WhereValue,
  WhereOperator,
} from '@/types/query-model'

/**
 * フロントエンド状態からクエリモデルに変換
 */
export function convertToQueryModel(
  state: QueryBuilderState,
  connectionId: string
): QueryModel {
  // メインテーブル（最初のテーブル）
  const mainTable = state.selectedTables[0]
  if (!mainTable) {
    throw new Error('No table selected')
  }

  return {
    connectionId,
    select: {
      distinct: state.distinct,
      columns: convertSelectedColumns(state.selectedColumns),
    },
    from: {
      table: {
        schema: mainTable.schema,
        name: mainTable.name,
        alias: mainTable.alias,
      },
    },
    joins: state.joins,
    where: convertWhereConditions(state.whereConditions, state.whereLogic),
    groupBy:
      state.groupByColumns.length > 0
        ? { columns: state.groupByColumns }
        : null,
    having:
      state.havingConditions.length > 0
        ? { logic: 'AND', conditions: state.havingConditions }
        : null,
    orderBy:
      state.orderByItems.length > 0 ? { items: state.orderByItems } : null,
    limit: state.limit
      ? { limit: state.limit, offset: state.offset || undefined }
      : null,
  }
}

/**
 * 選択カラムを変換
 */
function convertSelectedColumns(columns: StateSelectedColumn[]): SelectColumn[] {
  return columns.map((col) => ({
    type: 'column' as const,
    tableAlias: col.tableAlias,
    columnName: col.columnName,
    alias: col.columnAlias,
  }))
}

/**
 * WHERE条件を変換
 */
function convertWhereConditions(
  conditions: Array<WhereCondition | WhereConditionGroup>,
  logic: 'AND' | 'OR'
): WhereClause | null {
  // 有効な条件のみフィルタ
  const validConditions = conditions.filter((c) => {
    if (c.type === 'condition') {
      return c.column !== null
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
  item: WhereCondition | WhereConditionGroup
): WhereConditionItem {
  if (item.type === 'group') {
    return {
      type: 'group',
      id: item.id,
      logic: item.logic,
      conditions: item.conditions.map(convertWhereConditionItem),
    }
  }

  return {
    type: 'condition',
    id: item.id,
    column: item.column!,
    operator: item.operator,
    value: convertWhereValue(item.value, item.operator),
  }
}

/**
 * WHERE値を変換
 */
function convertWhereValue(
  value: WhereValue,
  operator: WhereOperator
): WhereValue {
  // すでにWhereValue型になっている場合はそのまま返すか、適切な変換を行う
  // ここでは設計書のロジックに従い、UIからの入力値（文字列等）を想定して変換する
  // ただし、型定義上はすでに WhereValue なので、実際には UI 側の型と Model 側の型で
  // 差異がある場合に吸収する処理が必要。
  // 今回は `value` が `WhereValue` 型として渡ってくる前提だが、
  // もし `state.whereConditions` の `value` が `string | number` 等の単純な型なら
  // 以下のロジックが有効。
  // 現在の `QueryBuilderState` -> `WhereCondition` -> `value` は `WhereValue` 型。
  // もし UI 側が単純な値を保持しているなら、ここでラップする。

  // Note: app/types/query-model.ts の WhereValue は
  // | { type: 'literal'; value: string | number | boolean | null }
  // | { type: 'list'; values: Array<string | number> }
  // ...
  // となっている。
  
  // 一方、設計書のサンプルコードでは `value` 引数が `string | string[] | ...` となっていた。
  // 型定義 `WhereCondition` の `value` が `WhereValue` 型になっているため、
  // ここではそのまま返すのが基本だが、もし変換が必要な場合は適宜実装する。
  
  // ここでは安全のため、そのまま返す実装とする。
  // もし変換ロジックが必要な場合は、`WhereCondition` の定義を見直すか、
  // UI側の型定義を調整する必要がある。
  
  return value;
}

/**
 * 値をパース（数値判定）
 * ※ 現状未使用だが、将来的に文字列入力値をパースする場合に使用
 */
function parseValue(value: string): string | number {
  const num = Number(value)
  return isNaN(num) ? value : num
}
