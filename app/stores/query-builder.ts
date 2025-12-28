import { defineStore } from 'pinia'
import type { QueryModel, QueryInfo, SelectedTable, SelectedColumn } from '@/types/query'
import type { Table } from '@/types/database-structure'

interface QueryBuilderState {
  /** 選択されたテーブル一覧（テーブルカード用） */
  selectedTables: SelectedTable[]
  /** 選択されたカラム一覧（カラム選択UI用） */
  selectedColumns: SelectedColumn[]
  /** ドラッグ中のテーブル（ドラッグ&ドロップ用） */
  draggingTable: Table | null
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
      if (movedColumns.length > 0) {
        this.selectedColumns.splice(toIndex, 0, movedColumns[0])
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

      this.generatedSql = `SELECT\n  ${selectClause}\nFROM\n  ${fromClause}`
    },

    /**
     * クエリをリセット
     */
    resetQuery() {
      this.selectedTables = []
      this.selectedColumns = []
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
        console.log('Execute query:', this.selectedColumns)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.isExecuting = false
      }
    },
  },
})
