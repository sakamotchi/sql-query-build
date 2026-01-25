import { defineStore } from 'pinia'
import { format as formatSql } from 'sql-formatter'
import { useConnectionStore } from '~/stores/connection'
import { queryApi } from '~/api/query'
import { sqlEditorApi } from '~/api/sql-editor'
import type {
  AddSqlEditorHistoryRequest,
  SaveQueryRequest,
  SavedQuery,
  SavedQueryMetadata,
  SqlEditorState,
  SqlEditorHistoryEntry,
  SqlEditorTab,
  TreeNode,
} from '~/types/sql-editor'
import type { QueryExecuteError } from '~/types/query-result'

let latestExecutionId = 0
const MAX_HISTORY_COUNT = 1000
const PANEL_HEIGHT_STORAGE_KEY = 'sql-editor-panel-height-percent'
const LEFT_PANEL_VISIBLE_STORAGE_KEY = 'sql-editor-left-panel-visible'
const SAVED_PANEL_OPEN_STORAGE_KEY = 'sql-editor-saved-panel-open'
const HISTORY_PANEL_OPEN_STORAGE_KEY = 'sql-editor-history-panel-open'
const DEFAULT_PANEL_HEIGHT_PERCENT = 55
const MIN_PANEL_HEIGHT_PERCENT = 20
const MAX_PANEL_HEIGHT_PERCENT = 80

const createTabId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const createEditorTab = (name: string): SqlEditorTab => ({
  id: createTabId(),
  name,
  sql: '',
  isDirty: false,
  result: null,
  error: null,
  selectionSql: null,
  currentQuery: null,
  createdAt: new Date().toISOString(),
})

const clampPanelHeight = (value: number) =>
  Math.min(Math.max(value, MIN_PANEL_HEIGHT_PERCENT), MAX_PANEL_HEIGHT_PERCENT)

