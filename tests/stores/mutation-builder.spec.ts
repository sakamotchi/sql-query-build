import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('useMutationBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with INSERT type', () => {
    const store = useMutationBuilderStore()
    expect(store.mutationType).toBe('INSERT')
    expect(store.selectedTable).toBeNull()
    expect(store.queryModel).toBeNull()
  })

  it('should change mutation type', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    expect(store.mutationType).toBe('UPDATE')
  })

  it('should select table and create query model', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    expect(store.selectedTable).toBe('users')
    expect(store.queryModel).toEqual({
      type: 'INSERT',
      table: 'users',
      columns: [],
      values: [],
    })
  })

  it('should reset query model when changing mutation type', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    store.setMutationType('UPDATE')
    expect(store.queryModel).toEqual({
      type: 'UPDATE',
      table: 'users',
      setClause: [],
      whereConditions: [],
    })
  })

  it('should create DELETE query model', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('DELETE')
    store.setSelectedTable('users')
    expect(store.queryModel).toEqual({
      type: 'DELETE',
      table: 'users',
      whereConditions: [],
    })
  })

  it('should detect WHERE conditions for UPDATE', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.setSelectedTable('users')
    expect(store.hasWhereConditions).toBe(false)
  })

  it('should reset state', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    store.resetState()
    expect(store.selectedTable).toBeNull()
    expect(store.queryModel).toBeNull()
  })
})
