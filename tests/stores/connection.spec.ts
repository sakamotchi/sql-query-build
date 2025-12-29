import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConnectionStore } from '~/stores/connection'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('ConnectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('空の接続リストを持つ', () => {
      const store = useConnectionStore()
      expect(store.connections).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('actions (Browser Mode)', () => {
    it('createConnectionがモック接続を作成する', async () => {
      const store = useConnectionStore()
      const newConn = {
        name: 'Test DB',
        environment: 'development' as const,
        type: 'mysql' as const,
        host: 'localhost',
        port: 3306,
        username: 'root',
        database: 'test'
      }
      const result = await store.createConnection(newConn)
      expect(result.id).toContain('mock-')
      expect(store.connections).toHaveLength(1)
      expect(store.connections[0].name).toBe('Test DB')
    })
    
    it('updateConnectionがモック接続を更新する', async () => {
      const store = useConnectionStore()
      // Setup mock connection
      const newConn = await store.createConnection({
        name: 'Test DB',
        environment: 'development',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        database: 'test'
      })
      
      const updated = await store.updateConnection(newConn.id, { name: 'Updated DB' })
      expect(updated.name).toBe('Updated DB')
      expect(store.connections[0].name).toBe('Updated DB')
    })

    it('deleteConnectionがモック接続を削除する', async () => {
      const store = useConnectionStore()
      const newConn = await store.createConnection({
        name: 'Test DB',
        environment: 'development',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        database: 'test'
      })
      
      expect(store.connections).toHaveLength(1)
      await store.deleteConnection(newConn.id)
      expect(store.connections).toHaveLength(0)
    })
  })
})
