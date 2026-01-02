import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSavedQueryStore } from '~/stores/saved-query'
import type { SavedQueryMetadata } from '@/types/saved-query'
import { queryStorageApi } from '@/api/query-storage'

const queryBuilderStoreMock = {
  selectedColumns: [] as Array<unknown>,
  getSerializableState: vi.fn(),
  loadState: vi.fn(),
}

const connectionStoreMock = {
  activeConnection: null as { id: string } | null,
}

const windowStoreMock = {
  currentConnectionId: undefined as string | undefined,
}

const mutationBuilderStoreMock = {
  loadState: vi.fn(),
}

vi.mock('@/api/query-storage', () => ({
  queryStorageApi: {
    searchSavedQueries: vi.fn(),
    saveQuery: vi.fn(),
    loadQuery: vi.fn(),
    deleteQuery: vi.fn(),
  },
}))

vi.mock('@/stores/query-builder', () => ({
  useQueryBuilderStore: () => queryBuilderStoreMock,
}))

vi.mock('@/stores/connection', () => ({
  useConnectionStore: () => connectionStoreMock,
}))

vi.mock('@/stores/window', () => ({
  useWindowStore: () => windowStoreMock,
}))

vi.mock('@/stores/mutation-builder', () => ({
  useMutationBuilderStore: () => mutationBuilderStoreMock,
}))

