import { defineStore } from 'pinia'
import type { QueryModel, QueryInfo, SelectedTable, SelectedColumn, WhereCondition, ConditionGroup, GroupByColumn, OrderByColumn } from '@/types/query'
import type { Table } from '@/types/database-structure'

interface QueryBuilderState {
  /** 選択されたテーブル一覧（テーブルカード用） */
  selectedTables: SelectedTable[]
  /** 選択されたカラム一覧（カラム選択UI用） */
  selectedColumns: SelectedColumn[]
  /** ドラッグ中のテーブル（ドラッグ&ドロップ用） */
  draggingTable: Table | null
  /** WHERE条件一覧 */
  whereConditions: Array<WhereCondition | ConditionGroup>
  /** GROUP BYカラム一覧 */
  groupByColumns: GroupByColumn[]
  /** ORDER BYカラム一覧 */
  orderByColumns: OrderByColumn[]
  /** 現在のクエリモデル */
  query: QueryModel | null
  /** 生成されたSQL */
  generatedSql: string
  /** クエリ情報 */
  queryInfo: QueryInfo
  /** 実行中フラグ */
  isExecuting: boolean
  /** エラーメッセージ */
  error: string | null
}

export const useQueryBuilderStore = defineStore('query-builder', {
  state: (): QueryBuilderState => ({
    selectedTables: [],
    selectedColumns: [],
    draggingTable: null,
    whereConditions: [],
    groupByColumns: [],
    orderByColumns: [],
    query: null,
    generatedSql: '',
    queryInfo: {
      rowCount: 0,
      executionTime: null,
      lastExecutedAt: null,
    },
    isExecuting: false,
    error: null,
  }),

  getters: {
    /**
     * クエリ実行可能かどうか
     */
    canExecuteQuery(state): boolean {
      return state.selectedColumns.length > 0
    },
  },

  actions: {
    /**
     * ドラッグ開始
     */
    setDraggingTable(table: Table | null) {
      this.draggingTable = table
    },

    /**
     * テーブルを追加
     */
    addTable(table: SelectedTable) {
      // 重複チェック
      if (this.selectedTables.some((t) => t.id === table.id)) {
        return
      }
      this.selectedTables.push(table)
      this.regenerateSql()
    },

    /**
     * テーブルを削除
     */
    removeTable(tableId: string) {
      const index = this.selectedTables.findIndex((t) => t.id === tableId)
      if (index !== -1) {
        this.selectedTables.splice(index, 1)
        // 関連するJOINやカラム選択も削除
        this.removeRelatedJoins(tableId)
        this.removeRelatedColumns(tableId)
        this.regenerateSql()
      }
    },

    /**
     * テーブルエイリアスを更新
     */
    updateTableAlias(tableId: string, alias: string) {
      const table = this.selectedTables.find((t) => t.id === tableId)
      if (table) {
        // カラム選択のテーブルエイリアスも更新
        this.selectedColumns.forEach((col) => {
          if (col.tableId === tableId) {
            col.tableAlias = alias
          }
        })
        table.alias = alias
        this.regenerateSql()
      }
    },

    /**
     * カラムを選択
     */
    selectColumn(column: SelectedColumn) {
      // 重複チェック
      const exists = this.selectedColumns.some(
        (c) => c.tableId === column.tableId && c.columnName === column.columnName
      )
      if (!exists) {
        this.selectedColumns.push(column)
        this.regenerateSql()
      }
    },

    /**
     * カラム選択を解除
     */
    deselectColumn(tableId: string, columnName: string) {
      const index = this.selectedColumns.findIndex(
        (c) => c.tableId === tableId && c.columnName === columnName
      )
      if (index !== -1) {
        this.selectedColumns.splice(index, 1)
        this.regenerateSql()
      }
    },

    /**
     * カラムエイリアスを更新
     */
    updateColumnAlias(tableId: string, columnName: string, alias: string | null) {
      const column = this.selectedColumns.find(
        (c) => c.tableId === tableId && c.columnName === columnName
      )
      if (column) {
        column.columnAlias = alias
        this.regenerateSql()
      }
    },

    /**
     * カラムの順序を変更
     */
    reorderColumns(fromIndex: number, toIndex: number) {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= this.selectedColumns.length ||
        toIndex >= this.selectedColumns.length
      ) {
        return
      }
      const movedColumns = this.selectedColumns.splice(fromIndex, 1)
      const col = movedColumns[0]
      if (col) {
        this.selectedColumns.splice(toIndex, 0, col)
      }
      this.regenerateSql()
    },

    /**
     * テーブルの全カラムを選択
     */
    selectAllColumnsFromTable(table: SelectedTable) {
      table.columns.forEach((column) => {
        const exists = this.selectedColumns.some(
          (c) => c.tableId === table.id && c.columnName === column.name
        )
        if (!exists) {
          this.selectedColumns.push({
            tableId: table.id,
            tableAlias: table.alias,
            columnName: column.name,
            columnAlias: null,
            dataType: column.dataType,
          })
        }
      })
      this.regenerateSql()
    },

    /**
     * テーブルの全カラム選択を解除
     */
    deselectAllColumnsFromTable(tableId: string) {
      this.selectedColumns = this.selectedColumns.filter((c) => c.tableId !== tableId)
      this.regenerateSql()
    },

    /**
     * 全カラム選択を解除
     */
    clearSelectedColumns() {
      this.selectedColumns = []
      this.regenerateSql()
    },

    /**
     * WHERE条件を追加
     */
    addWhereCondition(condition: WhereCondition) {
      this.whereConditions.push(condition)
      this.regenerateSql()
    },

    /**
     * 条件グループを追加
     */
    addWhereConditionGroup(group: ConditionGroup) {
      this.whereConditions.push(group)
      this.regenerateSql()
    },

    /**
     * WHERE条件を削除
     */
    removeWhereCondition(id: string) {
      const index = this.whereConditions.findIndex((c) => c.id === id)
      if (index !== -1) {
        this.whereConditions.splice(index, 1)
        this.regenerateSql()
      }
    },

    /**
     * WHERE条件を更新
     */
    updateWhereCondition(id: string, updates: Partial<WhereCondition>) {
      const condition = this.findCondition(id)
      if (condition && condition.type === 'condition') {
        Object.assign(condition, updates)
        this.regenerateSql()
      }
    },

    /**
     * グループ内に条件追加
     */
    addConditionToGroup(groupId: string, condition: WhereCondition) {
      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        group.conditions.push(condition)
        this.regenerateSql()
      }
    },

    /**
     * グループから条件削除
     */
    removeConditionFromGroup(groupId: string, conditionId: string) {
      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        const index = group.conditions.findIndex((c) => c.id === conditionId)
        if (index !== -1) {
          group.conditions.splice(index, 1)
          this.regenerateSql()
        }
      }
    },

    /**
     * グループのロジック変更
     */
    updateGroupLogic(groupId: string, logic: 'AND' | 'OR') {
      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        group.logic = logic
        this.regenerateSql()
      }
    },

    /**
     * ORDER BYカラムを追加
     */
    addOrderByColumn(column: OrderByColumn) {
      this.orderByColumns.push(column)
      this.regenerateSql()
    },

    /**
     * ORDER BYカラムを削除
     */
    removeOrderByColumn(id: string) {
      const index = this.orderByColumns.findIndex((c) => c.id === id)
      if (index !== -1) {
        this.orderByColumns.splice(index, 1)
        this.regenerateSql()
      }
    },

    /**
     * ORDER BYカラム一覧を更新（並べ替え用）
     */
    updateOrderByColumns(columns: OrderByColumn[]) {
      this.orderByColumns = columns
      this.regenerateSql()
    },

    /**
     * 条件を検索（再帰）
     */
    findCondition(id: string): WhereCondition | ConditionGroup | null {
      const search = (
        items: Array<WhereCondition | ConditionGroup>
      ): WhereCondition | ConditionGroup | null => {
        for (const item of items) {
          if (item.id === id) return item
          if (item.type === 'group') {
            const found = search(item.conditions)
            if (found) return found
          }
        }
        return null
      }
      return search(this.whereConditions)
    },

    /**
     * 全条件をクリア
     */
    clearWhereConditions() {
      this.whereConditions = []
      this.regenerateSql()
    },

    /**
     * 関連するJOINを削除
     */
    removeRelatedJoins(_tableId: string) {
      // TODO: JOIN機能実装時に詳細化
    },

    /**
     * 関連するカラム選択を削除
     */
    removeRelatedColumns(tableId: string) {
      this.deselectAllColumnsFromTable(tableId)
    },

    /**
     * SQLを再生成
     */
    regenerateSql() {
      // TODO: SQL生成エンジン実装時に詳細化
      // 当面は簡易的なSQL生成を行う
      if (this.selectedColumns.length === 0) {
        this.generatedSql = ''
        return
      }

      const selectClause = this.selectedColumns
        .map((col) => {
          const colName = `${col.tableAlias}.${col.columnName}`
          return col.columnAlias ? `${colName} AS ${col.columnAlias}` : colName
        })
        .join(',\n  ')

      const fromClause = this.selectedTables
        .map((table) => `${table.name} AS ${table.alias}`)
        .join(',\n  ') // 本来はJOIN句を使うべきだが、簡易的にカンマ区切り

      let sql = `SELECT\n  ${selectClause}\nFROM\n  ${fromClause}`

      // WHERE句の生成
      if (this.whereConditions.length > 0) {
        const whereClause = this.generateWhereClause(this.whereConditions)
        if (whereClause) {
          sql += `\nWHERE\n  ${whereClause}`
        }
      }

      // GROUP BY句の生成
      const validGroupBy = this.groupByColumns.filter(g => g.column)
      if (validGroupBy.length > 0) {
        const groupByClause = validGroupBy
          .map(g => `${g.column!.tableAlias}.${g.column!.columnName}`)
          .join(', ')
        sql += `\nGROUP BY ${groupByClause}`
      }

      // ORDER BY句の生成
      const validOrderBy = this.orderByColumns.filter(o => o.column)
      if (validOrderBy.length > 0) {
        const orderByClause = validOrderBy
          .map(o => `${o.column!.tableAlias}.${o.column!.columnName} ${o.direction}`)
          .join(', ')
        sql += `\nORDER BY ${orderByClause}`
      }

      this.generatedSql = sql
    },

    /**
     * WHERE句の生成（再帰）
     */
    generateWhereClause(conditions: Array<WhereCondition | ConditionGroup>, logic: 'AND' | 'OR' = 'AND'): string {
      if (conditions.length === 0) return ''

      const parts = conditions
        .map((item) => {
          if (item.type === 'group') {
            const groupClause = this.generateWhereClause(item.conditions, item.logic)
            return groupClause ? `(${groupClause})` : ''
          } else {
            if (!item.isValid || !item.column) return ''
            const colName = `${item.column.tableAlias}.${item.column.columnName}`
            const val = this.formatValue(item.value, item.operator)
            if (item.operator === 'IS NULL' || item.operator === 'IS NOT NULL') {
              return `${colName} ${item.operator}`
            }
            return `${colName} ${item.operator} ${val}`
          }
        })
        .filter((part) => part !== '')

      return parts.join(` ${logic} `)
    },

    /**
     * 値のフォーマット
     */
    formatValue(value: any, operator: string): string {
      if (operator === 'IN' || operator === 'NOT IN') {
        const vals = Array.isArray(value) ? value : []
        return `(${vals.map((v) => `'${v}'`).join(', ')})`
      }
      if (operator === 'BETWEEN') {
        const from = value?.from || ''
        const to = value?.to || ''
        return `'${from}' AND '${to}'`
      }
      return `'${value}'`
    },

    /**
     * クエリをリセット
     */
    resetQuery() {
      this.selectedTables = []
      this.selectedColumns = []
      this.whereConditions = []
      this.query = null
      this.generatedSql = ''
      this.error = null
    },

    /**
     * クエリを実行
     */
    async executeQuery() {
      if (!this.canExecuteQuery) return

      this.isExecuting = true
      this.error = null

      try {
        // TODO: タスク1.7.4で実装
        console.log('Execute query:', {
          columns: this.selectedColumns,
          where: this.whereConditions
        })
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.isExecuting = false
      }
    },
  },
})
