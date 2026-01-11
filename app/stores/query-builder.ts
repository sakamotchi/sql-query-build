import { defineStore } from 'pinia'
import type {
  QueryModel,
  QueryInfo,
  SelectedTable,
  SelectedColumn,
  SelectedExpression,
  SelectedExpressionNode,
  WhereCondition,
  ConditionGroup,
  GroupByColumn,
  OrderByColumn,
} from '@/types/query'
import type { JoinClause, JoinCondition as JoinConditionModel } from '@/types/query-model'
import type { QueryAnalysisResult } from '@/types/query-analysis'
import { queryApi } from '@/api/query'
import { joinSuggestionsApi } from '@/api/join-suggestions'
import { convertToQueryModel } from '@/utils/query-converter'
import { generatePreviewSql } from '@/utils/expression-preview'
import { useConnectionStore } from '@/stores/connection'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import { useWindowStore } from '@/stores/window'
import type { Table } from '@/types/database-structure'
import type { QueryExecuteResult, QueryExecuteError, QueryResultRow } from '@/types/query-result'
import type { JoinSuggestion } from '@/types/join-suggestion'

interface QueryBuilderState {
  /** 選択されたテーブル一覧（テーブルカード用） */
  selectedTables: SelectedTable[]
  /** テーブルカードの位置 (エイリアスまたはID単位) */
  tablePositions: Record<string, { x: number; y: number }>
  /** 選択されたカラム一覧（カラム選択UI用） */
  selectedColumns: SelectedColumn[]
  /** 選択された式一覧（式入力UI用） */
  selectedExpressions: SelectedExpression[]
  /** 選択された式ツリー一覧（関数ビルダー用） */
  selectedExpressionNodes: SelectedExpressionNode[]
  /** 選択アイテムの順序 (Items ID list) */
  selectItemOrder: string[]
  /** ExpressionNode編集中の一時状態 */
  editingExpressionNode: SelectedExpressionNode | null
  /** 関数ビルダーダイアログ開閉 */
  expressionDialogOpen: boolean
  /** ドラッグ中のテーブル（ドラッグ&ドロップ用） */
  draggingTable: Table | null
  /** WHERE条件一覧 */
  whereConditions: Array<WhereCondition | ConditionGroup>
  /** GROUP BYカラム一覧 */
  groupByColumns: GroupByColumn[]
  /** JOIN設定 */
  joins: JoinClause[]
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
  /** クエリ実行エラー */
  queryError: QueryExecuteError | null
  /** LIMIT (取得件数) */
  limit: number | null

  /** OFFSET (開始位置) */
  offset: number | null
  /** SQL生成中フラグ */
  isGeneratingSql: boolean
  /** SQL生成エラー */
  sqlGenerationError: string | null
  smartQuote: boolean // スマートクォーティング（true: 最小限, false: 常に引用符）

  /** クエリ解析結果 */
  analysisResult: QueryAnalysisResult | null

  /** JOIN提案 */
  joinSuggestions: JoinSuggestion[]
  /** JOIN提案のローディング状態 */
  isLoadingJoinSuggestions: boolean

  // クエリ実行結果関連
  /** クエリ実行結果 */
  queryResult: QueryExecuteResult | null
  /** 現在のページ（1始まり） */
  currentPage: number
  /** 1ページあたりの行数 */
  pageSize: number
  /** 実行中のクエリID（キャンセル用） */
  executingQueryId: string | null
}

export interface AvailableColumn {
  id: string
  label: string
  tableId: string
  tableAlias: string
  tableName: string
  columnName: string
  dataType: string
}

export interface SerializableQueryState {
  selectedTables: SelectedTable[]
  tablePositions?: Record<string, { x: number; y: number }>
  selectedColumns: SelectedColumn[]
  selectedExpressions: SelectedExpression[]
  selectedExpressionNodes: SelectedExpressionNode[]
  whereConditions: Array<WhereCondition | ConditionGroup>
  groupByColumns: GroupByColumn[]
  joins: JoinClause[]
  orderByColumns: OrderByColumn[]
  limit: number | null
  offset: number | null
  smartQuote: boolean
}

