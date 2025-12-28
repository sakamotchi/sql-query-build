import { defineStore } from 'pinia'
import type { QueryModel, QueryInfo, SelectedTable } from '@/types/query'
import type { Table } from '@/types/database-structure'

interface QueryBuilderState {
  /** 選択されたテーブル一覧（テーブルカード用） */
  selectedTables: SelectedTable[]
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
      return !!state.query && state.query.tables.length > 0
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
        table.alias = alias
        this.regenerateSql()
      }
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
    removeRelatedColumns(_tableId: string) {
      // TODO: カラム選択機能実装時に詳細化
    },

    /**
     * SQLを再生成
     */
    regenerateSql() {
      // TODO: SQL生成エンジン実装時に詳細化
    },

    /**
     * クエリをリセット
     */
    resetQuery() {
      this.selectedTables = []
      this.query = {
        tables: [],
        joins: [],
        columns: [],
        where: [],
        groupBy: [],
        having: [],
        orderBy: [],
        limit: null,
        offset: null,
      }
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
        console.log('Execute query:', this.query)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.isExecuting = false
      }
    },
  },
})
