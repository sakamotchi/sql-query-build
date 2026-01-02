import { defineStore } from 'pinia'
import type {
  MutationType,
  MutationQueryModel,
  InsertQueryModel,
  UpdateQueryModel,
  UpdateSetValue,
  UpdateSqlQueryModel,
} from '@/types/mutation-query'
import type { WhereCondition, ConditionGroup } from '@/types/query'
import type { WhereClause, WhereConditionItem, WhereValue, WhereOperator } from '@/types/query-model'
import type { QueryExecuteError } from '@/types/query-result'
import type { QueryAnalysisResult } from '@/types/query-analysis'
import { mutationApi } from '@/api/mutation'
import { queryApi } from '@/api/query'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import { useSqlFormatter } from '@/composables/useSqlFormatter'

export type InsertInputMode = 'form' | 'grid'

const isValidCondition = (condition: WhereCondition): boolean => {
  return condition.column !== null && condition.isValid
}

const hasValidWhereConditions = (
  conditions: Array<WhereCondition | ConditionGroup>
): boolean => {
  for (const item of conditions) {
    if (item.type === 'condition') {
      if (isValidCondition(item)) return true
    } else if (hasValidWhereConditions(item.conditions)) {
      return true
    }
  }
  return false
}

const parseValue = (value: string): string | number => {
  if (value === null || value === undefined) return value
  const num = Number(value)
  return Number.isNaN(num) ? value : num
}

const convertWhereValue = (
  value: string | string[] | { from: string; to: string },
  operator: WhereOperator
): WhereValue => {
  if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
    return { type: 'literal', value: null }
  }

  if (operator === 'IN' || operator === 'NOT IN') {
    const arr = Array.isArray(value) ? value : [value as string]
    return {
      type: 'list',
      values: arr.map(parseValue),
    }
  }

  if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
    const range = value as { from: string; to: string }
    return {
      type: 'range',
      from: parseValue(range.from),
      to: parseValue(range.to),
    }
  }

  return {
    type: 'literal',
    value: parseValue(value as string),
  }
}

const convertWhereConditionItem = (
  item: WhereCondition | ConditionGroup
): WhereConditionItem => {
  if (item.type === 'group') {
    return {
      type: 'group',
      id: item.id,
      logic: item.logic,
      conditions: item.conditions.map(convertWhereConditionItem),
    }
  }

  return {
    type: 'condition',
    id: item.id,
    column: item.column!,
    operator: item.operator,
    value: convertWhereValue(item.value, item.operator as WhereOperator),
  }
}

const filterValidConditions = (
  conditions: Array<WhereCondition | ConditionGroup>
): Array<WhereCondition | ConditionGroup> => {
  const filtered: Array<WhereCondition | ConditionGroup> = []

  conditions.forEach((item) => {
    if (item.type === 'condition') {
      if (isValidCondition(item)) {
        filtered.push(item)
      }
      return
    }

    const nested = filterValidConditions(item.conditions)
    if (nested.length > 0) {
      filtered.push({
        ...item,
        conditions: nested,
      })
    }
  })

  return filtered
}

