import { defineStore } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import type { SqlEditorState } from '~/types/sql-editor'

export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => ({
    connectionId: null,
    sql: '',
    isDirty: false,
    isExecuting: false,
    result: null,
    error: null,
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
    },

    /**
     * クエリ実行（Phase 3で実装）
     */
    async executeQuery() {
      throw new Error('Not implemented yet')
    },
  },
})
