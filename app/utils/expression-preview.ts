import type { ExpressionNode, FunctionCall, LiteralValue } from '@/types/expression-node'
import type { WhereClause, WhereConditionItem, WhereValue } from '@/types/query-model'

function formatLiteral(value: LiteralValue): string {
  switch (value.valueType) {
    case 'string':
      return `'${String(value.value).replace(/'/g, "''")}'`
    case 'number':
      return String(value.value)
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE'
    case 'null':
      return 'NULL'
    default:
      return String(value.value)
  }
}

function formatFunction(node: FunctionCall): string {
  const args = node.arguments.map(generatePreviewSql)
  if (node.name === '||') {
    return args.join(' || ')
  }
  return `${node.name}(${args.join(', ')})`
}

function formatWhereValue(value: WhereValue): string {
  switch (value.type) {
    case 'literal':
      return formatLiteral({
        type: 'literal',
        valueType:
          value.value === null
            ? 'null'
            : typeof value.value === 'number'
            ? 'number'
            : typeof value.value === 'boolean'
            ? 'boolean'
            : 'string',
        value: value.value,
      })
    case 'list':
      return `(${value.values.map((item) => formatLiteral({
        type: 'literal',
        valueType:
          item === null
            ? 'null'
            : typeof item === 'number'
            ? 'number'
            : typeof item === 'boolean'
            ? 'boolean'
            : 'string',
        value: item,
      })).join(', ')})`
    case 'range':
      return `${formatLiteral({
        type: 'literal',
        valueType:
          value.from === null
            ? 'null'
            : typeof value.from === 'number'
            ? 'number'
            : typeof value.from === 'boolean'
            ? 'boolean'
            : 'string',
        value: value.from,
      })} AND ${formatLiteral({
        type: 'literal',
        valueType:
          value.to === null
            ? 'null'
            : typeof value.to === 'number'
            ? 'number'
            : typeof value.to === 'boolean'
            ? 'boolean'
            : 'string',
        value: value.to,
      })}`
    case 'column':
      return `${value.tableAlias}.${value.columnName}`
    case 'subquery':
      return '(SUBQUERY)'
    default:
      return ''
  }
}

function formatWhereConditionItem(item: WhereConditionItem): string {
  if (item.type === 'group') {
    const inner = item.conditions.map(formatWhereConditionItem).filter(Boolean)
    return inner.length > 0 ? `(${inner.join(` ${item.logic} `)})` : ''
  }

  const left = `${item.column.tableAlias}.${item.column.columnName}`
  const right = formatWhereValue(item.value)
  return `${left} ${item.operator} ${right}`
}

function formatWhereClause(whereClause: WhereClause): string {
  const parts = whereClause.conditions.map(formatWhereConditionItem).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.join(` ${whereClause.logic} `)
}

function formatSubquery(query: { select: ExpressionNode; from: string; where?: WhereClause; alias?: string }): string {
  const selectSql = generatePreviewSql(query.select)
  let sql = `SELECT ${selectSql} FROM ${query.from}`
  if (query.alias) {
    sql += ` ${query.alias}`
  }
  if (query.where) {
    const whereSql = formatWhereClause(query.where)
    if (whereSql) {
      sql += ` WHERE ${whereSql}`
    }
  }
  return `(${sql})`
}

export function generatePreviewSql(node: ExpressionNode): string {
  switch (node.type) {
    case 'column':
      return node.table ? `${node.table}.${node.column}` : node.column
    case 'literal':
      return formatLiteral(node)
    case 'function':
      return formatFunction(node)
    case 'binary':
      return `(${generatePreviewSql(node.left)} ${node.operator} ${generatePreviewSql(node.right)})`
    case 'unary':
      return `${node.operator}(${generatePreviewSql(node.operand)})`
    case 'subquery':
      return formatSubquery(node.query)
    default:
      return ''
  }
}