const buildWhereClause = (
  conditions: Array<WhereCondition | ConditionGroup>
): WhereClause | null => {
  const validConditions = filterValidConditions(conditions)

  if (validConditions.length === 0) return null

  return {
    logic: 'AND',
    conditions: validConditions.map(convertWhereConditionItem),
  }
}

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
        return hasValidWhereConditions(state.queryModel.whereConditions)
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
      this.generateMutationSql()
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
     * UPDATEクエリモデルを取得または初期化
     */
    ensureUpdateModel(): UpdateQueryModel | null {
      if (!this.selectedTable) {
        this.queryModel = null
        this.generatedSql = ''
        return null
      }

      if (!this.queryModel || this.queryModel.type !== 'UPDATE') {
        this.queryModel = {
          type: 'UPDATE',
          table: this.selectedTable,
          setClause: {},
          whereConditions: [],
        }
      }

      return this.queryModel as UpdateQueryModel
    },

    /**
     * UPDATEのSET句を更新
     */
    updateSetClause(setClause: Record<string, UpdateSetValue>): void {
      if (this.mutationType !== 'UPDATE') return
      const model = this.ensureUpdateModel()
      if (!model) return

      model.setClause = setClause
      this.generateUpdateSql()
    },

    /**
     * UPDATE/DELETEのWHERE条件を追加
     */
    addWhereCondition(condition: WhereCondition): void {
      if (this.mutationType === 'INSERT') return
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      this.queryModel.whereConditions.push(condition)
      this.generateMutationSql()
    },

    /**
     * UPDATE/DELETEの条件グループを追加
     */
    addWhereConditionGroup(group: ConditionGroup): void {
      if (this.mutationType === 'INSERT') return
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      this.queryModel.whereConditions.push(group)
      this.generateMutationSql()
    },

    /**
     * UPDATE/DELETEのWHERE条件を削除
     */
    removeWhereCondition(id: string): void {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      const index = this.queryModel.whereConditions.findIndex((c) => c.id === id)
      if (index !== -1) {
        this.queryModel.whereConditions.splice(index, 1)
        this.generateMutationSql()
      }
    },

    /**
     * UPDATE/DELETEのWHERE条件を更新
     */
    updateWhereCondition(id: string, updates: Partial<WhereCondition>): void {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      const condition = this.findCondition(id)
      if (condition && condition.type === 'condition') {
        Object.assign(condition, updates)
        this.generateMutationSql()
      }
    },

    /**
     * グループ内に条件追加
     */
    addConditionToGroup(groupId: string, condition: WhereCondition): void {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        group.conditions.push(condition)
        this.generateMutationSql()
      }
    },

    /**
     * グループから条件削除
     */
    removeConditionFromGroup(groupId: string, conditionId: string): void {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        const index = group.conditions.findIndex((c) => c.id === conditionId)
        if (index !== -1) {
          group.conditions.splice(index, 1)
          this.generateMutationSql()
        }
      }
    },

    /**
     * グループのロジック変更
     */
    updateGroupLogic(groupId: string, logic: 'AND' | 'OR'): void {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return

      const group = this.findCondition(groupId)
      if (group && group.type === 'group') {
        group.logic = logic
        this.generateMutationSql()
      }
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
        const { formatMutationSql } = useSqlFormatter()
        this.generatedSql = formatMutationSql(rawSql, 'INSERT')

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
     * UPDATE SQLを生成
     */
    async generateUpdateSql(): Promise<void> {
      if (!this.queryModel || this.queryModel.type !== 'UPDATE') {
        this.generatedSql = ''
        this.analysisResult = null
        return
      }

      if (!Object.keys(this.queryModel.setClause || {}).length) {
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

      const whereClause = buildWhereClause(this.queryModel.whereConditions)

      this.isGeneratingSql = true
      this.sqlGenerationError = null

      try {
        const request: UpdateSqlQueryModel = {
          type: 'UPDATE',
          table: this.queryModel.table,
          setClause: this.queryModel.setClause,
          whereClause,
        }

        const result = await mutationApi.generateUpdateSql(request, connectionId, this.smartQuote)

        const { formatMutationSql } = useSqlFormatter()
        this.generatedSql = formatMutationSql(result.sql, 'UPDATE')

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
        console.error('Failed to generate UPDATE SQL:', error)
        this.sqlGenerationError = error instanceof Error ? error.message : 'Unknown error'
        this.generatedSql = ''
        this.analysisResult = null
      } finally {
        this.isGeneratingSql = false
      }
    },

    /**
     * mutation種別に応じたSQLを生成
     */
    async generateMutationSql(): Promise<void> {
      if (this.mutationType === 'INSERT') {
        await this.generateInsertSql()
      } else if (this.mutationType === 'UPDATE') {
        await this.generateUpdateSql()
      } else {
        this.generatedSql = ''
        this.analysisResult = null
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
     * 条件を検索（再帰）
     */
    findCondition(id: string): WhereCondition | ConditionGroup | null {
      if (!this.queryModel || this.queryModel.type === 'INSERT') return null

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

      return search(this.queryModel.whereConditions)
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
            setClause: {},
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
      this.generateMutationSql()
    },

    /**
     * 状態を完全にリセット
     */
    resetState(): void {
      this.$reset()
    },
  },
})
