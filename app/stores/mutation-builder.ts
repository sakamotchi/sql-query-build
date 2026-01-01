import { defineStore } from 'pinia'
import type { MutationType, MutationQueryModel } from '@/types/mutation-query'
import type { QueryExecuteError } from '@/types/query-result'

interface MutationBuilderState {
  /** 現在のクエリ種別 */
  mutationType: MutationType

  /** 選択中のテーブル名 */
  selectedTable: string | null

  /** 現在のクエリモデル */
  queryModel: MutationQueryModel | null

  /** 生成されたSQL */
  generatedSql: string

  /** SQL生成中フラグ */
  isGeneratingSql: boolean

  /** SQL生成エラー */
  sqlGenerationError: string | null

  /** 実行中フラグ */
  isExecuting: boolean

  /** クエリ実行エラー */
  queryError: QueryExecuteError | null

  /** クエリ情報 */
  queryInfo: {
    affectedRows: number | null
    executionTime: number | null
    lastExecutedAt: string | null
  }
}

export const useMutationBuilderStore = defineStore('mutation-builder', {
  state: (): MutationBuilderState => ({
    mutationType: 'INSERT',
    selectedTable: null,
    queryModel: null,
    generatedSql: '',
    isGeneratingSql: false,
    sqlGenerationError: null,
    isExecuting: false,
    queryError: null,
    queryInfo: {
      affectedRows: null,
      executionTime: null,
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
    setSelectedTable(table: string): void {
      this.selectedTable = table
      this.resetQueryModel()
    },

    /**
     * クエリモデルをリセット
     */
    resetQueryModel(): void {
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
     * 状態を完全にリセット
     */
    resetState(): void {
      this.$reset()
    },
  },
})
