import { describe, it, expect } from 'vitest'
import { convertToQueryModel, type UIQueryState } from '~/utils/query-converter'
import type {
  SelectedTable,
  SelectedColumn,
  SelectedExpression,
  WhereCondition,
  ConditionGroup,
  GroupByColumn,
  OrderByColumn,
} from '~/types/query'
import type { Column } from '~/types/database-structure'

describe('query-converter', () => {
  // Helper to create a basic UI state
  const createBaseState = (): UIQueryState => ({
    selectedTables: [{
      id: 'table1',
      schema: 'public',
      schemaName: 'public',
      name: 'users',
      tableName: 'users',
      alias: 'u',
      columns: [
        { name: 'id', dataType: 'integer', nullable: false } as Column,
        { name: 'name', dataType: 'varchar', nullable: true } as Column
      ]
    } as SelectedTable],
    selectedColumns: [],
    selectedExpressions: [] as SelectedExpression[],
    whereConditions: [],
    groupByColumns: [],
    orderByColumns: [],
    limit: null,
    offset: null
  })

  describe('convertToQueryModel', () => {
    it('基本的な変換ができる', () => {
      const state = createBaseState()
      state.selectedColumns = [{
        tableId: 'table1',
        tableAlias: 'u',
        columnName: 'id',
        columnAlias: null,
        dataType: 'integer'
      }]

      const result = convertToQueryModel(state, 'conn-123')

      expect(result.connectionId).toBe('conn-123')
      expect(result.from.table.schema).toBe('public')
      expect(result.from.table.name).toBe('users')
      expect(result.from.table.alias).toBe('u')
      expect(result.select.columns).toHaveLength(1)
      expect(result.select.distinct).toBe(false)
    })

    it('テーブルがない場合はエラーを投げる', () => {
      const state = createBaseState()
      state.selectedTables = []

      expect(() => convertToQueryModel(state, 'conn-123')).toThrow('No table selected')
    })

    it('複数カラムを変換できる', () => {
      const state = createBaseState()
      state.selectedColumns = [
        {
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        },
        {
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'name',
          columnAlias: 'user_name',
          dataType: 'varchar'
        }
      ]

      const result = convertToQueryModel(state, 'conn-123')

      expect(result.select.columns).toHaveLength(2)
      expect(result.select.columns[0]).toEqual({
        type: 'column',
        tableAlias: 'u',
        columnName: 'id',
        alias: null
      })
      expect(result.select.columns[1]).toEqual({
        type: 'column',
        tableAlias: 'u',
        columnName: 'name',
        alias: 'user_name'
      })
    })

    it('式を変換できる', () => {
      const state = createBaseState()
      state.selectedExpressions = [
        {
          id: 'exp1',
          expression: 'UPPER(u.name)',
          alias: 'upper_name',
        },
      ]

      const result = convertToQueryModel(state, 'conn-123')

      expect(result.select.columns).toHaveLength(1)
      expect(result.select.columns[0]).toEqual({
        type: 'expression',
        expression: 'UPPER(u.name)',
        alias: 'upper_name',
      })
    })

    describe('WHERE条件の変換', () => {
      it('単一のWHERE条件を変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'id', dataType: 'integer' },
          operator: '=',
          value: '1',
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause).not.toBeNull()
        expect(result.whereClause?.logic).toBe('AND')
        expect(result.whereClause?.conditions).toHaveLength(1)
        expect(result.whereClause?.conditions[0]).toMatchObject({
          type: 'condition',
          id: 'cond1',
          operator: '='
        })
      })

      it('無効な条件はフィルタされる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: null,
          operator: '=',
          value: '1',
          isValid: false
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause).toBeNull()
      })

      it('IS NULL演算子を変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'deleted_at', dataType: 'timestamp' },
          operator: 'IS NULL',
          value: '',
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause?.conditions[0]).toMatchObject({
          type: 'condition',
          value: { type: 'literal', value: null }
        })
      })

      it('IN演算子で配列を変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'status', dataType: 'varchar' },
          operator: 'IN',
          value: ['active', 'pending'],
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause?.conditions[0]).toMatchObject({
          type: 'condition',
          value: { type: 'list', values: ['active', 'pending'] }
        })
      })

      it('BETWEEN演算子で範囲を変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'age', dataType: 'integer' },
          operator: 'BETWEEN',
          value: { from: '18', to: '65' },
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause?.conditions[0]).toMatchObject({
          type: 'condition',
          value: { type: 'range', from: 18, to: 65 }
        })
      })

      it('条件グループを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'group1',
          type: 'group',
          logic: 'OR',
          conditions: [
            {
              id: 'cond1',
              type: 'condition',
              column: { tableAlias: 'u', columnName: 'role', dataType: 'varchar' },
              operator: '=',
              value: 'admin',
              isValid: true
            } as WhereCondition,
            {
              id: 'cond2',
              type: 'condition',
              column: { tableAlias: 'u', columnName: 'role', dataType: 'varchar' },
              operator: '=',
              value: 'moderator',
              isValid: true
            } as WhereCondition
          ]
        } as ConditionGroup]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.whereClause?.conditions[0]).toMatchObject({
          type: 'group',
          id: 'group1',
          logic: 'OR'
        })
        const group = result.whereClause?.conditions[0] as any
        expect(group.conditions).toHaveLength(2)
      })
    })

    describe('GROUP BY変換', () => {
      it('GROUP BYカラムを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.groupByColumns = [{
          id: 'gb1',
          column: {
            tableId: 'table1',
            tableAlias: 'u',
            columnName: 'department',
            columnAlias: null,
            dataType: 'varchar'
          }
        } as GroupByColumn]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.groupBy).not.toBeNull()
        expect(result.groupBy?.columns).toHaveLength(1)
        expect(result.groupBy?.columns[0]).toEqual({
          tableAlias: 'u',
          columnName: 'department'
        })
      })

      it('columnがnullの場合はフィルタされる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.groupByColumns = [{
          id: 'gb1',
          column: null
        } as GroupByColumn]

        const result = convertToQueryModel(state, 'conn-123')

        // groupByColumnsが存在するが全てフィルタされた場合、空配列のオブジェクトになる
        expect(result.groupBy?.columns).toHaveLength(0)
      })
    })

    describe('ORDER BY変換', () => {
      it('ORDER BYカラムを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.orderByColumns = [{
          id: 'ob1',
          column: {
            tableId: 'table1',
            tableAlias: 'u',
            columnName: 'name',
            columnAlias: null,
            dataType: 'varchar'
          },
          direction: 'ASC',
          nullsFirst: null
        } as OrderByColumn]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.orderBy).not.toBeNull()
        expect(result.orderBy?.items).toHaveLength(1)
        expect(result.orderBy?.items[0]).toEqual({
          tableAlias: 'u',
          columnName: 'name',
          direction: 'ASC',
          nulls: undefined
        })
      })

      it('複数のORDER BYを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.orderByColumns = [
          {
            id: 'ob1',
            column: {
              tableId: 'table1',
              tableAlias: 'u',
              columnName: 'last_name',
              columnAlias: null,
              dataType: 'varchar'
            },
            direction: 'ASC',
            nullsFirst: null
          } as OrderByColumn,
          {
            id: 'ob2',
            column: {
              tableId: 'table1',
              tableAlias: 'u',
              columnName: 'first_name',
              columnAlias: null,
              dataType: 'varchar'
            },
            direction: 'DESC',
            nullsFirst: null
          } as OrderByColumn
        ]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.orderBy?.items).toHaveLength(2)
        expect(result.orderBy?.items[0]?.direction).toBe('ASC')
        expect(result.orderBy?.items[1]?.direction).toBe('DESC')
      })
    })

    describe('LIMIT/OFFSET変換', () => {
      it('LIMITを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.limit = 100

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.limit).not.toBeNull()
        expect(result.limit?.limit).toBe(100)
        expect(result.limit?.offset).toBeUndefined()
      })

      it('LIMIT/OFFSETを変換できる', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.limit = 100
        state.offset = 50

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.limit?.limit).toBe(100)
        expect(result.limit?.offset).toBe(50)
      })

      it('両方nullの場合はnullを返す', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]

        const result = convertToQueryModel(state, 'conn-123')

        expect(result.limit).toBeNull()
      })
    })

    describe('値のパース', () => {
      it('数値文字列を数値に変換する', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'age', dataType: 'integer' },
          operator: '=',
          value: '25',
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        const condition = result.whereClause?.conditions[0] as any
        expect(condition.value.value).toBe(25)
        expect(typeof condition.value.value).toBe('number')
      })

      it('非数値文字列はそのまま保持する', () => {
        const state = createBaseState()
        state.selectedColumns = [{
          tableId: 'table1',
          tableAlias: 'u',
          columnName: 'id',
          columnAlias: null,
          dataType: 'integer'
        }]
        state.whereConditions = [{
          id: 'cond1',
          type: 'condition',
          column: { tableAlias: 'u', columnName: 'name', dataType: 'varchar' },
          operator: '=',
          value: 'John',
          isValid: true
        } as WhereCondition]

        const result = convertToQueryModel(state, 'conn-123')

        const condition = result.whereClause?.conditions[0] as any
        expect(condition.value.value).toBe('John')
        expect(typeof condition.value.value).toBe('string')
      })
    })
  })
})