export const useQueryBuilderStore = defineStore('query-builder', {
  state: (): QueryBuilderState => ({
    selectedTables: [],
    tablePositions: {},
    selectedColumns: [],
    selectedExpressions: [],
    selectedExpressionNodes: [],
    selectItemOrder: [],
    editingExpressionNode: null,
    expressionDialogOpen: false,
    draggingTable: null,
    whereConditions: [],
    groupByColumns: [],
    joins: [],
    orderByColumns: [],
    query: null,
    generatedSql: '',
    queryInfo: {
      rowCount: 0,
      executionTime: null,
      lastExecutedAt: null,
    },
    isExecuting: false,
    queryError: null,
    limit: null,
    offset: null,
    isGeneratingSql: false,
    sqlGenerationError: null,
    smartQuote: true, // デフォルトで有効
    analysisResult: null,
    joinSuggestions: [],
    isLoadingJoinSuggestions: false,

    // クエリ実行結果初期値
    queryResult: null,
    currentPage: 1,
    pageSize: 100,
    executingQueryId: null,
  }),

  getters: {
    /**
     * クエリ実行可能かどうか
     */
    canExecuteQuery(state): boolean {
      return (
        state.selectedColumns.length > 0 ||
        state.selectedExpressions.length > 0 ||
        state.selectedExpressionNodes.length > 0
      )
    },

    /**
     * 利用可能なカラムリスト
     */
    availableColumns(state): AvailableColumn[] {
      return state.selectedTables.flatMap((table) =>
        table.columns.map((column) => ({
          id: `${table.alias}.${column.name}`,
          label: `${table.alias}.${column.name}`,
          tableId: table.id,
          tableAlias: table.alias,
          tableName: table.name,
          columnName: column.name,
          dataType: column.dataType,
        }))
      )
    },

    /**
     * 利用可能なテーブル一覧（DB構造から取得）
     */
    availableTables(): Table[] {
      const connectionStore = useConnectionStore()
      const windowStore = useWindowStore()
      const databaseStructureStore = useDatabaseStructureStore()

      const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId
      if (!connectionId) return []

      const structure = databaseStructureStore.getStructure(connectionId)
      if (!structure) return []

      return structure.schemas.flatMap((schema) => schema.tables)
    },

    /**
     * ExpressionNodeのプレビューSQLを生成
     */
    getExpressionPreviewSql: () => (expressionNode: SelectedExpressionNode) =>
      generatePreviewSql(expressionNode.expressionNode),

    /**
     * 現在ページの行データ
     */
    paginatedRows(state): QueryResultRow[] {
      if (!state.queryResult) return []
      const start = (state.currentPage - 1) * state.pageSize
      const end = start + state.pageSize
      return state.queryResult.rows.slice(start, end)
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
        delete this.tablePositions[tableId]
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
     * テーブルカードの位置を更新
     */
    updateTablePosition(tableId: string, x: number, y: number) {
      this.tablePositions[tableId] = { x, y }
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
        this.selectItemOrder.push(`column:${column.tableId}:${column.columnName}`)
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
        this.selectItemOrder = this.selectItemOrder.filter(
          (id) => id !== `column:${tableId}:${columnName}`
        )
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
          this.selectItemOrder.push(`column:${table.id}:${column.name}`)
        }
      })
      this.regenerateSql()
    },

    /**
     * テーブルの全カラム選択を解除
     */
    deselectAllColumnsFromTable(tableId: string) {
      this.selectedColumns = this.selectedColumns.filter((c) => c.tableId !== tableId)
      this.selectItemOrder = this.selectItemOrder.filter((id) => !id.startsWith(`column:${tableId}:`))
      this.regenerateSql()
    },

    /**
     * 全カラム選択を解除
     */
    clearSelectedColumns() {
      this.selectedColumns = []
      this.selectItemOrder = this.selectItemOrder.filter((id) => !id.startsWith('column:'))
      this.regenerateSql()
    },

    /**
     * 式を追加
     */
    addExpression(expression: string, alias: string | null) {
      const trimmed = expression.trim()
      if (!trimmed) return

      const id = crypto.randomUUID()
      this.selectedExpressions.push({
        id,
        expression: trimmed,
        alias: alias?.trim() || null,
      })
      this.selectItemOrder.push(`expression:${id}`)
      this.regenerateSql()
    },

    /**
     * 式を更新
     */
    updateExpression(id: string, updates: Partial<SelectedExpression>) {
      const expression = this.selectedExpressions.find((item) => item.id === id)
      if (!expression) return

      Object.assign(expression, updates)
      if (expression.alias !== null) {
        expression.alias = expression.alias.trim() || null
      }
      this.regenerateSql()
    },

    /**
     * 式を削除
     */
    removeExpression(id: string) {
      this.selectedExpressions = this.selectedExpressions.filter((item) => item.id !== id)
      this.selectItemOrder = this.selectItemOrder.filter((item) => item !== `expression:${id}`)
      this.regenerateSql()
    },

    /**
     * 式ツリーを追加
     */
    addExpressionNode(expressionNode: SelectedExpressionNode['expressionNode'], alias?: string | null) {
      const id = crypto.randomUUID()
      this.selectedExpressionNodes.push({
        id,
        expressionNode,
        alias: alias?.trim() || null,
      })
      this.selectItemOrder.push(`expression_node:${id}`)
      this.regenerateSql()
    },

    /**
     * 式ツリーを更新
     */
    updateExpressionNode(id: string, updates: Partial<SelectedExpressionNode>) {
      const target = this.selectedExpressionNodes.find((item) => item.id === id)
      if (!target) return

      Object.assign(target, updates)
      if (target.alias !== null) {
        target.alias = target.alias.trim() || null
      }
      this.regenerateSql()
    },

    /**
     * 式ツリーを削除
     */
    removeExpressionNode(id: string) {
      this.selectedExpressionNodes = this.selectedExpressionNodes.filter((item) => item.id !== id)
      this.selectItemOrder = this.selectItemOrder.filter((item) => item !== `expression_node:${id}`)
      this.regenerateSql()
    },

    /**
     * SELECT項目の順序を更新
     */
    updateSelectItemOrder(newOrder: string[]) {
      this.selectItemOrder = newOrder
      this.regenerateSql()
    },

    /**
     * 関数ビルダーを開く
     */
    openFunctionBuilder() {
      this.editingExpressionNode = null
      this.expressionDialogOpen = true
    },

    /**
     * 関数ビルダーを閉じる
     */
    closeFunctionBuilder() {
      this.editingExpressionNode = null
      this.expressionDialogOpen = false
    },

    /**
     * 関数を追加
     */
    addFunction(expressionNode: SelectedExpressionNode['expressionNode'], alias?: string | null) {
      this.addExpressionNode(expressionNode, alias)
      this.closeFunctionBuilder()
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
     * JOINを追加
     */
    addJoin(join: Omit<JoinClause, 'id'>) {
      const newJoin: JoinClause = {
        ...join,
        id: crypto.randomUUID(),
      }
      this.joins.push(newJoin)
      this.regenerateSql()
    },

    /**
     * JOINを更新
     */
    updateJoin(id: string, updates: Partial<Omit<JoinClause, 'id'>>) {
      const index = this.joins.findIndex((j) => j.id === id)
      if (index !== -1) {
        const current = this.joins[index]
        const updated = {
          ...current,
          ...updates,
        } as JoinClause
        this.joins[index] = updated
        this.regenerateSql()
      }
    },

    /**
     * JOINを削除
     */
    removeJoin(id: string) {
      this.joins = this.joins.filter((j) => j.id !== id)
      this.regenerateSql()
    },

    /**
     * JOIN提案を取得
     */
    async fetchJoinSuggestions(fromTable: string, toTable: string) {
      if (!fromTable || !toTable) {
        this.joinSuggestions = []
        return
      }

      const connectionStore = useConnectionStore()
      const windowStore = useWindowStore()
      const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

      if (!connectionId) {
        console.warn('No active connection for join suggestions')
        this.joinSuggestions = []
        return
      }

      const schema =
        this.selectedTables.find((t) => t.name === fromTable || t.alias === fromTable)?.schema ||
        this.selectedTables.find((t) => t.name === toTable || t.alias === toTable)?.schema ||
        'public'

      this.isLoadingJoinSuggestions = true

      try {
        this.joinSuggestions = await joinSuggestionsApi.getJoinSuggestions(
          connectionId,
          fromTable,
          toTable,
          schema
        )
      } catch (error) {
        console.error('Failed to fetch join suggestions:', error)
        this.joinSuggestions = []
      } finally {
        this.isLoadingJoinSuggestions = false
      }
    },

    /**
     * JOIN提案をJoinClause形式に変換
     */
    applyJoinSuggestion(suggestion: JoinSuggestion): Omit<JoinClause, 'id'> {
      const resolveAlias = (tableName: string) => {
        const table = this.selectedTables.find(
          (t) => t.alias === tableName || t.name === tableName
        )
        return table?.alias || tableName
      }

      const resolveSchema = (tableName: string) => {
        const table = this.selectedTables.find(
          (t) => t.alias === tableName || t.name === tableName
        )
        return table?.schema
      }

      const normalizeJoinType = (joinType: string): JoinClause['type'] => {
        const upper = joinType.toUpperCase()
        if (upper.startsWith('LEFT')) return 'LEFT'
        if (upper.startsWith('RIGHT')) return 'RIGHT'
        if (upper.startsWith('FULL')) return 'FULL'
        if (upper.startsWith('CROSS')) return 'CROSS'
        return 'INNER'
      }

      const conditions: JoinConditionModel[] = suggestion.conditions.map((cond) => {
        const leftParts = cond.leftColumn.split('.')
        const rightParts = cond.rightColumn.split('.')

        const leftTableRaw = leftParts[0] ?? ''
        const leftColumnName = leftParts.slice(1).join('.') || leftTableRaw
        const rightTableRaw = rightParts[0] ?? ''
        const rightColumnName = rightParts.slice(1).join('.') || rightTableRaw

        const leftAlias = resolveAlias(leftTableRaw)
        const rightAlias = resolveAlias(rightTableRaw)

        return {
          left: {
            tableAlias: leftAlias,
            columnName: leftColumnName,
          },
          operator: (cond.operator as JoinConditionModel['operator']) || '=',
          right: {
            tableAlias: rightAlias,
            columnName: rightColumnName,
          },
        }
      })

      const targetTable =
        this.selectedTables.find(
          (t) => t.name === suggestion.toTable || t.alias === suggestion.toTable
        ) || null

      const targetSchema =
        targetTable?.schema ||
        resolveSchema(suggestion.fromTable) ||
        this.selectedTables[0]?.schema ||
        'public'

      return {
        type: normalizeJoinType(suggestion.joinType),
        table: {
          schema: targetSchema,
          name: targetTable?.name || suggestion.toTable,
          alias: targetTable?.alias || resolveAlias(suggestion.toTable),
        },
        conditions,
        conditionLogic: 'AND',
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
     * LIMITを更新
     */
    updateLimit(limit: number | null) {
      this.limit = limit
      this.regenerateSql()
    },

    /**
     * OFFSETを更新
     */
    updateOffset(offset: number | null) {
      this.offset = offset
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
      // 選択されなくなったテーブル（エイリアス）を参照するJOINを削除
      const currentAliases = new Set(this.selectedTables.map(t => t.alias))

      // Remove any JOIN where the joined table (target) is no longer selected
      this.joins = this.joins.filter(j => currentAliases.has(j.table.alias))

      // Remove conditions referencing removed tables
      this.joins.forEach(join => {
        join.conditions = join.conditions.filter(cond =>
           currentAliases.has(cond.left.tableAlias) && currentAliases.has(cond.right.tableAlias)
        )
      })
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
    async regenerateSql() {
      // バックエンドでのSQL生成
      if (
        this.selectedColumns.length === 0 &&
        this.selectedExpressions.length === 0 &&
        this.selectedExpressionNodes.length === 0
      ) {
        this.generatedSql = ''
        return
      }

      this.isGeneratingSql = true
      this.sqlGenerationError = null

      try {
        const connectionStore = useConnectionStore()
        const windowStore = useWindowStore()
        const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

        if (!connectionId) {
          throw new Error('Connection not selected')
        }

        // this.$state は UIQueryState と互換性があるはず
        // ただし Pinia の $state には余計なプロパティが含まれる可能性があるが、
        // convertToQueryModel は必要なプロパティだけ読み取るので基本的には大丈夫。
        // TSエラーが出る場合はキャストする。
        const queryModel = convertToQueryModel(this.$state as any, connectionId);
        
        // バックエンドAPIを呼び出し
        this.generatedSql = await queryApi.generateSqlFormatted(queryModel, true, this.smartQuote);

        // クエリ解析を実行
        const activeConnection = connectionStore.activeConnection || connectionStore.connections.find(c => c.id === connectionId)
        if (activeConnection) {
          const dialect = activeConnection.type.toLowerCase() // 'postgresql', 'mysql', 'sqlite'
          this.analysisResult = await queryApi.analyzeQuery(this.generatedSql, dialect)
        }
      } catch (error) {
        console.error('Failed to generate SQL:', error)
        this.sqlGenerationError = error instanceof Error ? error.message : 'Unknown error'
        this.generatedSql = ''
        this.analysisResult = null
      } finally {
        this.isGeneratingSql = false
      }
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
      this.tablePositions = {}
      this.selectedColumns = []
      this.selectedExpressions = []
      this.selectedExpressionNodes = []
      this.editingExpressionNode = null
      this.expressionDialogOpen = false
      this.joins = []
      this.whereConditions = []
      this.query = null
      this.generatedSql = ''
      this.queryError = null
      this.sqlGenerationError = null
      this.limit = null
      this.offset = null
      this.analysisResult = null
      this.joinSuggestions = []
      this.isLoadingJoinSuggestions = false
    },

    /**
     * クエリを実行
     */
    async executeQuery() {
      if (!this.canExecuteQuery) return
      if (!this.generatedSql) return

      this.isExecuting = true
      this.queryError = null
      this.queryResult = null
      this.currentPage = 1

      try {
        const connectionStore = useConnectionStore()
        const windowStore = useWindowStore()
        const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId

        if (!connectionId) {
          throw new Error('接続が選択されていません')
        }

        const response = await queryApi.executeQuery({
          connectionId,
          sql: this.generatedSql,
          timeoutSeconds: 30,
        })

        this.executingQueryId = response.queryId
        this.queryResult = response.result
        this.queryInfo = {
          rowCount: response.result.rowCount,
          executionTime: response.result.executionTimeMs,
          lastExecutedAt: new Date(),
        }
        // 履歴に追加
        const { useQueryHistoryStore } = await import('./query-history')
        const historyStore = useQueryHistoryStore()
        historyStore.addHistory({
            connectionId,
            query: this.getSerializableState(),
            sql: this.generatedSql,
            success: true,
            resultCount: response.result.rowCount,
            executionTimeMs: response.result.executionTimeMs || undefined,
        })
      } catch (error) {
        if (typeof error === 'string') {
          // Rust側からのエラーはJSON文字列の可能性が高い
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
           // 通常のJSエラー
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

        // 履歴に追加（失敗）
        const { useQueryHistoryStore } = await import('./query-history')
        const connectionStore = useConnectionStore()
        const windowStore = useWindowStore()
        const connectionId = connectionStore.activeConnection?.id || windowStore.currentConnectionId
        
        if (connectionId) {
            const historyStore = useQueryHistoryStore()
            historyStore.addHistory({
                connectionId,
                query: this.getSerializableState(),
                sql: this.generatedSql,
                success: false,
                errorMessage: this.queryError?.message || 'Unknown error'
            })
        }
      } finally {
        this.isExecuting = false
        this.executingQueryId = null
      }
    },

    /**
     * 実行中のクエリをキャンセル
     */
    async cancelQuery() {
      if (!this.executingQueryId) return

      try {
        await queryApi.cancelQuery(this.executingQueryId)
      } catch (error) {
        console.error('Failed to cancel query:', error)
      }
    },

    /**
     * 現在ページを設定
     */
    setCurrentPage(page: number) {
      this.currentPage = page
    },

    /**
     * ページサイズを設定
     */
    setPageSize(size: number) {
      this.pageSize = size
      this.currentPage = 1
    },

    /**
     * 結果をクリア
     */
    clearResult() {
      this.queryResult = null
      this.currentPage = 1
      this.queryError = null
    },

    setSmartQuote(enabled: boolean) {
      this.smartQuote = enabled
      this.regenerateSql()
    },

    /**
     * テーブル位置をまとめて設定
     */
    setTablePositions(positions: Record<string, { x: number; y: number }>) {
      this.tablePositions = { ...positions }
    },

    /**
     * 保存可能な状態を取得
     */
    getSerializableState(): SerializableQueryState {
      const positionsByAlias: Record<string, { x: number; y: number }> = {}
      this.selectedTables.forEach((table) => {
        const pos = this.tablePositions[table.id]
        if (pos) {
          positionsByAlias[table.alias] = { ...pos }
        }
      })

      return {
        selectedTables: JSON.parse(JSON.stringify(this.selectedTables)),
        tablePositions: positionsByAlias,
        selectedColumns: JSON.parse(JSON.stringify(this.selectedColumns)),
        selectedExpressions: JSON.parse(JSON.stringify(this.selectedExpressions)),
        selectedExpressionNodes: JSON.parse(JSON.stringify(this.selectedExpressionNodes)),
        whereConditions: JSON.parse(JSON.stringify(this.whereConditions)),
        groupByColumns: JSON.parse(JSON.stringify(this.groupByColumns)),
        joins: JSON.parse(JSON.stringify(this.joins)),
        orderByColumns: JSON.parse(JSON.stringify(this.orderByColumns)),
        limit: this.limit,
        offset: this.offset,
        smartQuote: this.smartQuote,
      }
    },

    /**
     * 状態を復元
     */
    loadState(state: SerializableQueryState) {
      this.resetQuery()
      
      this.selectedTables = state.selectedTables || []
      const restoredPositions: Record<string, { x: number; y: number }> = {}

      if (state.tablePositions) {
        Object.entries(state.tablePositions).forEach(([key, position]) => {
          const table = this.selectedTables.find(
            (t) => t.alias === key || t.id === key
          )
          if (table && position) {
            restoredPositions[table.id] = { ...position }
          }
        })
      }

      this.tablePositions = restoredPositions
      this.selectedColumns = state.selectedColumns || []
      this.selectedExpressions = state.selectedExpressions || []
      this.selectedExpressionNodes = state.selectedExpressionNodes || []
      this.whereConditions = state.whereConditions || []
      this.groupByColumns = state.groupByColumns || []
      this.joins = state.joins || []
      this.orderByColumns = state.orderByColumns || []
      this.limit = state.limit || null
      this.offset = state.offset || null
      this.smartQuote = state.smartQuote ?? true
      
      this.regenerateSql()
    }
  },
})
