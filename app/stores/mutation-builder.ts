import { defineStore } from 'pinia'
import type { MutationType, MutationQueryModel, InsertQueryModel } from '@/types/mutation-query'
import type { QueryExecuteError } from '@/types/query-result'
import type { QueryAnalysisResult } from '@/types/query-analysis'
import { mutationApi } from '@/api/mutation'
import { queryApi } from '@/api/query'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import { useSqlFormatter } from '@/composables/useSqlFormatter'

export type InsertInputMode = 'form' | 'grid'

export interface SerializableMutationState {
  mutationType: MutationType
  selectedTable: string | null
  queryModel: MutationQueryModel | null
  insertInputMode: InsertInputMode
  smartQuote: boolean
}

interface MutationBuilderState {
  /** 現在のクエリ種別 */
  mutationType: MutationType

  /** 選択中のテーブル名 */
  selectedTable: string | null

  /** 現在のクエリモデル */
  queryModel: MutationQueryModel | null

  /** 入力形式 */
  insertInputMode: InsertInputMode

  /** 生成されたSQL */
  generatedSql: string

  /** SQL生成中フラグ */
  isGeneratingSql: boolean

  /** SQL生成エラー */
  sqlGenerationError: string | null

  /** スマートクォーティング */
  smartQuote: boolean

  /** クエリ解析結果 */
  analysisResult: QueryAnalysisResult | null

  /** 実行中フラグ */
  isExecuting: boolean

  /** クエリ実行エラー */
  queryError: QueryExecuteError | null

  /** クエリ情報 */
  queryInfo: {
    affectedRows: number | null
    executionTimeMs: number | null
    lastExecutedAt: string | null
  }
}

