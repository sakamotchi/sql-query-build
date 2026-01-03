import type { ExpressionNode, FunctionCall, LiteralValue } from '@/types/expression-node'

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
      return '(SUBQUERY)'
    default:
      return ''
  }
}
