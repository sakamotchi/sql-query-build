import { defineStore } from 'pinia'
import { databaseStructureApi } from '@/api/database-structure'
import type {
  Column,
  DatabaseStructure,
  DatabaseStructureSummary,
} from '@/types/database-structure'

interface BackgroundProgress {
  loaded: number
  total: number
}

interface DatabaseStructureState {
  /** 接続IDごとの構造データ（既存互換） */
  structures: Record<string, DatabaseStructure>
  /** 読み込み中の接続ID（全構造） */
  loadingIds: Set<string>
  /** エラー情報 */
  errors: Record<string, string>

  /** 接続IDごとの軽量サマリー */
  summaries: Record<string, DatabaseStructureSummary>
  /** 接続IDごとのテーブルカラムキャッシュ */
  columnCache: Record<string, Record<string, Column[]>>
  /** 読み込み中の接続ID（サマリー） */
  summaryLoadingIds: Set<string>
  /** バックグラウンド取得進捗 */
  backgroundProgress: Record<string, BackgroundProgress>
  /** カラム取得中のキー（connectionId:schema:table） */
  columnLoadingKeys: Set<string>
  /** バックグラウンド取得のキャンセル制御トークン */
  backgroundFetchTokens: Record<string, number>
}

const buildColumnLoadingKey = (connectionId: string, schema: string, table: string): string =>
  `${connectionId}:${schema}:${table}`

const buildColumnCacheKey = (schema: string, table: string): string =>
  `${schema}.${table}`

const inflightColumnRequests = new Map<string, Promise<Column[]>>()

