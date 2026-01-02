
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { queryApi } from '@/api/query'

// Mock queryApi
vi.mock('@/api/query', () => ({
  queryApi: {
    executeQuery: vi.fn(),
    generateSqlFormatted: vi.fn(),
  },
}))

// Mock connection store
vi.mock('@/stores/connection', () => ({
  useConnectionStore: () => ({
    activeConnection: {
      id: 'test-connection-id',
      type: 'postgresql'
    },
    connections: []
  })
}))

// Mock window store
vi.mock('@/stores/window', () => ({
  useWindowStore: () => ({
    currentConnectionId: 'test-connection-id'
  })
}))

describe('QueryBuilder Store Error Handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('handles execution error', async () => {
    const store = useQueryBuilderStore()

    // Mock error response
    const mockError = new Error('Execution failed')
    vi.mocked(queryApi.executeQuery).mockRejectedValueOnce(mockError)

    // Setup state for execution
    store.generatedSql = 'SELECT * FROM users'
    store.selectedColumns = [{
       tableId: '1', tableAlias: 't1', columnName: 'c1', columnAlias: null, dataType: 'text'
    }]

    // Execute
    await store.executeQuery()

    // Check error state (Error objects get converted to unknown code)
    expect(store.queryError).toMatchObject({
      code: 'unknown',
      message: 'Execution failed',
    })
    expect(store.isExecuting).toBe(false)
  })

  it('handles JSON error string from Rust', async () => {
    const store = useQueryBuilderStore()

    // Mock error response as JSON string
    const jsonError = JSON.stringify({
      code: 'syntax_error',
      message: 'Syntax error',
      details: { line: 1 },
    })
    vi.mocked(queryApi.executeQuery).mockRejectedValueOnce(jsonError)

    store.generatedSql = 'SELECT * FROM users'
    store.selectedColumns = [{
       tableId: '1', tableAlias: 't1', columnName: 'c1', columnAlias: null, dataType: 'text'
    }]

    await store.executeQuery()

    expect(store.queryError).toMatchObject({
      code: 'syntax_error',
      message: 'Syntax error',
      details: { line: 1 },
    })
  })

  it('clears error on clearResult', () => {
    const store = useQueryBuilderStore()
    store.queryError = { code: 'unknown', message: 'error' }
    
    store.clearResult()
    expect(store.queryError).toBeNull()
  })
})
