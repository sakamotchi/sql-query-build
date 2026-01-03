import { describe, it, expect } from 'vitest'
import type {
  ExpressionNode,
  ColumnReference,
  FunctionCall,
  LiteralValue,
  BinaryOperation,
  UnaryOperation,
  SubqueryExpression,
} from '~/types/expression-node'

describe('ExpressionNode型定義', () => {
  describe('基本型', () => {
    it('カラム参照を正しく定義できる', () => {
      const col: ColumnReference = {
        type: 'column',
        table: 'u',
        column: 'name',
      }

      expect(col.type).toBe('column')
      expect(col.column).toBe('name')
      expect(col.table).toBe('u')
    })

    it('テーブル指定なしのカラム参照を定義できる', () => {
      const col: ColumnReference = {
        type: 'column',
        column: 'id',
      }

      expect(col.type).toBe('column')
      expect(col.column).toBe('id')
      expect(col.table).toBeUndefined()
    })

    it('リテラル値（文字列）を正しく定義できる', () => {
      const lit: LiteralValue = {
        type: 'literal',
        valueType: 'string',
        value: 'Hello',
      }

      expect(lit.type).toBe('literal')
      expect(lit.valueType).toBe('string')
      expect(lit.value).toBe('Hello')
    })

    it('リテラル値（数値）を正しく定義できる', () => {
      const lit: LiteralValue = {
        type: 'literal',
        valueType: 'number',
        value: 123,
      }

      expect(lit.type).toBe('literal')
      expect(lit.valueType).toBe('number')
      expect(lit.value).toBe(123)
    })

    it('リテラル値（真偽値）を正しく定義できる', () => {
      const lit: LiteralValue = {
        type: 'literal',
        valueType: 'boolean',
        value: true,
      }

      expect(lit.type).toBe('literal')
      expect(lit.valueType).toBe('boolean')
      expect(lit.value).toBe(true)
    })

    it('リテラル値（null）を正しく定義できる', () => {
      const lit: LiteralValue = {
        type: 'literal',
        valueType: 'null',
        value: null,
      }

      expect(lit.type).toBe('literal')
      expect(lit.valueType).toBe('null')
      expect(lit.value).toBeNull()
    })
  })

  describe('関数呼び出し', () => {
    it('関数呼び出しを正しく定義できる', () => {
      const func: FunctionCall = {
        type: 'function',
        name: 'UPPER',
        category: 'string',
        arguments: [
          {
            type: 'column',
            table: 'u',
            column: 'name',
          },
        ],
      }

      expect(func.name).toBe('UPPER')
      expect(func.category).toBe('string')
      expect(func.arguments.length).toBe(1)
    })

    it('ネストした関数を正しく定義できる', () => {
      const nested: FunctionCall = {
        type: 'function',
        name: 'SUBSTRING',
        category: 'string',
        arguments: [
          {
            type: 'function',
            name: 'UPPER',
            category: 'string',
            arguments: [
              {
                type: 'column',
                table: 'u',
                column: 'name',
              },
            ],
          },
          { type: 'literal', valueType: 'number', value: 1 },
          { type: 'literal', valueType: 'number', value: 3 },
        ],
      }

      expect(nested.name).toBe('SUBSTRING')
      expect((nested.arguments[0] as ExpressionNode).type).toBe('function')
      expect(nested.arguments.length).toBe(3)
    })

    it('複数引数の関数を定義できる', () => {
      const func: FunctionCall = {
        type: 'function',
        name: 'CONCAT',
        category: 'string',
        arguments: [
          { type: 'column', column: 'first_name' },
          { type: 'literal', valueType: 'string', value: ' ' },
          { type: 'column', column: 'last_name' },
        ],
      }

      expect(func.arguments.length).toBe(3)
    })

    it('引数なしの関数を定義できる', () => {
      const func: FunctionCall = {
        type: 'function',
        name: 'NOW',
        category: 'date',
        arguments: [],
      }

      expect(func.arguments.length).toBe(0)
    })
  })

  describe('二項演算', () => {
    it('算術演算を定義できる', () => {
      const bin: BinaryOperation = {
        type: 'binary',
        operator: '*',
        left: { type: 'column', column: 'price' },
        right: { type: 'column', column: 'quantity' },
      }

      expect(bin.operator).toBe('*')
      expect(bin.left.type).toBe('column')
      expect(bin.right.type).toBe('column')
    })

    it('比較演算を定義できる', () => {
      const bin: BinaryOperation = {
        type: 'binary',
        operator: '>',
        left: { type: 'column', column: 'age' },
        right: { type: 'literal', valueType: 'number', value: 18 },
      }

      expect(bin.operator).toBe('>')
    })

    it('論理演算を定義できる', () => {
      const bin: BinaryOperation = {
        type: 'binary',
        operator: 'AND',
        left: { type: 'column', column: 'active' },
        right: { type: 'column', column: 'verified' },
      }

      expect(bin.operator).toBe('AND')
    })
  })

  describe('単項演算', () => {
    it('NOT演算を定義できる', () => {
      const un: UnaryOperation = {
        type: 'unary',
        operator: 'NOT',
        operand: { type: 'column', column: 'active' },
      }

      expect(un.operator).toBe('NOT')
      expect(un.operand.type).toBe('column')
    })

    it('負号演算を定義できる', () => {
      const un: UnaryOperation = {
        type: 'unary',
        operator: '-',
        operand: { type: 'column', column: 'price' },
      }

      expect(un.operator).toBe('-')
    })
  })

  describe('サブクエリ', () => {
    it('サブクエリ式を定義できる', () => {
      const subquery: SubqueryExpression = {
        type: 'subquery',
        query: {
          select: {
            type: 'function',
            name: 'COUNT',
            category: 'aggregate',
            arguments: [{ type: 'column', column: '*' }],
          },
          from: 'orders',
        },
      }

      expect(subquery.type).toBe('subquery')
      expect(subquery.query.from).toBe('orders')
      expect((subquery.query.select as FunctionCall).name).toBe('COUNT')
    })

    it('WHERE句付きサブクエリを定義できる', () => {
      const subquery: SubqueryExpression = {
        type: 'subquery',
        query: {
          select: { type: 'column', column: 'total' },
          from: 'orders',
          where: {
            logic: 'AND',
            conditions: [],
          },
        },
      }

      expect(subquery.query.where).toBeDefined()
      expect(subquery.query.where?.logic).toBe('AND')
    })
  })

  describe('複雑なネスト', () => {
    it('深くネストした式を定義できる', () => {
      const complex: FunctionCall = {
        type: 'function',
        name: 'UPPER',
        category: 'string',
        arguments: [
          {
            type: 'function',
            name: 'SUBSTRING',
            category: 'string',
            arguments: [
              {
                type: 'function',
                name: 'LOWER',
                category: 'string',
                arguments: [{ type: 'column', table: 'users', column: 'name' }],
              },
              { type: 'literal', valueType: 'number', value: 1 },
              { type: 'literal', valueType: 'number', value: 5 },
            ],
          },
        ],
      }

      const firstArg = complex.arguments[0] as FunctionCall
      expect(firstArg.type).toBe('function')
      expect(firstArg.name).toBe('SUBSTRING')

      const nestedArg = firstArg.arguments[0] as FunctionCall
      expect(nestedArg.type).toBe('function')
      expect(nestedArg.name).toBe('LOWER')
    })
  })
})
