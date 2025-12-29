import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from '~/stores/query-builder'
import type { SelectedTable, SelectedColumn, WhereCondition, ConditionGroup, OrderByColumn } from '~/types/query'
import type { Column } from '~/types/database-structure'

// Mock dependencies
vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

vi.mock('~/api/query', () => ({
  queryApi: {
    generateSqlFormatted: vi.fn().mockResolvedValue('SELECT * FROM users')
  }
}))

vi.mock('~/stores/connection', () => ({
  useConnectionStore: () => ({
    activeConnection: { id: 'test-connection-id' }
  })
}))

vi.mock('~/stores/window', () => ({
  useWindowStore: () => ({
    currentConnectionId: 'test-connection-id'
  })
}))

describe('QueryBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルトの初期状態を持つ', () => {
      const store = useQueryBuilderStore()

      expect(store.selectedTables).toEqual([])
      expect(store.selectedColumns).toEqual([])
      expect(store.draggingTable).toBeNull()
      expect(store.whereConditions).toEqual([])
      expect(store.groupByColumns).toEqual([])
      expect(store.orderByColumns).toEqual([])
      expect(store.query).toBeNull()
      expect(store.generatedSql).toBe('')
      expect(store.isExecuting).toBe(false)
      expect(store.error).toBeNull()
      expect(store.limit).toBeNull()
      expect(store.offset).toBeNull()
      expect(store.smartQuote).toBe(true)
    })

    it('canExecuteQuery は初期状態で false', () => {
      const store = useQueryBuilderStore()
      expect(store.canExecuteQuery).toBe(false)
    })
  })

  describe('テーブル操作', () => {
    const createMockTable = (id: string, name: string): SelectedTable => ({
      id,
      schemaName: 'public',
      tableName: name,
      alias: name.charAt(0),
      columns: [
        { name: 'id', dataType: 'integer', nullable: false } as Column,
        { name: 'name', dataType: 'varchar', nullable: true } as Column
      ]
    })

    it('addTable でテーブルを追加できる', () => {
      const store = useQueryBuilderStore()
      const table = createMockTable('table1', 'users')

      store.addTable(table)

      expect(store.selectedTables).toHaveLength(1)
      expect(store.selectedTables[0]).toEqual(table)
    })

    it('addTable で重複するテーブルは追加されない', () => {
      const store = useQueryBuilderStore()
      const table = createMockTable('table1', 'users')

      store.addTable(table)
      store.addTable(table)

      expect(store.selectedTables).toHaveLength(1)
    })

    it('removeTable でテーブルを削除できる', () => {
      const store = useQueryBuilderStore()
      const table = createMockTable('table1', 'users')

      store.addTable(table)
      expect(store.selectedTables).toHaveLength(1)

      store.removeTable('table1')
      expect(store.selectedTables).toHaveLength(0)
    })

    it('updateTableAlias でテーブルエイリアスを更新できる', () => {
      const store = useQueryBuilderStore()
      const table = createMockTable('table1', 'users')

      store.addTable(table)
      store.updateTableAlias('table1', 'usr')

      expect(store.selectedTables[0]?.alias).toBe('usr')
    })

    it('setDraggingTable でドラッグ中のテーブルを設定できる', () => {
      const store = useQueryBuilderStore()
      const table = { name: 'users', schemaName: 'public' } as any

      store.setDraggingTable(table)
      expect(store.draggingTable).toEqual(table)

      store.setDraggingTable(null)
      expect(store.draggingTable).toBeNull()
    })
  })

  describe('カラム操作', () => {
    const createMockColumn = (tableId: string, columnName: string): SelectedColumn => ({
      tableId,
      tableAlias: 'u',
      columnName,
      columnAlias: null,
      dataType: 'varchar'
    })

    it('selectColumn でカラムを選択できる', () => {
      const store = useQueryBuilderStore()
      const column = createMockColumn('table1', 'id')

      store.selectColumn(column)

      expect(store.selectedColumns).toHaveLength(1)
      expect(store.selectedColumns[0]).toEqual(column)
    })

    it('selectColumn で重複するカラムは追加されない', () => {
      const store = useQueryBuilderStore()
      const column = createMockColumn('table1', 'id')

      store.selectColumn(column)
      store.selectColumn(column)

      expect(store.selectedColumns).toHaveLength(1)
    })

    it('deselectColumn でカラム選択を解除できる', () => {
      const store = useQueryBuilderStore()
      const column = createMockColumn('table1', 'id')

      store.selectColumn(column)
      expect(store.selectedColumns).toHaveLength(1)

      store.deselectColumn('table1', 'id')
      expect(store.selectedColumns).toHaveLength(0)
    })

    it('updateColumnAlias でカラムエイリアスを更新できる', () => {
      const store = useQueryBuilderStore()
      const column = createMockColumn('table1', 'id')

      store.selectColumn(column)
      store.updateColumnAlias('table1', 'id', 'user_id')

      expect(store.selectedColumns[0]?.columnAlias).toBe('user_id')
    })

    it('reorderColumns でカラムの順序を変更できる', () => {
      const store = useQueryBuilderStore()
      store.selectColumn(createMockColumn('table1', 'id'))
      store.selectColumn(createMockColumn('table1', 'name'))
      store.selectColumn(createMockColumn('table1', 'email'))

      store.reorderColumns(0, 2)

      expect(store.selectedColumns[0]?.columnName).toBe('name')
      expect(store.selectedColumns[1]?.columnName).toBe('email')
      expect(store.selectedColumns[2]?.columnName).toBe('id')
    })

    it('clearSelectedColumns で全カラム選択を解除できる', () => {
      const store = useQueryBuilderStore()
      store.selectColumn(createMockColumn('table1', 'id'))
      store.selectColumn(createMockColumn('table1', 'name'))

      store.clearSelectedColumns()

      expect(store.selectedColumns).toHaveLength(0)
    })

    it('canExecuteQuery はカラム選択時に true になる', () => {
      const store = useQueryBuilderStore()

      expect(store.canExecuteQuery).toBe(false)

      store.selectColumn(createMockColumn('table1', 'id'))

      expect(store.canExecuteQuery).toBe(true)
    })
  })

  describe('WHERE条件操作', () => {
    const createMockCondition = (id: string): WhereCondition => ({
      id,
      type: 'condition',
      column: { tableAlias: 'u', columnName: 'id', dataType: 'integer' },
      operator: '=',
      value: '1',
      isValid: true
    })

    const createMockGroup = (id: string): ConditionGroup => ({
      id,
      type: 'group',
      logic: 'AND',
      conditions: []
    })

    it('addWhereCondition で条件を追加できる', () => {
      const store = useQueryBuilderStore()
      const condition = createMockCondition('cond1')

      store.addWhereCondition(condition)

      expect(store.whereConditions).toHaveLength(1)
      expect(store.whereConditions[0]).toEqual(condition)
    })

    it('addWhereConditionGroup でグループを追加できる', () => {
      const store = useQueryBuilderStore()
      const group = createMockGroup('group1')

      store.addWhereConditionGroup(group)

      expect(store.whereConditions).toHaveLength(1)
      expect((store.whereConditions[0] as ConditionGroup).type).toBe('group')
    })

    it('removeWhereCondition で条件を削除できる', () => {
      const store = useQueryBuilderStore()
      const condition = createMockCondition('cond1')

      store.addWhereCondition(condition)
      expect(store.whereConditions).toHaveLength(1)

      store.removeWhereCondition('cond1')
      expect(store.whereConditions).toHaveLength(0)
    })

    it('updateWhereCondition で条件を更新できる', () => {
      const store = useQueryBuilderStore()
      const condition = createMockCondition('cond1')

      store.addWhereCondition(condition)
      store.updateWhereCondition('cond1', { operator: '>=' })

      expect((store.whereConditions[0] as WhereCondition).operator).toBe('>=')
    })

    it('clearWhereConditions で全条件をクリアできる', () => {
      const store = useQueryBuilderStore()
      store.addWhereCondition(createMockCondition('cond1'))
      store.addWhereCondition(createMockCondition('cond2'))

      store.clearWhereConditions()

      expect(store.whereConditions).toHaveLength(0)
    })

    it('findCondition で条件を検索できる', () => {
      const store = useQueryBuilderStore()
      const condition = createMockCondition('cond1')

      store.addWhereCondition(condition)

      const found = store.findCondition('cond1')
      expect(found).toEqual(condition)
    })

    it('findCondition でネストした条件を検索できる', () => {
      const store = useQueryBuilderStore()
      const nestedCondition = createMockCondition('nested-cond')
      const group: ConditionGroup = {
        id: 'group1',
        type: 'group',
        logic: 'AND',
        conditions: [nestedCondition]
      }

      store.addWhereConditionGroup(group)

      const found = store.findCondition('nested-cond')
      expect(found).toEqual(nestedCondition)
    })
  })

  describe('ORDER BY操作', () => {
    const createMockOrderBy = (id: string, columnName: string): OrderByColumn => ({
      id,
      tableAlias: 'u',
      columnName,
      direction: 'ASC',
      nullsFirst: null
    })

    it('addOrderByColumn でソートカラムを追加できる', () => {
      const store = useQueryBuilderStore()
      const orderBy = createMockOrderBy('order1', 'name')

      store.addOrderByColumn(orderBy)

      expect(store.orderByColumns).toHaveLength(1)
      expect(store.orderByColumns[0]).toEqual(orderBy)
    })

    it('removeOrderByColumn でソートカラムを削除できる', () => {
      const store = useQueryBuilderStore()
      const orderBy = createMockOrderBy('order1', 'name')

      store.addOrderByColumn(orderBy)
      expect(store.orderByColumns).toHaveLength(1)

      store.removeOrderByColumn('order1')
      expect(store.orderByColumns).toHaveLength(0)
    })

    it('updateOrderByColumns でソートカラム一覧を更新できる', () => {
      const store = useQueryBuilderStore()
      const newOrderBy = [
        createMockOrderBy('order1', 'name'),
        createMockOrderBy('order2', 'email')
      ]

      store.updateOrderByColumns(newOrderBy)

      expect(store.orderByColumns).toHaveLength(2)
      expect(store.orderByColumns).toEqual(newOrderBy)
    })
  })

  describe('LIMIT/OFFSET操作', () => {
    it('updateLimit でLIMITを更新できる', () => {
      const store = useQueryBuilderStore()

      store.updateLimit(100)
      expect(store.limit).toBe(100)

      store.updateLimit(null)
      expect(store.limit).toBeNull()
    })

    it('updateOffset でOFFSETを更新できる', () => {
      const store = useQueryBuilderStore()

      store.updateOffset(50)
      expect(store.offset).toBe(50)

      store.updateOffset(null)
      expect(store.offset).toBeNull()
    })
  })

  describe('スマートクォート設定', () => {
    it('setSmartQuote でスマートクォートを設定できる', () => {
      const store = useQueryBuilderStore()

      expect(store.smartQuote).toBe(true)

      store.setSmartQuote(false)
      expect(store.smartQuote).toBe(false)

      store.setSmartQuote(true)
      expect(store.smartQuote).toBe(true)
    })
  })

  describe('リセット操作', () => {
    it('resetQuery で状態をリセットできる', () => {
      const store = useQueryBuilderStore()

      // 状態を設定
      store.addTable({
        id: 'table1',
        schemaName: 'public',
        tableName: 'users',
        alias: 'u',
        columns: []
      })
      store.selectColumn({
        tableId: 'table1',
        tableAlias: 'u',
        columnName: 'id',
        columnAlias: null,
        dataType: 'integer'
      })
      store.updateLimit(100)
      store.error = 'test error'

      // リセット
      store.resetQuery()

      expect(store.selectedTables).toHaveLength(0)
      expect(store.selectedColumns).toHaveLength(0)
      expect(store.whereConditions).toHaveLength(0)
      expect(store.query).toBeNull()
      expect(store.generatedSql).toBe('')
      expect(store.error).toBeNull()
      expect(store.limit).toBeNull()
      expect(store.offset).toBeNull()
    })
  })

  describe('generateWhereClause', () => {
    it('空の条件配列では空文字を返す', () => {
      const store = useQueryBuilderStore()

      const result = store.generateWhereClause([])

      expect(result).toBe('')
    })

    it('単一条件でWHERE句を生成できる', () => {
      const store = useQueryBuilderStore()
      const conditions: WhereCondition[] = [{
        id: 'cond1',
        type: 'condition',
        column: { tableAlias: 'u', columnName: 'id', dataType: 'integer' },
        operator: '=',
        value: '1',
        isValid: true
      }]

      const result = store.generateWhereClause(conditions)

      expect(result).toContain('u.id')
      expect(result).toContain('=')
    })

    it('IS NULL演算子を正しく処理する', () => {
      const store = useQueryBuilderStore()
      const conditions: WhereCondition[] = [{
        id: 'cond1',
        type: 'condition',
        column: { tableAlias: 'u', columnName: 'deleted_at', dataType: 'timestamp' },
        operator: 'IS NULL',
        value: null,
        isValid: true
      }]

      const result = store.generateWhereClause(conditions)

      expect(result).toBe('u.deleted_at IS NULL')
    })
  })

  describe('formatValue', () => {
    it('通常の値をシングルクォートで囲む', () => {
      const store = useQueryBuilderStore()

      const result = store.formatValue('test', '=')

      expect(result).toBe("'test'")
    })

    it('IN演算子で配列をフォーマットする', () => {
      const store = useQueryBuilderStore()

      const result = store.formatValue(['a', 'b', 'c'], 'IN')

      expect(result).toBe("('a', 'b', 'c')")
    })

    it('BETWEEN演算子で範囲をフォーマットする', () => {
      const store = useQueryBuilderStore()

      const result = store.formatValue({ from: '1', to: '10' }, 'BETWEEN')

      expect(result).toBe("'1' AND '10'")
    })
  })
})
