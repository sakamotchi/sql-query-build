import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { queryApi } from '~/api/query'
import { sqlEditorApi } from '~/api/sql-editor'

vi.mock('~/api/query', () => ({
  queryApi: {
    executeQuery: vi.fn(),
    cancelQuery: vi.fn(),
  },
}))

vi.mock('~/api/sql-editor', () => ({
  sqlEditorApi: {
    saveQuery: vi.fn(),
    loadQuery: vi.fn(),
    listQueries: vi.fn(),
    searchQueries: vi.fn(),
    deleteQuery: vi.fn(),
    listFolders: vi.fn(),
    moveQuery: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    addHistory: vi.fn(),
    getHistories: vi.fn(),
    deleteHistory: vi.fn(),
  },
}))

describe('SqlEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(sqlEditorApi.listQueries).mockResolvedValue([])
    vi.mocked(sqlEditorApi.listFolders).mockResolvedValue([])
    vi.mocked(sqlEditorApi.getHistories).mockResolvedValue([])
    vi.mocked(sqlEditorApi.addHistory).mockImplementation(async (request) => ({
      id: 'history-1',
      connectionId: request.connectionId,
      sql: request.sql,
      executedAt: new Date().toISOString(),
      executionTimeMs: request.executionTimeMs,
      status: request.status,
      rowCount: request.rowCount,
      errorMessage: request.errorMessage,
    }))
  })

  it('初期状態が正しい', () => {
    const store = useSqlEditorStore()
    expect(store.connectionId).toBeNull()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.isExecuting).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
    expect(store.executingQueryId).toBeNull()
    expect(store.selectionSql).toBeNull()
    expect(store.savedQueries).toEqual([])
    expect(store.currentQuery).toBeNull()
    expect(store.isSavedQueriesLoading).toBe(false)
    expect(store.savedQueryError).toBeNull()
    expect(store.folders).toEqual([])
    expect(store.expandedFolders.size).toBe(0)
    expect(store.isSaveDialogOpen).toBe(false)
    expect(store.editingQueryId).toBeNull()
    expect(store.histories).toEqual([])
    expect(store.isLoadingHistories).toBe(false)
    expect(store.historySearchKeyword).toBe('')
    expect(store.historySuccessOnly).toBe(false)
  })

  it('setConnectionでconnectionIdが設定される', () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    expect(store.connectionId).toBe('conn-1')
  })

  it('updateSqlでSQLが更新される', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')
    expect(store.sql).toBe('SELECT 1')
    expect(store.isDirty).toBe(true)
  })

  it('resetで状態がリセットされる', () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT 1')
    store.reset()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })

  it('canExecuteはsql非空かつ非実行中のときtrue', () => {
    const store = useSqlEditorStore()
    expect(store.canExecute).toBe(false)
    store.updateSql('SELECT 1')
    expect(store.canExecute).toBe(true)
    store.isExecuting = true
    expect(store.canExecute).toBe(false)
  })

  it('接続なしでexecuteQueryするとエラーになる', async () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')

    await store.executeQuery()

    expect(store.error?.message).toBe('接続が選択されていません')
    expect(store.isExecuting).toBe(false)
  })

  it('選択範囲が空の場合はエラーになる', async () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT 1')
    store.setSelectionSql('   ')

    await store.executeQuery()

    expect(store.error?.message).toBe('選択範囲が空です')
    expect(store.isExecuting).toBe(false)
  })

  it('executeQueryが成功すると結果が保存される', async () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT 1')

    vi.mocked(queryApi.executeQuery).mockResolvedValueOnce({
      queryId: 'q-1',
      result: {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 12,
        warnings: [],
      },
    })

    await store.executeQuery()

    expect(store.result).toBeTruthy()
    expect(store.error).toBeNull()
    expect(store.isExecuting).toBe(false)
  })

  it('executeQueryがJSONエラーを受け取った場合はパースされる', async () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT * FROM')

    vi.mocked(queryApi.executeQuery).mockRejectedValueOnce(
      JSON.stringify({ code: 'syntax_error', message: 'Syntax error', details: { line: 1 } })
    )

    await store.executeQuery()

    expect(store.error).toMatchObject({
      code: 'syntax_error',
      message: 'Syntax error',
      details: { line: 1 },
    })
  })

  it('cancelQueryでキャンセル状態になる', async () => {
    const store = useSqlEditorStore()
    store.isExecuting = true
    store.executingQueryId = 'q-1'

    await store.cancelQuery()

    expect(store.isExecuting).toBe(false)
    expect(store.error?.code).toBe('query_cancelled')
    expect(queryApi.cancelQuery).toHaveBeenCalledWith('q-1')
  })

  it('履歴をキーワードでフィルタできる', () => {
    const store = useSqlEditorStore()
    store.histories = [
      {
        id: '1',
        connectionId: 'conn-1',
        sql: 'SELECT * FROM users',
        executedAt: '2026-01-18T00:00:00Z',
        executionTimeMs: 10,
        status: 'success',
      },
      {
        id: '2',
        connectionId: 'conn-1',
        sql: 'SELECT * FROM orders',
        executedAt: '2026-01-18T00:01:00Z',
        executionTimeMs: 12,
        status: 'success',
      },
    ]

    store.setHistorySearchKeyword('users')

    expect(store.filteredHistories).toHaveLength(1)
    expect(store.filteredHistories[0]?.sql).toContain('users')
  })

  it('履歴を成功のみでフィルタできる', () => {
    const store = useSqlEditorStore()
    store.histories = [
      {
        id: '1',
        connectionId: 'conn-1',
        sql: 'SELECT * FROM users',
        executedAt: '2026-01-18T00:00:00Z',
        executionTimeMs: 10,
        status: 'success',
      },
      {
        id: '2',
        connectionId: 'conn-1',
        sql: 'INVALID SQL',
        executedAt: '2026-01-18T00:01:00Z',
        executionTimeMs: 5,
        status: 'error',
        errorMessage: 'syntax error',
      },
    ]

    store.setHistorySuccessOnly(true)

    expect(store.filteredHistories).toHaveLength(1)
    expect(store.filteredHistories[0]?.status).toBe('success')
  })

  it('保存クエリ一覧を読み込める', async () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')

    const mockQueries = [
      {
        id: '1',
        connectionId: 'conn-1',
        name: 'Test Query',
        description: 'Test',
        tags: ['test'],
        createdAt: '2026-01-18T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z',
      },
    ]

    vi.mocked(sqlEditorApi.listQueries).mockResolvedValueOnce(mockQueries)

    await store.loadSavedQueries()

    expect(store.savedQueries).toEqual(mockQueries)
    expect(sqlEditorApi.listQueries).toHaveBeenCalledWith('conn-1')
  })

  it('クエリを保存できる', async () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT * FROM users')

    const mockSaved = {
      id: '1',
      connectionId: 'conn-1',
      name: 'New Query',
      description: 'Test',
      sql: 'SELECT * FROM users',
      tags: ['test'],
      createdAt: '2026-01-18T00:00:00Z',
      updatedAt: '2026-01-18T00:00:00Z',
    }

    vi.mocked(sqlEditorApi.saveQuery).mockResolvedValueOnce(mockSaved)
    vi.mocked(sqlEditorApi.listQueries).mockResolvedValueOnce([])

    const result = await store.saveCurrentQuery({
      connectionId: 'conn-1',
      name: 'New Query',
      description: 'Test',
      sql: 'SELECT * FROM users',
      tags: ['test'],
    })

    expect(result).toEqual(mockSaved)
    expect(store.currentQuery).toEqual(mockSaved)
    expect(store.isDirty).toBe(false)
    expect(sqlEditorApi.saveQuery).toHaveBeenCalled()
  })

  it('queryTreeがフォルダとクエリを正しく構築する', () => {
    const store = useSqlEditorStore()
    store.folders = ['/開発環境', '/開発環境/ユーザー管理']
    store.savedQueries = [
      {
        id: 'q1',
        connectionId: 'conn-1',
        name: 'Query 1',
        description: '',
        tags: [],
        folderPath: '/開発環境/ユーザー管理',
        createdAt: '2026-01-25T00:00:00Z',
        updatedAt: '2026-01-25T00:00:00Z',
      },
      {
        id: 'q2',
        connectionId: 'conn-1',
        name: 'Query 2',
        description: '',
        tags: [],
        folderPath: null,
        createdAt: '2026-01-25T00:00:00Z',
        updatedAt: '2026-01-25T00:00:00Z',
      },
    ]

    const tree = store.queryTree
    expect(tree.some((node) => node.type === 'folder' && node.path === '/開発環境')).toBe(true)
    expect(tree.some((node) => node.type === 'query' && node.path === 'q2')).toBe(true)
  })

  it('toggleFolderExpansionで展開状態を切り替えられる', () => {
    const store = useSqlEditorStore()
    store.toggleFolderExpansion('/開発環境')
    expect(store.expandedFolders.has('/開発環境')).toBe(true)
    store.toggleFolderExpansion('/開発環境')
    expect(store.expandedFolders.has('/開発環境')).toBe(false)
  })

  it('moveSavedQueryでAPIが呼ばれる', async () => {
    const store = useSqlEditorStore()
    store.connectionId = 'conn-1'
    vi.mocked(sqlEditorApi.listQueries).mockResolvedValueOnce([])
    vi.mocked(sqlEditorApi.listFolders).mockResolvedValueOnce(['/開発環境'])

    await store.moveSavedQuery('q1', '/開発環境')

    expect(sqlEditorApi.moveQuery).toHaveBeenCalledWith('q1', '/開発環境')
    expect(sqlEditorApi.listQueries).toHaveBeenCalledWith('conn-1')
    expect(sqlEditorApi.listFolders).toHaveBeenCalled()
  })

  it('deleteFolderはクエリが含まれる場合APIを呼ばない', async () => {
    const store = useSqlEditorStore()
    store.savedQueries = [
      {
        id: 'q1',
        connectionId: 'conn-1',
        name: 'Query 1',
        description: '',
        tags: [],
        folderPath: '/開発環境',
        createdAt: '2026-01-25T00:00:00Z',
        updatedAt: '2026-01-25T00:00:00Z',
      },
    ]

    await store.deleteFolder('/開発環境')

    expect(sqlEditorApi.deleteFolder).not.toHaveBeenCalled()
  })
})
