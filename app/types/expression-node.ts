import type { WhereClause } from './query-model'

/**
 * 式ノード（再帰的構造）
 *
 * SELECT句で使用できる式を表現する型
 */
export type ExpressionNode =
  | ColumnReference
  | LiteralValue
  | FunctionCall
  | SubqueryExpression
  | BinaryOperation
  | UnaryOperation

/**
 * カラム参照
 * 例: u.name, orders.total
 */
export interface ColumnReference {
  type: 'column'
  table?: string
  column: string
}

/**
 * リテラル値
 * 例: 'Hello', 123, true, null
 */
export interface LiteralValue {
  type: 'literal'
  valueType: 'string' | 'number' | 'boolean' | 'null'
  value: string | number | boolean | null
}

/**
 * 関数呼び出し
 * 例: UPPER(name), CONCAT(first_name, ' ', last_name)
 */
export interface FunctionCall {
  type: 'function'
  name: string
  category: 'string' | 'date' | 'numeric' | 'conditional' | 'aggregate'
  arguments: ExpressionNode[]
}

/**
 * サブクエリ式
 * 例: (SELECT COUNT(*) FROM orders WHERE user_id = u.id)
 */
export interface SubqueryExpression {
  type: 'subquery'
  query: SubqueryModel
}

/**
 * サブクエリモデル（簡易版）
 */
export interface SubqueryModel {
  select: ExpressionNode
  from: string
  where?: WhereClause
  alias?: string
}

/**
 * 二項演算
 * 例: price * quantity, age > 18
 */
export interface BinaryOperation {
  type: 'binary'
  operator:
    | '+'
    | '-'
    | '*'
    | '/'
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'AND'
    | 'OR'
  left: ExpressionNode
  right: ExpressionNode
}

/**
 * 単項演算
 * 例: NOT active, -price
 */
export interface UnaryOperation {
  type: 'unary'
  operator: 'NOT' | '-'
  operand: ExpressionNode
}
