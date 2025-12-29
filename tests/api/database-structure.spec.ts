import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DatabaseStructure, Schema, Table, Column } from '~/types/database-structure'

// Mock Tauri invoke
const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args)
}))

// Import after mocking
import { databaseStructureApi } from '~/api/database-structure'

describe('databaseStructureApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDatabaseStructure', () => {
    it('get_database_structure コマンドを正しいパラメータで呼び出す', async () => {
      const mockStructure: DatabaseStructure = {
        connectionId: 'conn-123',
        schemas: []
      }
      mockInvoke.mockResolvedValue(mockStructure)

      const result = await databaseStructureApi.getDatabaseStructure('conn-123')

      expect(mockInvoke).toHaveBeenCalledWith('get_database_structure', {
        connectionId: 'conn-123'
      })
      expect(result).toEqual(mockStructure)
    })

    it('エラーを正しく伝播する', async () => {
      mockInvoke.mockRejectedValue(new Error('Connection failed'))

      await expect(databaseStructureApi.getDatabaseStructure('conn-123'))
        .rejects.toThrow('Connection failed')
    })
  })

  describe('getSchemas', () => {
    it('get_schemas コマンドを正しいパラメータで呼び出す', async () => {
      const mockSchemas: Schema[] = [
        { name: 'public', tables: [], views: [] },
        { name: 'private', tables: [], views: [] }
      ]
      mockInvoke.mockResolvedValue(mockSchemas)

      const result = await databaseStructureApi.getSchemas('conn-123')

      expect(mockInvoke).toHaveBeenCalledWith('get_schemas', {
        connectionId: 'conn-123'
      })
      expect(result).toEqual(mockSchemas)
      expect(result).toHaveLength(2)
    })
  })

  describe('getTables', () => {
    it('get_tables コマンドを正しいパラメータで呼び出す', async () => {
      const mockTables: Table[] = [
        {
          name: 'users',
          schemaName: 'public',
          columns: [],
          primaryKey: null,
          indexes: [],
          foreignKeys: []
        },
        {
          name: 'orders',
          schemaName: 'public',
          columns: [],
          primaryKey: null,
          indexes: [],
          foreignKeys: []
        }
      ]
      mockInvoke.mockResolvedValue(mockTables)

      const result = await databaseStructureApi.getTables('conn-123', 'public')

      expect(mockInvoke).toHaveBeenCalledWith('get_tables', {
        connectionId: 'conn-123',
        schema: 'public'
      })
      expect(result).toEqual(mockTables)
      expect(result).toHaveLength(2)
    })
  })

  describe('getColumns', () => {
    it('get_columns コマンドを正しいパラメータで呼び出す', async () => {
      const mockColumns: Column[] = [
        { name: 'id', dataType: 'integer', nullable: false },
        { name: 'name', dataType: 'varchar', nullable: true },
        { name: 'email', dataType: 'varchar', nullable: false }
      ]
      mockInvoke.mockResolvedValue(mockColumns)

      const result = await databaseStructureApi.getColumns('conn-123', 'public', 'users')

      expect(mockInvoke).toHaveBeenCalledWith('get_columns', {
        connectionId: 'conn-123',
        schema: 'public',
        table: 'users'
      })
      expect(result).toEqual(mockColumns)
      expect(result).toHaveLength(3)
    })
  })
})
