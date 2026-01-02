import { describe, it, expect, vi } from 'vitest'
import { useSqlFormatter } from '@/composables/useSqlFormatter'

describe('useSqlFormatter', () => {
  it('単一行INSERTを整形する', () => {
    const { formatInsertSql } = useSqlFormatter()
    const sql = "INSERT INTO users (id, name) VALUES (1, 'a');"

    const result = formatInsertSql(sql)

    expect(result).toBe("INSERT INTO users (id, name)\nVALUES\n  (1, 'a');\n")
  })

  it('複数行VALUESを整形する', () => {
    const { formatInsertSql } = useSqlFormatter()
    const sql = 'INSERT INTO users (id) VALUES (1),(2),(3)'

    const result = formatInsertSql(sql)

    expect(result).toBe('INSERT INTO users (id)\nVALUES\n  (1),\n  (2),\n  (3)')
  })

  it('セミコロンの前で改行する', () => {
    const { formatInsertSql } = useSqlFormatter()
    const sql = 'INSERT INTO users (id) VALUES (1);'

    const result = formatInsertSql(sql)

    expect(result.endsWith(';\n')).toBe(true)
  })

  it('空文字列を正しく処理する', () => {
    const { formatInsertSql } = useSqlFormatter()

    expect(formatInsertSql('')).toBe('')
    expect(formatInsertSql('   ')).toBe('   ')
  })

  it('エラー時は元のSQLを返す', () => {
    const { formatInsertSql } = useSqlFormatter()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const badSql = {
        trim: () => ({
          replace: () => {
            throw new Error('format failed')
          },
        }),
      } as unknown as string

      const result = formatInsertSql(badSql)

      expect(result).toBe(badSql)
      expect(consoleSpy).toHaveBeenCalled()
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('UPDATEを整形する', () => {
    const { formatUpdateSql } = useSqlFormatter()
    const sql = "UPDATE users SET name = 'a', age = 1 WHERE id = 1"

    const result = formatUpdateSql(sql)

    expect(result).toBe("UPDATE users\nSET\n  name = 'a',\n  age = 1\nWHERE\n  id = 1")
  })

  it('複数SETを改行する', () => {
    const { formatUpdateSql } = useSqlFormatter()
    const sql = 'UPDATE users SET first_name = 1,last_name = 2'

    const result = formatUpdateSql(sql)

    expect(result).toBe('UPDATE users\nSET\n  first_name = 1,\n  last_name = 2')
  })

  it('WHERE句の前で改行する', () => {
    const { formatUpdateSql } = useSqlFormatter()
    const sql = 'UPDATE users SET name = 1 WHERE id = 1'

    const result = formatUpdateSql(sql)

    expect(result).toContain('\nWHERE\n  ')
  })

  it('UPDATEの空文字列を正しく処理する', () => {
    const { formatUpdateSql } = useSqlFormatter()

    expect(formatUpdateSql('')).toBe('')
    expect(formatUpdateSql('   ')).toBe('   ')
  })

  it('DELETEを整形する', () => {
    const { formatDeleteSql } = useSqlFormatter()
    const sql = 'DELETE FROM users WHERE id = 1'

    const result = formatDeleteSql(sql)

    expect(result).toBe('DELETE FROM users\nWHERE\n  id = 1')
  })

  it('DELETEの空文字列を正しく処理する', () => {
    const { formatDeleteSql } = useSqlFormatter()

    expect(formatDeleteSql('')).toBe('')
    expect(formatDeleteSql('   ')).toBe('   ')
  })

  it('INSERTタイプで正しいフォーマッターを呼び出す', () => {
    const { formatMutationSql, formatInsertSql } = useSqlFormatter()
    const sql = 'INSERT INTO users (id) VALUES (1)'

    expect(formatMutationSql(sql, 'INSERT')).toBe(formatInsertSql(sql))
  })

  it('UPDATEタイプで正しいフォーマッターを呼び出す', () => {
    const { formatMutationSql, formatUpdateSql } = useSqlFormatter()
    const sql = 'UPDATE users SET name = 1'

    expect(formatMutationSql(sql, 'UPDATE')).toBe(formatUpdateSql(sql))
  })

  it('DELETEタイプで正しいフォーマッターを呼び出す', () => {
    const { formatMutationSql, formatDeleteSql } = useSqlFormatter()
    const sql = 'DELETE FROM users'

    expect(formatMutationSql(sql, 'DELETE')).toBe(formatDeleteSql(sql))
  })
})