export const useSqlEditorStore = defineStore('sql-editor', {
  state: (): SqlEditorState => {
    const initialTab = createEditorTab('Untitled 1')

    return {
      connectionId: null,
      sql: initialTab.sql,
      isDirty: initialTab.isDirty,
      isExecuting: false,
      result: initialTab.result,
      error: initialTab.error,
      executingQueryId: null,
      selectionSql: initialTab.selectionSql,
      savedQueries: [],
      currentQuery: initialTab.currentQuery,
      isSavedQueriesLoading: false,
      savedQueryError: null,
      savedQuerySqlCache: {},
      folders: [],
      expandedFolders: new Set(),
      isSaveDialogOpen: false,
      editingQueryId: null,
      histories: [],
      isLoadingHistories: false,
      historySearchKeyword: '',
      historySuccessOnly: false,
      tabs: [initialTab],
      activeTabId: initialTab.id,
      nextTabIndex: 2,
      editorPanelHeightPercent: DEFAULT_PANEL_HEIGHT_PERCENT,
      formatRequestId: 0,
      pendingCloseTabId: null,
      executingTabId: null,
      isLeftPanelVisible: true,
      isSavedPanelOpen: true,
      isHistoryPanelOpen: true,
    }
  },

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
     * アクティブなタブ
     */
    activeTab(state): SqlEditorTab | null {
      if (!state.activeTabId) return null
      return state.tabs.find((tab) => tab.id === state.activeTabId) || null
    },

    /**
     * 未保存の変更があるか
     */
    hasUnsavedChanges(state): boolean {
      return state.tabs.some((tab) => tab.isDirty)
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

    /**
     * フラットなクエリ一覧から階層ツリー構造を生成
     */
    queryTree(state): TreeNode[] {
      const root: TreeNode[] = []
      const folderMap = new Map<string, TreeNode>()

      for (const folderPath of state.folders) {
        const parts = folderPath.split('/').filter(Boolean)
        let currentPath = ''
        let parent = root

        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

          if (!folderMap.has(currentPath)) {
            const folderNode: TreeNode = {
              type: 'folder',
              path: currentPath,
              name: part,
              children: [],
              expanded: state.expandedFolders.has(currentPath),
              queryCount: 0,
            }
            folderMap.set(currentPath, folderNode)
            parent.push(folderNode)
            parent = folderNode.children!
          } else {
            parent = folderMap.get(currentPath)!.children!
          }
        }
      }

      for (const query of state.savedQueries) {
        const queryNode: TreeNode = {
          type: 'query',
          path: query.id,
          name: query.name,
          query,
        }

        if (query.folderPath) {
          const folder = folderMap.get(query.folderPath)
          if (folder) {
            folder.children!.push(queryNode)
            folder.queryCount = (folder.queryCount || 0) + 1
          } else {
            root.push(queryNode)
          }
        } else {
          root.push(queryNode)
        }
      }

      const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
        nodes.forEach((node) => {
          if (node.children) {
            sortNodes(node.children)
          }
        })
      }
      sortNodes(root)

      return root
    },

    /**
     * 指定パスのフォルダノードを取得
     */
    getFolderByPath(): (path: string) => TreeNode | null {
      return (path: string) => {
        const findFolder = (nodes: TreeNode[]): TreeNode | null => {
          for (const node of nodes) {
            if (node.type === 'folder' && node.path === path) {
              return node
            }
            if (node.children) {
              const found = findFolder(node.children)
              if (found) return found
            }
          }
          return null
        }
        return findFolder(this.queryTree)
      }
    },

    /**
     * 検索・フィルタ適用済みの履歴一覧
     */
    filteredHistories(state): SqlEditorHistoryEntry[] {
      const keyword = state.historySearchKeyword.trim().toLowerCase()
      let filtered = state.histories

      if (keyword) {
        filtered = filtered.filter((history) =>
          history.sql.toLowerCase().includes(keyword)
        )
      }

      if (state.historySuccessOnly) {
        filtered = filtered.filter((history) => history.status === 'success')
      }

      return filtered
    },
  },

  actions: {
    /**
     * 接続を設定
     */
    setConnection(connectionId: string) {
      this.connectionId = connectionId
      this.isExecuting = false
      this.executingQueryId = null
      this.executingTabId = null
      this.savedQueries = []
      this.savedQuerySqlCache = {}
      this.folders = []
      this.currentQuery = null
      this.savedQueryError = null
      this.isSaveDialogOpen = false
      this.editingQueryId = null
      this.pendingCloseTabId = null
      this.histories = []
      this.isLoadingHistories = false
      this.historySearchKeyword = ''
      this.historySuccessOnly = false
      this.initializeTabs()
      void this.loadSavedQueries()
      void this.fetchFolders()
      void this.fetchHistories()
    },

    initializeTabs() {
      const initialTab = createEditorTab('Untitled 1')
      this.tabs = [initialTab]
      this.activeTabId = initialTab.id
      this.nextTabIndex = 2
      this.applyTabToState(initialTab)
    },

    applyTabToState(tab: SqlEditorTab | null) {
      if (!tab) return
      this.sql = tab.sql
      this.isDirty = tab.isDirty
      this.result = tab.result
      this.error = tab.error
      this.selectionSql = tab.selectionSql
      this.currentQuery = tab.currentQuery
    },

    syncActiveTabFromState() {
      const tab = this.activeTab
      if (!tab) return
      tab.sql = this.sql
      tab.isDirty = this.isDirty
      tab.result = this.result
      tab.error = this.error
      tab.selectionSql = this.selectionSql
      tab.currentQuery = this.currentQuery
    },

    addTab(name?: string) {
      const tabName = name?.trim() ? name.trim() : `Untitled ${this.nextTabIndex}`
      const newTab = createEditorTab(tabName)
      this.tabs.push(newTab)
      this.nextTabIndex += 1
      this.switchTab(newTab.id)
    },

    switchTab(tabId: string) {
      if (this.activeTabId === tabId) return
      const targetTab = this.tabs.find((tab) => tab.id === tabId)
      if (!targetTab) return

      this.syncActiveTabFromState()
      this.activeTabId = tabId
      this.applyTabToState(targetTab)
    },

    closeTab(tabId: string) {
      const index = this.tabs.findIndex((tab) => tab.id === tabId)
      if (index === -1) return

      const wasActive = this.activeTabId === tabId
      this.tabs.splice(index, 1)
      if (this.pendingCloseTabId === tabId) {
        this.pendingCloseTabId = null
      }

      if (this.tabs.length === 0) {
        const newTab = createEditorTab(`Untitled ${this.nextTabIndex}`)
        this.nextTabIndex += 1
        this.tabs = [newTab]
        this.activeTabId = newTab.id
        this.applyTabToState(newTab)
        return
      }

      if (wasActive) {
        const nextIndex = Math.min(index, this.tabs.length - 1)
        const nextTab = this.tabs[nextIndex]
        if (nextTab) {
          this.activeTabId = nextTab.id
          this.applyTabToState(nextTab)
        }
      }
    },

    renameTab(tabId: string, name: string) {
      const tab = this.tabs.find((target) => target.id === tabId)
      if (!tab) return
      tab.name = name
    },

    setCursorPosition(position: { lineNumber: number; column: number } | null) {
      const tab = this.activeTab
      if (!tab) return
      tab.cursorPosition = position ?? undefined
    },

    requestFormat() {
      this.formatRequestId += 1
    },

    formatSqlText(sql: string): string | null {
      if (!sql.trim()) return null
      try {
        return formatSql(sql, {
          language: 'postgresql',
          keywordCase: 'upper',
          indentStyle: 'standard',
          tabWidth: 2,
        })
      } catch (error) {
        console.error('SQL format error:', error)
        return null
      }
    },

    setEditorPanelHeightPercent(value: number) {
      this.editorPanelHeightPercent = clampPanelHeight(value)
    },

    loadEditorPanelHeight() {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(PANEL_HEIGHT_STORAGE_KEY)
      if (!stored) return
      const parsed = Number(stored)
      if (Number.isNaN(parsed)) return
      this.editorPanelHeightPercent = clampPanelHeight(parsed)
    },

    persistEditorPanelHeight() {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(
        PANEL_HEIGHT_STORAGE_KEY,
        String(this.editorPanelHeightPercent)
      )
    },

    toggleLeftPanelVisibility() {
      this.isLeftPanelVisible = !this.isLeftPanelVisible
      this.persistLeftPanelVisibility()
    },

    loadLeftPanelVisibility() {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(LEFT_PANEL_VISIBLE_STORAGE_KEY)
      if (stored === null) return
      this.isLeftPanelVisible = stored === 'true'
    },

    persistLeftPanelVisibility() {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(
        LEFT_PANEL_VISIBLE_STORAGE_KEY,
        String(this.isLeftPanelVisible)
      )
    },

    toggleSavedPanelOpen() {
      this.isSavedPanelOpen = !this.isSavedPanelOpen
      this.persistSavedPanelOpen()
    },

    loadSavedPanelOpen() {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(SAVED_PANEL_OPEN_STORAGE_KEY)
      if (stored === null) return
      this.isSavedPanelOpen = stored === 'true'
    },

    persistSavedPanelOpen() {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(
        SAVED_PANEL_OPEN_STORAGE_KEY,
        String(this.isSavedPanelOpen)
      )
    },

    toggleHistoryPanelOpen() {
      this.isHistoryPanelOpen = !this.isHistoryPanelOpen
      this.persistHistoryPanelOpen()
    },

    loadHistoryPanelOpen() {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(HISTORY_PANEL_OPEN_STORAGE_KEY)
      if (stored === null) return
      this.isHistoryPanelOpen = stored === 'true'
    },

    persistHistoryPanelOpen() {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(
        HISTORY_PANEL_OPEN_STORAGE_KEY,
        String(this.isHistoryPanelOpen)
      )
    },

    setPendingCloseTab(tabId: string | null) {
      this.pendingCloseTabId = tabId
    },

    clearPendingCloseTab() {
      this.pendingCloseTabId = null
    },

    async saveActiveTabWithoutDialog(): Promise<SavedQuery | null> {
      if (!this.connectionId) {
        throw new Error('接続が選択されていません')
      }
      if (!this.currentQuery) return null

      const request: SaveQueryRequest = {
        id: this.currentQuery.id,
        connectionId: this.currentQuery.connectionId,
        name: this.currentQuery.name,
        description: this.currentQuery.description,
        sql: this.sql,
        tags: this.currentQuery.tags,
        folderPath: this.currentQuery.folderPath ?? null,
      }

      return await this.saveCurrentQuery(request)
    },

    /**
     * SQL文字列を更新
     */
    updateSql(sql: string) {
      if (this.sql === sql) return
      this.sql = sql
      this.isDirty = true
      const tab = this.activeTab
      if (tab) {
        tab.sql = sql
        tab.isDirty = true
      }
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
      this.executingTabId = null
      const tab = this.activeTab
      if (tab) {
        tab.sql = ''
        tab.isDirty = false
        tab.result = null
        tab.error = null
        tab.selectionSql = null
        tab.currentQuery = null
        tab.savedQueryId = undefined
      }
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
     * フォルダ一覧を取得
     */
    async fetchFolders() {
      this.savedQueryError = null

      try {
        this.folders = await sqlEditorApi.listFolders()
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to fetch folders:', error)
      }
    },

    /**
     * フォルダを作成
     */
    async createFolder(folderPath: string): Promise<void> {
      if (this.folders.includes(folderPath)) {
        throw new Error(`フォルダは既に存在します: ${folderPath}`)
      }

      await sqlEditorApi.createFolder(folderPath)
      await this.fetchFolders()
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
          const tab = this.activeTab
          if (tab) {
            tab.currentQuery = saved
            tab.savedQueryId = saved.id
            tab.sql = saved.sql
            tab.isDirty = false
            tab.name = saved.name
          }
        } else if (this.currentQuery?.id === saved.id) {
          this.currentQuery = {
            ...this.currentQuery,
            name: saved.name,
            description: saved.description,
            tags: saved.tags,
            updatedAt: saved.updatedAt,
          }
          const tab = this.activeTab
          if (tab && tab.savedQueryId === saved.id) {
            tab.currentQuery = this.currentQuery
            tab.name = saved.name
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
        const tab = this.activeTab
        if (tab) {
          tab.sql = query.sql
          tab.isDirty = false
          tab.selectionSql = null
          tab.currentQuery = query
          tab.savedQueryId = query.id
          tab.name = query.name
        }
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
          const tab = this.activeTab
          if (tab) {
            tab.currentQuery = null
            tab.savedQueryId = undefined
          }
        }
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to delete query:', error)
        throw error
      }
    },

    /**
     * クエリを指定フォルダに移動
     */
    async moveSavedQuery(queryId: string, targetFolderPath: string | null) {
      this.isSavedQueriesLoading = true
      this.savedQueryError = null

      try {
        await sqlEditorApi.moveQuery(queryId, targetFolderPath)
        await this.loadSavedQueries()
        await this.fetchFolders()
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to move query:', error)
        throw error
      } finally {
        this.isSavedQueriesLoading = false
      }
    },

    /**
     * フォルダ名を変更
     */
    async renameFolder(oldPath: string, newPath: string) {
      if (this.folders.includes(newPath)) {
        return
      }

      this.isSavedQueriesLoading = true
      this.savedQueryError = null

      try {
        await sqlEditorApi.renameFolder(oldPath, newPath)
        await Promise.all([this.fetchFolders(), this.loadSavedQueries()])

        if (this.expandedFolders.has(oldPath)) {
          this.expandedFolders.delete(oldPath)
          this.expandedFolders.add(newPath)
          this.saveExpandedFolders()
        }
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to rename folder:', error)
        throw error
      } finally {
        this.isSavedQueriesLoading = false
      }
    },

    /**
     * 空のフォルダを削除
     */
    async deleteFolder(folderPath: string) {
      const queriesInFolder = this.savedQueries.filter(
        (query) =>
          query.folderPath === folderPath ||
          query.folderPath?.startsWith(`${folderPath}/`)
      )

      if (queriesInFolder.length > 0) {
        return
      }

      this.isSavedQueriesLoading = true
      this.savedQueryError = null

      try {
        await sqlEditorApi.deleteFolder(folderPath)
        await this.fetchFolders()
        this.expandedFolders.delete(folderPath)
        this.saveExpandedFolders()
      } catch (error) {
        this.savedQueryError = normalizeSavedQueryError(error)
        console.error('Failed to delete folder:', error)
        throw error
      } finally {
        this.isSavedQueriesLoading = false
      }
    },

    /**
     * フォルダの展開/折りたたみを切り替え
     */
    toggleFolderExpansion(folderPath: string) {
      if (this.expandedFolders.has(folderPath)) {
        this.expandedFolders.delete(folderPath)
      } else {
        this.expandedFolders.add(folderPath)
      }

      this.saveExpandedFolders()
    },

    /**
     * 展開状態をLocalStorageに保存
     */
    saveExpandedFolders() {
      if (typeof localStorage === 'undefined') return
      try {
        const expanded = Array.from(this.expandedFolders)
        localStorage.setItem('sqlEditorExpandedFolders', JSON.stringify(expanded))
      } catch (error) {
        console.error('Failed to save expanded folders:', error)
      }
    },

    /**
     * 展開状態をLocalStorageから復元
     */
    loadExpandedFolders() {
      if (typeof localStorage === 'undefined') return
      try {
        const saved = localStorage.getItem('sqlEditorExpandedFolders')
        if (saved) {
          const expanded = JSON.parse(saved) as string[]
          this.expandedFolders = new Set(expanded)
        }
      } catch (error) {
        console.error('Failed to load expanded folders:', error)
        this.expandedFolders = new Set()
      }
    },

    /**
     * ドラッグ&ドロップによるクエリ移動
     */
    async handleQueryDrop(queryId: string, targetFolderPath: string | null) {
      const query = this.savedQueries.find((item) => item.id === queryId)
      if (!query) {
        console.error('Query not found:', queryId)
        return
      }

      if (query.folderPath === targetFolderPath) {
        return
      }

      if (targetFolderPath && !this.folders.includes(targetFolderPath)) {
        console.warn('Target folder not found:', targetFolderPath)
        return
      }

      await this.moveSavedQuery(queryId, targetFolderPath)
    },

    /**
     * 保存クエリを直接実行
     */
    async executeSavedQuery(id: string) {
      const query = await this.fetchSavedQuery(id)
      await this.executeSqlText(query.sql)
    },

    updateTabExecutionState(
      tabId: string | null,
      result: SqlEditorTab['result'],
      error: SqlEditorTab['error']
    ) {
      if (!tabId) return
      const tab = this.tabs.find((target) => target.id === tabId)
      if (!tab) return

      tab.result = result
      tab.error = error

      if (this.activeTabId === tabId) {
        this.result = result
        this.error = error
      }
    },

    /**
     * SQL文字列を実行
     */
    async executeSqlText(sqlToExecute: string, emptyMessage = '実行するSQLが空です') {
      if (this.isExecuting) return
      if (!this.connectionId) {
        const connectionError = createClientError('接続が選択されていません')
        this.error = connectionError
        const tab = this.activeTab
        if (tab) {
          tab.error = connectionError
        }
        return
      }

      const trimmedSql = sqlToExecute.trim()
      if (!trimmedSql) {
        const emptyError = createClientError(emptyMessage)
        this.error = emptyError
        const tab = this.activeTab
        if (tab) {
          tab.error = emptyError
        }
        return
      }

      const executionId = ++latestExecutionId
      const targetTabId = this.activeTabId
      this.isExecuting = true
      this.executingQueryId = null
      this.executingTabId = targetTabId
      this.updateTabExecutionState(targetTabId, null, null)
      const startTime = Date.now()

      try {
        const response = await queryApi.executeQuery({
          connectionId: this.connectionId,
          sql: trimmedSql,
          timeoutSeconds: 30,
        })

        if (executionId !== latestExecutionId || !this.isExecuting) {
          return
        }

        this.executingQueryId = response.queryId
        this.updateTabExecutionState(targetTabId, response.result, null)
        void this.addHistory({
          connectionId: this.connectionId,
          sql: trimmedSql,
          status: 'success',
          executionTimeMs: Date.now() - startTime,
          rowCount: response.result.rowCount,
        })
      } catch (error) {
        if (executionId !== latestExecutionId || !this.isExecuting) {
          return
        }
        const normalizedError = normalizeQueryError(error)
        this.updateTabExecutionState(targetTabId, null, normalizedError)
        void this.addHistory({
          connectionId: this.connectionId,
          sql: trimmedSql,
          status: 'error',
          executionTimeMs: Date.now() - startTime,
          errorMessage: normalizedError.message,
        })
      } finally {
        if (executionId === latestExecutionId) {
          this.isExecuting = false
          this.executingQueryId = null
          this.executingTabId = null
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
        const clientError = createClientError(
          selectionSql !== null ? '選択範囲が空です' : '実行するSQLが空です'
        )
        this.error = clientError
        const tab = this.activeTab
        if (tab) {
          tab.error = clientError
        }
        return
      }

      await this.executeSqlText(sqlToExecute)
    },

    /**
     * 履歴を追加（失敗は無視）
     */
    async addHistory(request: AddSqlEditorHistoryRequest) {
      try {
        const history = await sqlEditorApi.addHistory(request)
        this.histories.unshift(history)
        if (this.histories.length > MAX_HISTORY_COUNT) {
          this.histories.length = MAX_HISTORY_COUNT
        }
      } catch (error) {
        console.error('Failed to add history:', error)
      }
    },

    /**
     * 履歴一覧を取得
     */
    async fetchHistories() {
      if (!this.connectionId) return

      this.isLoadingHistories = true
      try {
        this.histories = await sqlEditorApi.getHistories({
          connectionId: this.connectionId,
        })
      } catch (error) {
        console.error('Failed to fetch histories:', error)
        this.histories = []
      } finally {
        this.isLoadingHistories = false
      }
    },

    /**
     * 履歴を読み込み
     */
    async loadHistory(id: string) {
      const history = this.histories.find((entry) => entry.id === id)
      if (!history) {
        throw new Error('履歴が見つかりません')
      }

      this.sql = history.sql
      this.isDirty = false
      this.selectionSql = null
      this.currentQuery = null
      const tab = this.activeTab
      if (tab) {
        tab.sql = history.sql
        tab.isDirty = false
        tab.selectionSql = null
        tab.currentQuery = null
        tab.savedQueryId = undefined
      }
    },

    /**
     * 履歴を削除
     */
    async deleteHistory(id: string) {
      if (!this.connectionId) return
      await sqlEditorApi.deleteHistory(this.connectionId, id)
      this.histories = this.histories.filter((entry) => entry.id !== id)
    },

    /**
     * 履歴検索キーワードを更新
     */
    setHistorySearchKeyword(keyword: string) {
      this.historySearchKeyword = keyword
    },

    /**
     * 成功のみフィルタを更新
     */
    setHistorySuccessOnly(value: boolean) {
      this.historySuccessOnly = value
    },

    /**
     * クエリキャンセル
     */
    async cancelQuery() {
      if (!this.isExecuting) return
      const targetTabId = this.executingTabId ?? this.activeTabId
      this.isExecuting = false
      const cancelledError: QueryExecuteError = {
        code: 'query_cancelled',
        message: 'クエリの実行をキャンセルしました。',
      }
      this.updateTabExecutionState(targetTabId, null, cancelledError)
      this.executingTabId = null

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
      const tab = this.activeTab
      if (tab) {
        tab.selectionSql = selectionSql
      }
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
