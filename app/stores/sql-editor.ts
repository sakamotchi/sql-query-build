import { defineStore } from 'pinia'
import { useConnectionStore } from '~/stores/connection'
import { queryApi } from '~/api/query'
import { sqlEditorApi } from '~/api/sql-editor'
import type {
  SaveQueryRequest,
  SavedQuery,
  SavedQueryMetadata,
  SqlEditorState,
} from '~/types/sql-editor'
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
    savedQueries: [],
    currentQuery: null,
    isSavedQueriesLoading: false,
    savedQueryError: null,
    savedQuerySqlCache: {},
    isSaveDialogOpen: false,
    editingQueryId: null,
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

    /**
     * 保存可能かどうか
     */
    canSave(state): boolean {
      return !!state.connectionId && state.sql.trim().length > 0
    },

    /**
     * 編集対象の保存クエリ
     */
    editingQuery(state): SavedQueryMetadata | null {
      if (!state.editingQueryId) return null
      return state.savedQueries.find((query) => query.id === state.editingQueryId) || null
    },
  },

  actions: {
    /**
     * 接続を設定
     */
    setConnection(connectionId: string) {
      this.connectionId = connectionId
      this.savedQueries = []
      this.savedQuerySqlCache = {}
      this.currentQuery = null
      this.savedQueryError = null
      this.isSaveDialogOpen = false
      this.editingQueryId = null
      void this.loadSavedQueries()
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
      this.currentQuery = null
    },

    /**
     * 保存ダイアログを開く
     */
    openSaveDialog(editingQueryId: string | null = null) {
      this.isSaveDialogOpen = true
      this.editingQueryId = editingQueryId
    },

    /**
     * 保存ダイアログを閉じる
     */
    closeSaveDialog() {
      this.isSaveDialogOpen = false
      this.editingQueryId = null
    },

    /**
     * 保存済みクエリ一覧を読み込み
     */
    async loadSavedQueries() {
      if (!this.connectionId) return
      this.isSavedQueriesLoading = true
      this.savedQueryError = null

      try {
        const queries = await sqlEditorApi.listQueries(this.connectionId)
        this.savedQueries = queries
        const validIds = new Set(queries.map((query) => query.id))
        Object.keys(this.savedQuerySqlCache).forEach((id) => {
          if (!validIds.has(id)) {
            delete this.savedQuerySqlCache[id]
          }
        })
        void this.prefetchSavedQuerySql(queries)
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to load saved queries:', error)
      } finally {
        this.isSavedQueriesLoading = false
      }
    },

    /**
     * 保存クエリのSQLを先読み
     */
    async prefetchSavedQuerySql(queries: SavedQueryMetadata[]) {
      const targets = queries.filter((query) => !this.savedQuerySqlCache[query.id])
      if (targets.length === 0) return

      await Promise.allSettled(
        targets.map(async (query) => {
          const fullQuery = await sqlEditorApi.loadQuery(query.id)
          this.savedQuerySqlCache[query.id] = fullQuery.sql
        })
      )
    },

    /**
     * 保存クエリを取得（キャッシュ更新のみ）
     */
    async fetchSavedQuery(id: string): Promise<SavedQuery> {
      this.savedQueryError = null

      try {
        const query = await sqlEditorApi.loadQuery(id)
        this.savedQuerySqlCache[id] = query.sql
        return query
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to fetch query:', error)
        throw error
      }
    },

    /**
     * 保存クエリを保存（新規）
     */
    async saveCurrentQuery(request: SaveQueryRequest): Promise<SavedQuery> {
      return await this.persistSavedQuery(request, { updateEditor: true })
    },

    /**
     * 保存クエリを更新（メタデータのみ）
     */
    async updateSavedQuery(request: SaveQueryRequest): Promise<SavedQuery> {
      return await this.persistSavedQuery(request, { updateEditor: false })
    },

    async persistSavedQuery(
      request: SaveQueryRequest,
      options: { updateEditor: boolean }
    ): Promise<SavedQuery> {
      this.savedQueryError = null

      try {
        const saved = await sqlEditorApi.saveQuery(request)
        this.savedQuerySqlCache[saved.id] = saved.sql
        await this.loadSavedQueries()

        if (options.updateEditor) {
          this.currentQuery = saved
          this.sql = saved.sql
          this.isDirty = false
        } else if (this.currentQuery?.id === saved.id) {
          this.currentQuery = {
            ...this.currentQuery,
            name: saved.name,
            description: saved.description,
            tags: saved.tags,
            updatedAt: saved.updatedAt,
          }
        }

        return saved
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to save query:', error)
        throw error
      }
    },

    /**
     * 保存クエリをエディタに読み込み
     */
    async loadSavedQuery(id: string): Promise<SavedQuery> {
      this.savedQueryError = null

      try {
        const query = await sqlEditorApi.loadQuery(id)
        this.currentQuery = query
        this.sql = query.sql
        this.isDirty = false
        this.selectionSql = null
        this.savedQuerySqlCache[id] = query.sql
        return query
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to load query:', error)
        throw error
      }
    },

    /**
     * 保存クエリを削除
     */
    async deleteSavedQuery(id: string) {
      this.savedQueryError = null

      try {
        await sqlEditorApi.deleteQuery(id)
        delete this.savedQuerySqlCache[id]
        await this.loadSavedQueries()

        if (this.currentQuery?.id === id) {
          this.currentQuery = null
        }
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to delete query:', error)
        throw error
      }
    },

    /**
     * 保存クエリを直接実行
     */
    async executeSavedQuery(id: string) {
      const query = await this.fetchSavedQuery(id)
      await this.executeSqlText(query.sql)
    },

    /**
     * SQL文字列を実行
     */
    async executeSqlText(sqlToExecute: string, emptyMessage = '実行するSQLが空です') {
      if (this.isExecuting) return
      if (!this.connectionId) {
        this.error = createClientError('接続が選択されていません')
        return
      }

      if (!sqlToExecute.trim()) {
        this.error = createClientError(emptyMessage)
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
     * クエリ実行（Phase 3で実装）
     */
    async executeQuery() {
      const selectionSql = this.selectionSql
      const sqlToExecute = selectionSql ?? this.sql

      if (!sqlToExecute.trim()) {
        this.error = createClientError(
          selectionSql !== null ? '選択範囲が空です' : '実行するSQLが空です'
        )
        return
      }

      await this.executeSqlText(sqlToExecute)
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

const normalizeSavedQueryError = (error: unknown): string => {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return '不明なエラーが発生しました'
}
