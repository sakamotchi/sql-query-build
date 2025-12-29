import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies
vi.mock('~/api/query', () => ({
  queryApi: {
    generateSqlFormatted: vi.fn().mockResolvedValue('SELECT * FROM users')
  }
}))

vi.mock('~/stores/connection', () => ({
  useConnectionStore: () => ({
    activeConnection: { id: 'test-connection-id' }
  })
}))

vi.mock('~/stores/window', () => ({
  useWindowStore: () => ({
    currentConnectionId: 'test-connection-id'
  })
}))

import { useTableSelection } from '~/composables/useTableSelection'
import { useQueryBuilderStore } from '~/stores/query-builder'
import type { Table, Column } from '~/types/database-structure'

describe('useTableSelection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createMockTable = (name: string, schema: string = 'public'): Table => ({
    name,
    schemaName: schema,
    schema,
    columns: [
      { name: 'id', dataType: 'integer', nullable: false } as Column,
      { name: 'name', dataType: 'varchar', nullable: true } as Column
    ],
    primaryKey: null,
    indexes: [],
    foreignKeys: []
  })

  describe('generateAlias', () => {
    it('テーブル名の先頭文字からエイリアスを生成する', () => {
      const { generateAlias } = useTableSelection()

      expect(generateAlias('users')).toBe('u')
      expect(generateAlias('orders')).toBe('o')
      expect(generateAlias('Products')).toBe('p')
    })

    it('スネークケースの場合は各単語の先頭文字を使用する', () => {
      const { generateAlias } = useTableSelection()

      expect(generateAlias('user_profiles')).toBe('up')
      expect(generateAlias('order_items')).toBe('oi')
      expect(generateAlias('product_category_mappings')).toBe('pcm')
    })

    it('重複する場合は数字を付ける', () => {
      const { generateAlias, addTable } = useTableSelection()

      // 最初のテーブルを追加
      addTable(createMockTable('users'))

      // 同じ先頭文字のテーブルのエイリアス
      expect(generateAlias('uploads')).toBe('u1')
    })

    it('連続した重複でも正しく番号を付ける', () => {
      const { generateAlias, addTable } = useTableSelection()
      const queryBuilderStore = useQueryBuilderStore()

      // 手動でエイリアスを設定してテスト
      queryBuilderStore.selectedTables = [
        { id: 't1', schema: 'public', name: 'users', alias: 'u', columns: [] },
        { id: 't2', schema: 'public', name: 'uploads', alias: 'u1', columns: [] }
      ]

      expect(generateAlias('updates')).toBe('u2')
    })
  })

  describe('addTable', () => {
    it('テーブルを追加できる', () => {
      const { addTable } = useTableSelection()
      const queryBuilderStore = useQueryBuilderStore()
      const table = createMockTable('users')

      const result = addTable(table)

      expect(result).toBe(true)
      expect(queryBuilderStore.selectedTables).toHaveLength(1)
      expect(queryBuilderStore.selectedTables[0]).toMatchObject({
        id: 'public.users',
        schema: 'public',
        name: 'users',
        alias: 'u'
      })
    })

    it('既に追加されているテーブルは追加しない', () => {
      const { addTable } = useTableSelection()
      const queryBuilderStore = useQueryBuilderStore()
      const table = createMockTable('users')

      const result1 = addTable(table)
      const result2 = addTable(table)

      expect(result1).toBe(true)
      expect(result2).toBe(false)
      expect(queryBuilderStore.selectedTables).toHaveLength(1)
    })

    it('異なるスキーマの同名テーブルは追加できる', () => {
      const { addTable } = useTableSelection()
      const queryBuilderStore = useQueryBuilderStore()

      addTable(createMockTable('users', 'public'))
      addTable(createMockTable('users', 'archive'))

      expect(queryBuilderStore.selectedTables).toHaveLength(2)
      expect(queryBuilderStore.selectedTables[0]?.id).toBe('public.users')
      expect(queryBuilderStore.selectedTables[1]?.id).toBe('archive.users')
    })

    it('カラム情報を正しく引き継ぐ', () => {
      const { addTable } = useTableSelection()
      const queryBuilderStore = useQueryBuilderStore()
      const table = createMockTable('users')

      addTable(table)

      expect(queryBuilderStore.selectedTables[0]?.columns).toHaveLength(2)
      expect(queryBuilderStore.selectedTables[0]?.columns[0]?.name).toBe('id')
    })
  })

  describe('isTableSelected', () => {
    it('選択されているテーブルにtrueを返す', () => {
      const { addTable, isTableSelected } = useTableSelection()
      const table = createMockTable('users')

      addTable(table)

      expect(isTableSelected(table)).toBe(true)
    })

    it('選択されていないテーブルにfalseを返す', () => {
      const { isTableSelected } = useTableSelection()
      const table = createMockTable('users')

      expect(isTableSelected(table)).toBe(false)
    })

    it('スキーマ名も含めて判定する', () => {
      const { addTable, isTableSelected } = useTableSelection()

      addTable(createMockTable('users', 'public'))

      expect(isTableSelected(createMockTable('users', 'public'))).toBe(true)
      expect(isTableSelected(createMockTable('users', 'archive'))).toBe(false)
    })
  })
})