export const useMutationBuilderStore = defineStore('mutation-builder', {
  state: (): MutationBuilderState => ({
    mutationType: 'INSERT',
    selectedTable: null,
    queryModel: null,
    insertInputMode: 'form',
    generatedSql: '',
    isGeneratingSql: false,
    sqlGenerationError: null,
    smartQuote: true,
    analysisResult: null,
    isExecuting: false,
    queryError: null,
    queryInfo: {
      affectedRows: null,
      executionTimeMs: null,
      lastExecutedAt: null,
    },
  }),

  getters: {
    /**
     * クエリが実行可能かどうか
     */
    canExecuteQuery(state): boolean {
      return (
        state.selectedTable !== null &&
        state.queryModel !== null &&
        state.generatedSql.length > 0 &&
        !state.isGeneratingSql &&
        !state.isExecuting
      )
    },

    /**
     * WHERE句が設定されているかどうか（UPDATE/DELETEのみ）
     */
    hasWhereConditions(state): boolean {
      if (state.mutationType === 'INSERT') {
        return true
      }

      if (!state.queryModel) {
        return false
      }

      if (state.queryModel.type === 'UPDATE' || state.queryModel.type === 'DELETE') {
        return state.queryModel.whereConditions.length > 0
      }

      return true
    },
  },

  actions: {
    /**
     * クエリ種別を変更
     */
    setMutationType(type: MutationType): void {
      this.mutationType = type
      this.resetQueryModel()
    },

    /**
     * テーブルを選択
     */
    setSelectedTable(table: string | null): void {
      this.selectedTable = table
      this.resetQueryModel()
    },

    /**
     * 入力形式を変更
     */
    setInsertInputMode(mode: InsertInputMode): void {
      this.insertInputMode = mode
    },

    /**
     * スマートクォーティングを切り替え
     */
    setSmartQuote(value: boolean): void {
      this.smartQuote = value
      this.generateInsertSql()
    },

    /**
     * INSERTクエリモデルを更新
     */
    updateInsertQueryModel(payload: { columns: string[]; values: Array<Record<string, any>> }): void {
      if (this.mutationType !== 'INSERT') return
      if (!this.selectedTable) {
        this.queryModel = null
        this.generatedSql = ''
        return
      }

      if (!this.queryModel || this.queryModel.type !== 'INSERT') {
        this.queryModel = {
          type: 'INSERT',
          table: this.selectedTable,
          columns: [],
          values: [],
        }
      }

      const model = this.queryModel as InsertQueryModel
      model.columns = payload.columns
      model.values = payload.values
      this.generateInsertSql()
    },

    /**
     * INSERT SQLを生成
     */
    async generateInsertSql(): Promise<void> {
      if (!this.queryModel || this.queryModel.type !== 'INSERT') {
        this.generatedSql = ''
        this.analysisResult = null
        return
      }

      if (!this.queryModel.columns.length || !this.queryModel.values.length) {
        this.generatedSql = ''
        this.analysisResult = null
        return
      }

      const connectionStore = useConnectionStore()
      const windowStore = useWindowStore()
      const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

      if (!connectionId) {
        this.generatedSql = ''
        this.analysisResult = null
        return
      }

      this.isGeneratingSql = true
      this.sqlGenerationError = null

      try {
        const rawSql = await mutationApi.generateInsertSql(this.queryModel, connectionId, this.smartQuote)

        // SQLをフォーマット
        const { formatInsertSql } = useSqlFormatter()
        this.generatedSql = formatInsertSql(rawSql)

        const activeConnection =
          connectionStore.activeConnection ||
          connectionStore.connections.find((c) => c.id === connectionId)
        if (activeConnection) {
          const dialect = activeConnection.type.toLowerCase()
          this.analysisResult = await queryApi.analyzeQuery(this.generatedSql, dialect)
        } else {
          this.analysisResult = null
        }
      } catch (error) {
        console.error('Failed to generate INSERT SQL:', error)
        this.sqlGenerationError = error instanceof Error ? error.message : 'Unknown error'
        this.generatedSql = ''
        this.analysisResult = null
      } finally {
        this.isGeneratingSql = false
      }
    },

    /**
     * クエリを実行
     */
    async executeMutation(): Promise<void> {
      if (!this.canExecuteQuery) return
      if (!this.generatedSql) return

      this.isExecuting = true
      this.queryError = null

      try {
        const connectionStore = useConnectionStore()
        const windowStore = useWindowStore()
        const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

        if (!connectionId) {
          throw new Error('接続が選択されていません')
        }

        const result = await mutationApi.executeMutation({
          connectionId,
          sql: this.generatedSql,
          timeoutSeconds: 30,
        })

        this.queryInfo = {
          affectedRows: result.affectedRows,
          executionTimeMs: result.executionTimeMs,
          lastExecutedAt: new Date().toISOString(),
        }

        const { useQueryHistoryStore } = await import('./query-history')
        const historyStore = useQueryHistoryStore()
        historyStore.addHistory({
          connectionId,
          query: this.getSerializableState(),
          sql: this.generatedSql,
          success: true,
          resultCount: result.affectedRows,
          executionTimeMs: result.executionTimeMs,
        })
      } catch (error) {
        if (typeof error === 'string') {
          try {
            const parsed = JSON.parse(error) as QueryExecuteError
            this.queryError = parsed
          } catch {
            this.queryError = {
              code: 'unknown',
              message: error,
            }
          }
        } else if (error instanceof Error) {
          this.queryError = {
            code: 'unknown',
            message: error.message,
          }
        } else {
          this.queryError = {
            code: 'unknown',
            message: 'Unknown error',
          }
        }

        const connectionStore = useConnectionStore()
        const windowStore = useWindowStore()
        const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

        if (connectionId) {
          const { useQueryHistoryStore } = await import('./query-history')
          const historyStore = useQueryHistoryStore()
          historyStore.addHistory({
            connectionId,
            query: this.getSerializableState(),
            sql: this.generatedSql,
            success: false,
            errorMessage: this.queryError?.message || 'Unknown error',
          })
        }
      } finally {
        this.isExecuting = false
      }
    },

    /**
     * クエリモデルをリセット
     */
    resetQueryModel(): void {
      this.generatedSql = ''
      this.sqlGenerationError = null
      this.analysisResult = null

      if (!this.selectedTable) {
        this.queryModel = null
        return
      }

      switch (this.mutationType) {
        case 'INSERT':
          this.queryModel = {
            type: 'INSERT',
            table: this.selectedTable,
            columns: [],
            values: [],
          }
          break
        case 'UPDATE':
          this.queryModel = {
            type: 'UPDATE',
            table: this.selectedTable,
            setClause: [],
            whereConditions: [],
          }
          break
        case 'DELETE':
          this.queryModel = {
            type: 'DELETE',
            table: this.selectedTable,
            whereConditions: [],
          }
          break
      }
    },

    /**
     * 保存可能な状態を取得
     */
    getSerializableState(): SerializableMutationState {
      return {
        mutationType: this.mutationType,
        selectedTable: this.selectedTable,
        queryModel: this.queryModel ? JSON.parse(JSON.stringify(this.queryModel)) : null,
        insertInputMode: this.insertInputMode,
        smartQuote: this.smartQuote,
      }
    },

    /**
     * 状態を復元
     */
    loadState(state: SerializableMutationState): void {
      this.$reset()
      this.mutationType = state.mutationType
      this.selectedTable = state.selectedTable
      this.queryModel = state.queryModel
      this.insertInputMode = state.insertInputMode || 'form'
      this.smartQuote = state.smartQuote ?? true
      this.generateInsertSql()
    },

    /**
     * 状態を完全にリセット
     */
    resetState(): void {
      this.$reset()
    },
  },
})
