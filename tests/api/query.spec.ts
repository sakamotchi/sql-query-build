import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueryModel } from '~/types/query-model'

// Mock Tauri invoke
const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args)
}))

// Import after mocking
import { queryApi } from '~/api/query'

describe('queryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockQuery = (): QueryModel => ({
    connectionId: 'conn-123',
    select: {
      distinct: false,
      columns: [
        { type: 'column', tableAlias: 'u', columnName: 'id', alias: null }
      ]
    },
    from: {
      table: { schema: 'public', name: 'users', alias: 'u' }
    },
    joins: [],
    whereClause: null,
    groupBy: null,
    having: null,
    orderBy: null,
    limit: null
  })

  describe('generateSql', () => {
    it('generate_sql コマンドを正しいパラメータで呼び出す', async () => {
      const mockQuery = createMockQuery()
      const expectedSql = 'SELECT u.id FROM public.users u'
      mockInvoke.mockResolvedValue(expectedSql)

      const result = await queryApi.generateSql(mockQuery)

      expect(mockInvoke).toHaveBeenCalledWith('generate_sql', {
        query: mockQuery
      })
      expect(result).toBe(expectedSql)
    })

    it('エラーを正しく伝播する', async () => {
      const mockQuery = createMockQuery()
      mockInvoke.mockRejectedValue(new Error('Connection not found'))

      await expect(queryApi.generateSql(mockQuery))
        .rejects.toThrow('Connection not found')
    })
  })

  describe('generateSqlFormatted', () => {
    it('generate_sql_formatted コマンドを正しいパラメータで呼び出す（デフォルト）', async () => {
      const mockQuery = createMockQuery()
      const expectedSql = 'SELECT\n  u.id\nFROM public.users u'
      mockInvoke.mockResolvedValue(expectedSql)

      const result = await queryApi.generateSqlFormatted(mockQuery, true)

      expect(mockInvoke).toHaveBeenCalledWith('generate_sql_formatted', {
        query: mockQuery,
        pretty: true,
        smartQuote: true // デフォルト値
      })
      expect(result).toBe(expectedSql)
    })

    it('pretty=false でコンパクト形式のSQLを生成する', async () => {
      const mockQuery = createMockQuery()
      const expectedSql = 'SELECT u.id FROM public.users u'
      mockInvoke.mockResolvedValue(expectedSql)

      const result = await queryApi.generateSqlFormatted(mockQuery, false)

      expect(mockInvoke).toHaveBeenCalledWith('generate_sql_formatted', {
        query: mockQuery,
        pretty: false,
        smartQuote: true
      })
      expect(result).toBe(expectedSql)
    })

    it('smartQuote=false で全ての識別子をクォートする', async () => {
      const mockQuery = createMockQuery()
      const expectedSql = 'SELECT "u"."id" FROM "public"."users" "u"'
      mockInvoke.mockResolvedValue(expectedSql)

      const result = await queryApi.generateSqlFormatted(mockQuery, true, false)

      expect(mockInvoke).toHaveBeenCalledWith('generate_sql_formatted', {
        query: mockQuery,
        pretty: true,
        smartQuote: false
      })
      expect(result).toBe(expectedSql)
    })

    it('エラーを正しく伝播する', async () => {
      const mockQuery = createMockQuery()
      mockInvoke.mockRejectedValue(new Error('Invalid query'))

      await expect(queryApi.generateSqlFormatted(mockQuery, true))
        .rejects.toThrow('Invalid query')
    })
  })
})
