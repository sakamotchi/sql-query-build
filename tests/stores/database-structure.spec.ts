import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStructureStore } from '~/stores/database-structure'
import type { DatabaseStructure, Schema, Table, Column } from '~/types/database-structure'

// Mock the API
const mockGetDatabaseStructure = vi.fn()

vi.mock('~/api/database-structure', () => ({
  databaseStructureApi: {
    getDatabaseStructure: (...args: any[]) => mockGetDatabaseStructure(...args)
  }
}))

describe('DatabaseStructureStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const createMockStructure = (connectionId: string): DatabaseStructure => ({
    connectionId,
    schemas: [
      {
        name: 'public',
        tables: [
          {
            name: 'users',
            schemaName: 'public',
            columns: [
              { name: 'id', dataType: 'integer', nullable: false } as Column,
              { name: 'name', dataType: 'varchar', nullable: true } as Column
            ],
            primaryKey: { name: 'pk_users', columns: ['id'] },
            indexes: [],
            foreignKeys: []
          } as Table
        ],
        views: []
      } as Schema
    ]
  })

  describe('初期状態', () => {
    it('デフォルトの初期状態を持つ', () => {
      const store = useDatabaseStructureStore()

      expect(store.structures).toEqual({})
      expect(store.loadingIds.size).toBe(0)
      expect(store.errors).toEqual({})
    })
  })

  describe('getters', () => {
    it('getStructure で接続IDから構造を取得できる', () => {
      const store = useDatabaseStructureStore()
      const structure = createMockStructure('conn1')
      store.structures['conn1'] = structure

      const result = store.getStructure('conn1')

      expect(result).toEqual(structure)
    })

    it('getStructure で存在しない接続IDはnullを返す', () => {
      const store = useDatabaseStructureStore()

      const result = store.getStructure('non-existent')

      expect(result).toBeNull()
    })

    it('isLoading で読み込み中かどうかを確認できる', () => {
      const store = useDatabaseStructureStore()

      expect(store.isLoading('conn1')).toBe(false)

      store.loadingIds.add('conn1')

      expect(store.isLoading('conn1')).toBe(true)
    })

    it('getError でエラーを取得できる', () => {
      const store = useDatabaseStructureStore()

      expect(store.getError('conn1')).toBeNull()

      store.errors['conn1'] = 'Connection failed'

      expect(store.getError('conn1')).toBe('Connection failed')
    })
  })

  describe('fetchDatabaseStructure', () => {
    it('データベース構造を取得してストアに保存する', async () => {
      const store = useDatabaseStructureStore()
      const structure = createMockStructure('conn1')
      mockGetDatabaseStructure.mockResolvedValue(structure)

      await store.fetchDatabaseStructure('conn1')

      expect(mockGetDatabaseStructure).toHaveBeenCalledWith('conn1')
      expect(store.structures['conn1']).toEqual(structure)
      expect(store.loadingIds.has('conn1')).toBe(false)
    })

    it('読み込み中は重複リクエストをスキップする', async () => {
      const store = useDatabaseStructureStore()
      const structure = createMockStructure('conn1')
      mockGetDatabaseStructure.mockResolvedValue(structure)

      // 読み込み中状態にする
      store.loadingIds.add('conn1')

      await store.fetchDatabaseStructure('conn1')

      expect(mockGetDatabaseStructure).not.toHaveBeenCalled()
    })

    it('エラー時はエラーを保存する', async () => {
      const store = useDatabaseStructureStore()
      mockGetDatabaseStructure.mockRejectedValue(new Error('Connection failed'))

      await expect(store.fetchDatabaseStructure('conn1')).rejects.toThrow('Connection failed')

      expect(store.errors['conn1']).toBe('Connection failed')
      expect(store.loadingIds.has('conn1')).toBe(false)
    })

    it('文字列エラーを正しく処理する', async () => {
      const store = useDatabaseStructureStore()
      mockGetDatabaseStructure.mockRejectedValue('String error')

      await expect(store.fetchDatabaseStructure('conn1')).rejects.toBe('String error')

      expect(store.errors['conn1']).toBe('String error')
    })

    it('不明なエラーをJSON文字列として保存する', async () => {
      const store = useDatabaseStructureStore()
      mockGetDatabaseStructure.mockRejectedValue({ code: 500 })

      await expect(store.fetchDatabaseStructure('conn1')).rejects.toEqual({ code: 500 })

      expect(store.errors['conn1']).toBe('{"code":500}')
    })

    it('読み込み開始時にエラーをクリアする', async () => {
      const store = useDatabaseStructureStore()
      store.errors['conn1'] = 'Previous error'
      const structure = createMockStructure('conn1')
      mockGetDatabaseStructure.mockResolvedValue(structure)

      await store.fetchDatabaseStructure('conn1')

      expect(store.errors['conn1']).toBeUndefined()
    })
  })

  describe('refreshDatabaseStructure', () => {
    it('既存の構造を削除してから再取得する', async () => {
      const store = useDatabaseStructureStore()
      const oldStructure = createMockStructure('conn1')
      const newStructure = createMockStructure('conn1')
      newStructure.schemas[0]!.tables.push({
        name: 'orders',
        schemaName: 'public',
        columns: [],
        primaryKey: null,
        indexes: [],
        foreignKeys: []
      } as Table)

      store.structures['conn1'] = oldStructure
      mockGetDatabaseStructure.mockResolvedValue(newStructure)

      await store.refreshDatabaseStructure('conn1')

      expect(store.structures['conn1']).toEqual(newStructure)
    })
  })

  describe('clearCache', () => {
    it('特定の接続IDのキャッシュをクリアできる', () => {
      const store = useDatabaseStructureStore()
      store.structures['conn1'] = createMockStructure('conn1')
      store.structures['conn2'] = createMockStructure('conn2')
      store.errors['conn1'] = 'Error 1'

      store.clearCache('conn1')

      expect(store.structures['conn1']).toBeUndefined()
      expect(store.structures['conn2']).toBeDefined()
      expect(store.errors['conn1']).toBeUndefined()
    })

    it('引数なしで全キャッシュをクリアできる', () => {
      const store = useDatabaseStructureStore()
      store.structures['conn1'] = createMockStructure('conn1')
      store.structures['conn2'] = createMockStructure('conn2')
      store.errors['conn1'] = 'Error 1'
      store.errors['conn2'] = 'Error 2'

      store.clearCache()

      expect(store.structures).toEqual({})
      expect(store.errors).toEqual({})
    })
  })
})
