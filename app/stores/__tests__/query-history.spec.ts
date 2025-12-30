import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryHistoryStore } from '../query-history'
import { queryHistoryApi } from '@/api/query-history'
import type { QueryHistoryMetadata } from '@/types/query-history'

vi.mock('@/api/query-history', () => ({
  queryHistoryApi: {
    listHistories: vi.fn(),
    addHistory: vi.fn(),
    loadHistory: vi.fn(),
    deleteHistory: vi.fn(),
    searchHistories: vi.fn(),
  },
}))

describe('useQueryHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // Dummy data
  const mockHistories: QueryHistoryMetadata[] = [
    {
      id: '1',
      connectionId: 'conn1',
      sql: 'SELECT * FROM users',
      executedAt: '2025-01-01T10:00:00Z',
      success: true,
      resultCount: 10,
      executionTimeMs: 100
    },
    {
      id: '2',
      connectionId: 'conn1',
      sql: 'SELECT * FROM posts WHERE id = 1',
      executedAt: '2025-01-01T11:00:00Z',
      success: false,
      executionTimeMs: 0
    },
    {
        id: '3',
        connectionId: 'conn2',
        sql: 'UPDATE users SET name = "test"',
        executedAt: '2025-01-01T12:00:00Z',
        success: true,
        resultCount: 1,
        executionTimeMs: 50
      },
  ]

  it('initializes with empty state', () => {
    const store = useQueryHistoryStore()
    expect(store.histories).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
    expect(store.searchKeyword).toBe('')
    expect(store.selectedConnectionId).toBe(null)
    expect(store.successOnly).toBe(false)
  })

  it('fetchHistories fetches histories from API', async () => {
    const store = useQueryHistoryStore()
    vi.mocked(queryHistoryApi.listHistories).mockResolvedValue(mockHistories)

    await store.fetchHistories()

    expect(queryHistoryApi.listHistories).toHaveBeenCalled()
    expect(store.histories).toEqual(mockHistories)
    expect(store.isLoading).toBe(false)
  })

  it('fetchHistories handles errors', async () => {
    const store = useQueryHistoryStore()
    vi.mocked(queryHistoryApi.listHistories).mockRejectedValue(new Error('API Error'))

    await store.fetchHistories()

    expect(store.histories).toEqual([])
    expect(store.error).toBe('API Error')
    expect(store.isLoading).toBe(false)
  })

  it('addHistory calls API and refetches', async () => {
    const store = useQueryHistoryStore()
    vi.mocked(queryHistoryApi.addHistory).mockResolvedValue({} as any)
    vi.mocked(queryHistoryApi.listHistories).mockResolvedValue(mockHistories)

    const request = {
        connectionId: 'conn1',
        query: {} as any,
        sql: 'SELECT 1',
        success: true
    }

    await store.addHistory(request)

    expect(queryHistoryApi.addHistory).toHaveBeenCalledWith(request)
    expect(queryHistoryApi.listHistories).toHaveBeenCalled()
  })

  it('deleteHistory calls API and refetches', async () => {
    const store = useQueryHistoryStore()
    vi.mocked(queryHistoryApi.deleteHistory).mockResolvedValue()
    vi.mocked(queryHistoryApi.listHistories).mockResolvedValue(mockHistories)

    await store.deleteHistory('1')

    expect(queryHistoryApi.deleteHistory).toHaveBeenCalledWith('1')
    expect(queryHistoryApi.listHistories).toHaveBeenCalled()
  })

  it('filteredHistories filters by keyword', async () => {
    const store = useQueryHistoryStore()
    store.histories = mockHistories

    store.setSearchKeyword('users')
    expect(store.filteredHistories).toHaveLength(2) // id:1 ('users'), id:3 ('users')
    expect(store.filteredHistories.map(h => h.id)).toContain('1')
    expect(store.filteredHistories.map(h => h.id)).toContain('3')

    store.setSearchKeyword('WHERE')
    expect(store.filteredHistories).toHaveLength(1) // id:2
  })

  it('filteredHistories filters by connectionId', async () => {
    const store = useQueryHistoryStore()
    store.histories = mockHistories

    store.setSelectedConnectionId('conn1')
    expect(store.filteredHistories).toHaveLength(2) // id:1, id:2

    store.setSelectedConnectionId('conn2')
    expect(store.filteredHistories).toHaveLength(1) // id:3
  })

  it('filteredHistories filters by successOnly', async () => {
    const store = useQueryHistoryStore()
    store.histories = mockHistories

    store.setSuccessOnly(true)
    expect(store.filteredHistories).toHaveLength(2) // id:1, id:3
  })
  
  it('filteredHistories combines filters', async () => {
    const store = useQueryHistoryStore()
    store.histories = mockHistories

    store.setSearchKeyword('users')
    store.setSuccessOnly(true)
    // conn1: OK, conn2: OK
    expect(store.filteredHistories).toHaveLength(2)
    
    store.setSelectedConnectionId('conn2')
    expect(store.filteredHistories).toHaveLength(1) // id:3
  })
})
