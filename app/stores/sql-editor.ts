import { defineStore } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { queryApi } from '~/api/query'
import type { SqlEditorState } from '~/types/sql-editor'
import type { QueryExecuteError } from '~/types/query-result'

let latestExecutionId = 0

export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => ({
    connectionId: null,
    sql: '',
    isDirty: false,
    isExecuting: false,
    result: null,
    error: null,
    executingQueryId: null,
    selectionSql: null,
  }),

  getters: {
    /**
     * 現在の接続情報を取得
     */
    currentConnection(state) {
      if (!state.connectionId) return null
      const connectionStore = useConnectionStore()
      return connectionStore.getConnectionById(state.connectionId) || null
    },

    /**
     * 実行可能かどうか（Phase 3で使用）
     */
    canExecute(state): boolean {
      return !state.isExecuting && state.sql.trim().length > 0
    },
  },

  actions: {
    /**
     * 接続を設定
     */
    setConnection(connectionId: string) {
      this.connectionId = connectionId
    },

    /**
     * SQL文字列を更新
     */
    updateSql(sql: string) {
      if (this.sql === sql) return
      this.sql = sql
      this.isDirty = true
    },

    /**
     * エディタをリセット
     */
    reset() {
      this.sql = ''
      this.isDirty = false
      this.result = null
      this.error = null
      this.executingQueryId = null
      this.selectionSql = null
    },

    /**
     * クエリ実行（Phase 3で実装）
     */
    async executeQuery() {
      if (this.isExecuting) return
      if (!this.connectionId) {
        this.error = createClientError('接続が選択されていません')
        return
      }

      const selectionSql = this.selectionSql
      const sqlToExecute = selectionSql ?? this.sql
      if (!sqlToExecute.trim()) {
        this.error = createClientError(
          selectionSql !== null ? '選択範囲が空です' : '実行するSQLが空です'
        )
        return
      }

      const executionId = ++latestExecutionId
      this.isExecuting = true
      this.error = null
      this.result = null
      this.executingQueryId = null

      try {
        const response = await queryApi.executeQuery({
          connectionId: this.connectionId,
          sql: sqlToExecute.trim(),
          timeoutSeconds: 30,
        })

        if (executionId !== latestExecutionId || !this.isExecuting) {
          return
        }

        this.executingQueryId = response.queryId
        this.result = response.result
      } catch (error) {
        if (executionId !== latestExecutionId || !this.isExecuting) {
          return
        }
        this.error = normalizeQueryError(error)
      } finally {
        if (executionId === latestExecutionId) {
          this.isExecuting = false
          this.executingQueryId = null
        }
      }
    },

    /**
     * クエリキャンセル
     */
    async cancelQuery() {
      if (!this.isExecuting) return
      this.isExecuting = false
      this.result = null
      this.error = {
        code: 'query_cancelled',
        message: 'クエリの実行をキャンセルしました。',
      }

      if (!this.executingQueryId) return
      try {
        await queryApi.cancelQuery(this.executingQueryId)
      } catch (error) {
        console.error('Failed to cancel query:', error)
      }
    },

    /**
     * 選択SQLを更新
     */
    setSelectionSql(selectionSql: string | null) {
      this.selectionSql = selectionSql
    },
  },
})

const createClientError = (message: string): QueryExecuteError => ({
  code: 'unknown',
  message,
})

const normalizeQueryError = (error: unknown): QueryExecuteError => {
  if (typeof error === 'string') {
    try {
      return JSON.parse(error) as QueryExecuteError
    } catch {
      return { code: 'unknown', message: error }
    }
  }

  if (error instanceof Error) {
    return { code: 'unknown', message: error.message }
  }

  return {
    code: 'unknown',
    message: '不明なエラーが発生しました',
  }
}