describe('useSavedQueryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    queryBuilderStoreMock.selectedColumns = []
    queryBuilderStoreMock.getSerializableState.mockReset()
    queryBuilderStoreMock.loadState.mockReset()
    connectionStoreMock.activeConnection = null
    windowStoreMock.currentConnectionId = undefined
    mutationBuilderStoreMock.loadState.mockReset()
  })

  it('初期状態がデフォルト値になる', () => {
    const store = useSavedQueryStore()
    expect(store.queries).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
    expect(store.searchKeyword).toBe('')
    expect(store.selectedTags).toEqual([])
  })

  it('filteredQueries は queries をそのまま返す', () => {
    const store = useSavedQueryStore()
    const mockQueries: SavedQueryMetadata[] = [
      {
        id: '1',
        name: 'Query 1',
        description: 'desc',
        tags: ['tag-a'],
        connectionId: 'conn-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]

    store.queries = mockQueries

    expect(store.filteredQueries).toEqual(mockQueries)
  })

  it('uniqueTags は重複なしのタグ一覧を返す', () => {
    const store = useSavedQueryStore()
    const mockQueries: SavedQueryMetadata[] = [
      {
        id: '1',
        name: 'Query 1',
        description: 'desc',
        tags: ['tag-b', 'tag-a'],
        connectionId: 'conn-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Query 2',
        description: 'desc',
        tags: ['tag-a', 'tag-c'],
        connectionId: 'conn-2',
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      },
    ]

    store.queries = mockQueries

    expect(store.uniqueTags).toEqual(['tag-a', 'tag-b', 'tag-c'])
  })

  it('uniqueTags は空配列の場合も空配列を返す', () => {
    const store = useSavedQueryStore()
    store.queries = []

    expect(store.uniqueTags).toEqual([])
  })

  it('fetchQueries はクエリ一覧を取得できる', async () => {
    const store = useSavedQueryStore()
    const mockQueries: SavedQueryMetadata[] = [
      {
        id: '1',
        name: 'Query 1',
        description: 'desc',
        tags: ['tag-a'],
        connectionId: 'conn-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]
    vi.mocked(queryStorageApi.searchSavedQueries).mockResolvedValue(mockQueries)

    await store.fetchQueries()

    expect(queryStorageApi.searchSavedQueries).toHaveBeenCalledWith({})
    expect(store.queries).toEqual(mockQueries)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('fetchQueries は検索条件付きで取得できる', async () => {
    const store = useSavedQueryStore()
    const request = { keyword: 'users', tags: ['tag-a'] }
    vi.mocked(queryStorageApi.searchSavedQueries).mockResolvedValue([])

    await store.fetchQueries(request)

    expect(queryStorageApi.searchSavedQueries).toHaveBeenCalledWith(request)
  })

  it('fetchQueries はエラー時に error を設定する', async () => {
    const store = useSavedQueryStore()
    vi.mocked(queryStorageApi.searchSavedQueries).mockRejectedValue(new Error('API Error'))

    await store.fetchQueries()

    expect(store.error).toBe('API Error')
    expect(store.isLoading).toBe(false)
  })

  it('fetchQueries はローディング状態を正しく管理する', async () => {
    const store = useSavedQueryStore()
    let resolvePromise: (value: SavedQueryMetadata[]) => void = () => {}
    const pending = new Promise<SavedQueryMetadata[]>((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(queryStorageApi.searchSavedQueries).mockReturnValue(pending)

    const fetchPromise = store.fetchQueries()

    expect(store.isLoading).toBe(true)

    resolvePromise([])
    await fetchPromise

    expect(store.isLoading).toBe(false)
  })

  it('saveCurrentQuery はクエリ未構築時に保存できない', async () => {
    const store = useSavedQueryStore()

    const result = await store.saveCurrentQuery('Name', 'Desc', [])

    expect(result).toBe(false)
    expect(store.error).toBe('クエリが構築されていません。カラムを選択してください。')
    expect(queryStorageApi.saveQuery).not.toHaveBeenCalled()
  })

  it('saveCurrentQuery は接続情報がない場合にエラーになる', async () => {
    const store = useSavedQueryStore()
    const mockState = {
      selectedTables: [],
      selectedColumns: [],
      whereConditions: [],
      groupByColumns: [],
      joins: [],
      orderByColumns: [],
      limit: null,
      offset: null,
      smartQuote: true,
    }
    queryBuilderStoreMock.selectedColumns = [
      { tableId: 't1', tableAlias: 't1', columnName: 'id', columnAlias: null, dataType: 'int' },
    ]
    queryBuilderStoreMock.getSerializableState.mockReturnValue(mockState)

    const result = await store.saveCurrentQuery('Name', 'Desc', [])

    expect(result).toBe(false)
    expect(store.error).toBe('接続情報が見つかりません。データベースに接続してください。')
    expect(queryStorageApi.saveQuery).not.toHaveBeenCalled()
  })

  it('saveCurrentQuery は SELECT クエリを保存できる', async () => {
    const store = useSavedQueryStore()
    const mockState = {
      selectedTables: [],
      selectedColumns: [
        { tableId: 't1', tableAlias: 't1', columnName: 'id', columnAlias: null, dataType: 'int' },
      ],
      whereConditions: [],
      groupByColumns: [],
      joins: [],
      orderByColumns: [],
      limit: null,
      offset: null,
      smartQuote: true,
    }
    queryBuilderStoreMock.selectedColumns = mockState.selectedColumns
    queryBuilderStoreMock.getSerializableState.mockReturnValue(mockState)
    connectionStoreMock.activeConnection = { id: 'conn-1' }
    vi.mocked(queryStorageApi.saveQuery).mockResolvedValue({} as any)
    const fetchSpy = vi.spyOn(store, 'fetchQueries').mockResolvedValue()

    const result = await store.saveCurrentQuery('Query Name', 'Desc', ['tag-a'])

    expect(result).toBe(true)
    expect(queryStorageApi.saveQuery).toHaveBeenCalledWith({
      id: undefined,
      name: 'Query Name',
      description: 'Desc',
      tags: ['tag-a'],
      connectionId: 'conn-1',
      query: mockState,
    })
    expect(fetchSpy).toHaveBeenCalled()
  })

  it.each([
    ['INSERT', 'users'],
    ['UPDATE', 'users'],
    ['DELETE', 'users'],
  ])('saveCurrentQuery は %s クエリを保存できる', async (mutationType, tableName) => {
    const store = useSavedQueryStore()
    const mutationState = {
      mutationType,
      selectedTable: tableName,
      queryModel: null,
      insertInputMode: 'form',
      smartQuote: true,
    }
    vi.mocked(queryStorageApi.saveQuery).mockResolvedValue({} as any)

    const result = await store.saveCurrentQuery(
      'Mutation Query',
      'Desc',
      ['tag-a'],
      undefined,
      mutationState,
      'conn-override'
    )

    expect(result).toBe(true)
    expect(queryStorageApi.saveQuery).toHaveBeenCalledWith({
      id: undefined,
      name: 'Mutation Query',
      description: 'Desc',
      tags: ['tag-a'],
      connectionId: 'conn-override',
      query: mutationState,
    })
  })

  it('saveCurrentQuery はエラー時に false を返す', async () => {
    const store = useSavedQueryStore()
    const mockState = {
      selectedTables: [],
      selectedColumns: [],
      whereConditions: [],
      groupByColumns: [],
      joins: [],
      orderByColumns: [],
      limit: null,
      offset: null,
      smartQuote: true,
    }
    queryBuilderStoreMock.selectedColumns = [
      { tableId: 't1', tableAlias: 't1', columnName: 'id', columnAlias: null, dataType: 'int' },
    ]
    queryBuilderStoreMock.getSerializableState.mockReturnValue(mockState)
    connectionStoreMock.activeConnection = { id: 'conn-1' }
    vi.mocked(queryStorageApi.saveQuery).mockRejectedValue(new Error('Save failed'))

    const result = await store.saveCurrentQuery('Query Name', 'Desc', [])

    expect(result).toBe(false)
    expect(store.error).toBe('Save failed')
  })

  it('loadQuery はクエリ詳細を取得できる', async () => {
    const store = useSavedQueryStore()
    const savedQuery = {
      id: '1',
      name: 'Query 1',
      description: 'desc',
      tags: ['tag-a'],
      connectionId: 'conn-1',
      query: {
        selectedTables: [],
        selectedColumns: [],
        whereConditions: [],
        groupByColumns: [],
        joins: [],
        orderByColumns: [],
        limit: null,
        offset: null,
        smartQuote: true,
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    vi.mocked(queryStorageApi.loadQuery).mockResolvedValue(savedQuery as any)

    const result = await store.loadQuery('1')

    expect(queryStorageApi.loadQuery).toHaveBeenCalledWith('1')
    expect(result).toEqual(savedQuery)
  })

  it('loadQuery はエラー時に error を設定して再スローする', async () => {
    const store = useSavedQueryStore()
    vi.mocked(queryStorageApi.loadQuery).mockRejectedValue(new Error('Load failed'))

    await expect(store.loadQuery('1')).rejects.toThrow('Load failed')
    expect(store.error).toBe('Load failed')
  })

  it('loadQueryToBuilder は SELECT クエリをロードできる', async () => {
    const store = useSavedQueryStore()
    const savedQuery = {
      id: '1',
      name: 'Query 1',
      description: 'desc',
      tags: ['tag-a'],
      connectionId: 'conn-1',
      query: {
        selectedTables: [],
        selectedColumns: [],
        whereConditions: [],
        groupByColumns: [],
        joins: [],
        orderByColumns: [],
        limit: null,
        offset: null,
        smartQuote: true,
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    vi.mocked(queryStorageApi.loadQuery).mockResolvedValue(savedQuery as any)

    const result = await store.loadQueryToBuilder('1')

    expect(queryStorageApi.loadQuery).toHaveBeenCalledWith('1')
    expect(queryBuilderStoreMock.loadState).toHaveBeenCalledWith(savedQuery.query)
    expect(result).toEqual(savedQuery)
    expect(store.isLoading).toBe(false)
  })

  it('loadQueryToBuilder は非SELECTクエリの場合にエラーになる', async () => {
    const store = useSavedQueryStore()
    const savedQuery = {
      id: '1',
      name: 'Mutation',
      description: 'desc',
      tags: [],
      connectionId: 'conn-1',
      query: {
        mutationType: 'INSERT',
        selectedTable: 'users',
        queryModel: null,
        insertInputMode: 'form',
        smartQuote: true,
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    vi.mocked(queryStorageApi.loadQuery).mockResolvedValue(savedQuery as any)

    await expect(store.loadQueryToBuilder('1')).rejects.toThrow('This query is not a SELECT query')
    expect(queryBuilderStoreMock.loadState).not.toHaveBeenCalled()
    expect(store.error).toBe('This query is not a SELECT query')
    expect(store.isLoading).toBe(false)
  })

  it('loadQueryToMutationBuilder はクエリをロードできる', async () => {
    const store = useSavedQueryStore()
    const mutationQuery = {
      mutationType: 'UPDATE',
      selectedTable: 'users',
      queryModel: null,
      insertInputMode: 'form',
      smartQuote: true,
    }
    const savedQuery = {
      id: '1',
      name: 'Mutation',
      description: 'desc',
      tags: [],
      connectionId: 'conn-1',
      query: mutationQuery,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    vi.mocked(queryStorageApi.loadQuery).mockResolvedValue(savedQuery as any)

    const result = await store.loadQueryToMutationBuilder('1')

    expect(queryStorageApi.loadQuery).toHaveBeenCalledWith('1')
    expect(mutationBuilderStoreMock.loadState).toHaveBeenCalledWith(mutationQuery)
    expect(result).toEqual(savedQuery)
    expect(store.isLoading).toBe(false)
  })

  it('loadQueryToMutationBuilder はエラー時に error を設定して再スローする', async () => {
    const store = useSavedQueryStore()
    vi.mocked(queryStorageApi.loadQuery).mockRejectedValue(new Error('Mutation load failed'))

    await expect(store.loadQueryToMutationBuilder('1')).rejects.toThrow('Mutation load failed')
    expect(store.error).toBe('Mutation load failed')
    expect(mutationBuilderStoreMock.loadState).not.toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
  })

  it('deleteQuery はクエリを削除できる', async () => {
    const store = useSavedQueryStore()
    vi.mocked(queryStorageApi.deleteQuery).mockResolvedValue()
    const fetchSpy = vi.spyOn(store, 'fetchQueries').mockResolvedValue()

    await store.deleteQuery('1')

    expect(queryStorageApi.deleteQuery).toHaveBeenCalledWith('1')
    expect(fetchSpy).toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
  })

  it('deleteQuery はエラー時に error を設定する', async () => {
    const store = useSavedQueryStore()
    vi.mocked(queryStorageApi.deleteQuery).mockRejectedValue(new Error('Delete failed'))

    await store.deleteQuery('1')

    expect(store.error).toBe('Delete failed')
    expect(store.isLoading).toBe(false)
  })

  it('setSearchKeyword は検索キーワードを更新して検索する', async () => {
    const store = useSavedQueryStore()
    const fetchSpy = vi.spyOn(store, 'fetchQueries').mockResolvedValue()

    store.setSearchKeyword('users')

    expect(store.searchKeyword).toBe('users')
    expect(fetchSpy).toHaveBeenCalledWith({ keyword: 'users', tags: [] })
  })

  it('setSelectedTags はタグを更新して検索する', async () => {
    const store = useSavedQueryStore()
    const fetchSpy = vi.spyOn(store, 'fetchQueries').mockResolvedValue()

    store.setSelectedTags(['tag-a', 'tag-b'])

    expect(store.selectedTags).toEqual(['tag-a', 'tag-b'])
    expect(fetchSpy).toHaveBeenCalledWith({ keyword: '', tags: ['tag-a', 'tag-b'] })
  })
})