export const useDatabaseStructureStore = defineStore('database-structure', {
  state: (): DatabaseStructureState => ({
    structures: {},
    loadingIds: new Set(),
    errors: {},
    summaries: {},
    columnCache: {},
    summaryLoadingIds: new Set(),
    backgroundProgress: {},
    columnLoadingKeys: new Set(),
    backgroundFetchTokens: {},
  }),

  getters: {
    /**
     * 接続IDから構造を取得
     */
    getStructure:
      (state) =>
      (connectionId: string): DatabaseStructure | null =>
        state.structures[connectionId] || null,

    /**
     * 接続IDからサマリーを取得
     */
    getSummary:
      (state) =>
      (connectionId: string): DatabaseStructureSummary | null =>
        state.summaries[connectionId] || null,

    /**
     * 読み込み中かどうか（全構造）
     */
    isLoading:
      (state) =>
      (connectionId: string): boolean =>
        state.loadingIds.has(connectionId),

    /**
     * 読み込み中かどうか（サマリー）
     */
    isSummaryLoading:
      (state) =>
      (connectionId: string): boolean =>
        state.summaryLoadingIds.has(connectionId),

    /**
     * テーブルカラム取得中かどうか
     */
    isColumnLoading:
      (state) =>
      (connectionId: string, schema: string, table: string): boolean =>
        state.columnLoadingKeys.has(buildColumnLoadingKey(connectionId, schema, table)),

    /**
     * バックグラウンド進捗を取得
     */
    getBackgroundProgress:
      (state) =>
      (connectionId: string): BackgroundProgress | null =>
        state.backgroundProgress[connectionId] || null,

    /**
     * キャッシュ済みカラムを取得
     */
    getCachedColumns:
      (state) =>
      (connectionId: string, schema: string, table: string): Column[] | null => {
        const cache = state.columnCache[connectionId]
        if (!cache) return null
        return cache[buildColumnCacheKey(schema, table)] || null
      },

    /**
     * エラーを取得
     */
    getError:
      (state) =>
      (connectionId: string): string | null =>
        state.errors[connectionId] || null,
  },

  actions: {
    /**
     * データベース構造を取得（既存互換）
     */
    async fetchDatabaseStructure(connectionId: string): Promise<void> {
      if (this.loadingIds.has(connectionId)) return

      this.loadingIds.add(connectionId)
      delete this.errors[connectionId]

      try {
        const structure = await databaseStructureApi.getDatabaseStructure(connectionId)
        this.structures[connectionId] = structure

        // 取得済みカラムをキャッシュにも反映して、補完から共有可能にする
        if (!this.columnCache[connectionId]) {
          this.columnCache[connectionId] = {}
        }
        for (const schema of structure.schemas) {
          for (const table of schema.tables) {
            this.columnCache[connectionId][buildColumnCacheKey(schema.name, table.name)] = table.columns
          }
        }
      } catch (error) {
        console.error('[database-structure store] fetchDatabaseStructure error:', error)
        let errorMessage: string
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else {
          errorMessage = JSON.stringify(error) || 'Unknown error'
        }
        this.errors[connectionId] = errorMessage
        throw error
      } finally {
        this.loadingIds.delete(connectionId)
      }
    },

    /**
     * データベース構造サマリーを取得（Phase 1）
     */
    async fetchDatabaseStructureSummary(connectionId: string): Promise<void> {
      if (this.summaryLoadingIds.has(connectionId)) return

      this.summaryLoadingIds.add(connectionId)
      delete this.errors[connectionId]

      try {
        const summary = await databaseStructureApi.getDatabaseStructureSummary(connectionId)
        this.summaries[connectionId] = summary
      } catch (error) {
        console.error('[database-structure store] fetchDatabaseStructureSummary error:', error)
        let errorMessage: string
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else {
          errorMessage = JSON.stringify(error) || 'Unknown error'
        }
        this.errors[connectionId] = errorMessage
        throw error
      } finally {
        this.summaryLoadingIds.delete(connectionId)
      }
    },

    /**
     * テーブル単位でカラムを取得（オンデマンド/バックグラウンド共通）
     */
    async fetchColumnsForTable(connectionId: string, schema: string, table: string): Promise<Column[]> {
      const cachedColumns = this.getCachedColumns(connectionId, schema, table)
      if (cachedColumns) {
        return cachedColumns
      }

      const loadingKey = buildColumnLoadingKey(connectionId, schema, table)
      const cacheKey = buildColumnCacheKey(schema, table)
      const inflightKey = `${loadingKey}:columns`
      const existingRequest = inflightColumnRequests.get(inflightKey)
      if (existingRequest) {
        return existingRequest
      }

      if (!this.columnCache[connectionId]) {
        this.columnCache[connectionId] = {}
      }
      const connectionColumnCache = this.columnCache[connectionId]

      const request = (async () => {
        this.columnLoadingKeys.add(loadingKey)
        try {
          const columns = await databaseStructureApi.getColumns(connectionId, schema, table)
          connectionColumnCache[cacheKey] = columns
          this.applyColumnsToStructure(connectionId, schema, table, columns)
          return columns
        } finally {
          this.columnLoadingKeys.delete(loadingKey)
          inflightColumnRequests.delete(inflightKey)
        }
      })()

      inflightColumnRequests.set(inflightKey, request)
      return request
    },

    /**
     * バックグラウンドでカラムを順次取得（Phase 2）
     */
    async startBackgroundFetch(connectionId: string): Promise<void> {
      const summary = this.summaries[connectionId]
      if (!summary) return

      const token = Date.now()
      this.backgroundFetchTokens[connectionId] = token

      const tableTargets = summary.schemas
        .filter((schema) => !schema.isSystem)
        .flatMap((schema) =>
          schema.tables.map((table) => ({
            schema: schema.name,
            table: table.name,
          }))
        )

      if (tableTargets.length === 0) {
        delete this.backgroundProgress[connectionId]
        return
      }

      const pendingTargets = tableTargets.filter(
        (target) => !this.getCachedColumns(connectionId, target.schema, target.table)
      )
      let loaded = tableTargets.length - pendingTargets.length

      this.backgroundProgress[connectionId] = {
        loaded,
        total: tableTargets.length,
      }

      for (const target of pendingTargets) {
        if (this.backgroundFetchTokens[connectionId] !== token) {
          return
        }

        try {
          await this.fetchColumnsForTable(connectionId, target.schema, target.table)
        } catch (error) {
          console.warn(
            `[database-structure store] Background column fetch failed: ${target.schema}.${target.table}`,
            error
          )
        }

        loaded += 1
        this.backgroundProgress[connectionId] = {
          loaded,
          total: tableTargets.length,
        }

        // UIのブロッキングを避ける
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      if (this.backgroundFetchTokens[connectionId] === token) {
        delete this.backgroundProgress[connectionId]
      }
    },

    /**
     * バックグラウンド取得を停止
     */
    cancelBackgroundFetch(connectionId?: string): void {
      if (connectionId) {
        this.backgroundFetchTokens[connectionId] = Date.now()
        delete this.backgroundProgress[connectionId]
        return
      }

      for (const id of Object.keys(this.backgroundFetchTokens)) {
        this.backgroundFetchTokens[id] = Date.now()
      }
      this.backgroundProgress = {}
    },

    /**
     * 構造を更新(再取得)
     */
    async refreshDatabaseStructure(connectionId: string): Promise<void> {
      delete this.structures[connectionId]
      await this.fetchDatabaseStructure(connectionId)
    },

    /**
     * キャッシュをクリア
     */
    clearCache(connectionId?: string): void {
      if (connectionId) {
        this.cancelBackgroundFetch(connectionId)
        delete this.structures[connectionId]
        delete this.summaries[connectionId]
        delete this.columnCache[connectionId]
        delete this.errors[connectionId]
        delete this.backgroundFetchTokens[connectionId]
        this.loadingIds.delete(connectionId)
        this.summaryLoadingIds.delete(connectionId)
        for (const key of Array.from(this.columnLoadingKeys)) {
          if (key.startsWith(`${connectionId}:`)) {
            this.columnLoadingKeys.delete(key)
          }
        }
      } else {
        this.cancelBackgroundFetch()
        this.structures = {}
        this.summaries = {}
        this.columnCache = {}
        this.errors = {}
        this.backgroundFetchTokens = {}
        this.loadingIds = new Set()
        this.summaryLoadingIds = new Set()
        this.columnLoadingKeys = new Set()
      }
    },

    /**
     * 取得したカラムを既存構造に反映（後方互換のため）
     */
    applyColumnsToStructure(connectionId: string, schemaName: string, tableName: string, columns: Column[]): void {
      const structure = this.structures[connectionId]
      if (!structure) return

      const schema = structure.schemas.find((item) => item.name === schemaName)
      if (!schema) return

      const table = schema.tables.find((item) => item.name === tableName)
      if (!table) return

      table.columns = columns
    },
  },
})
