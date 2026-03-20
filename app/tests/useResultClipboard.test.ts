import { describe, it, expect } from 'vitest'
import {
  formatValueForClipboard,
  formatAsCsv,
  formatAsTsv,
  formatAsMarkdown,
} from '~/composables/useResultClipboard'
import type { QueryExecuteResult, QueryResultColumn } from '~/types/query-result'

const col = (name: string, dataType = 'TEXT'): QueryResultColumn => ({
  name,
  dataType,
  nullable: true,
})

const mockResult: QueryExecuteResult = {
  columns: [col('id', 'INT4'), col('name', 'TEXT'), col('active', 'BOOL')],
  rows: [
    { values: [1, 'Alice', true] },
    { values: [2, null, false] },
    { values: [3, 'Bob, Jr.', true] },
  ],
  rowCount: 3,
  executionTimeMs: 42,
  warnings: [],
}

describe('formatValueForClipboard', () => {
  it('null を空文字で返す', () => {
    expect(formatValueForClipboard(null, col('x'))).toBe('')
  })

  it('boolean を文字列に変換する', () => {
    expect(formatValueForClipboard(true, col('x'))).toBe('true')
    expect(formatValueForClipboard(false, col('x'))).toBe('false')
  })

  it('数値を文字列に変換する', () => {
    expect(formatValueForClipboard(42, col('x', 'INT4'))).toBe('42')
  })

  it('バイナリ配列を "[N bytes]" 形式にする', () => {
    expect(formatValueForClipboard([1, 2, 3], col('x', 'BYTEA'))).toBe('[3 bytes]')
  })

  it('JSON型の文字列をコンパクトJSONにする', () => {
    const json = '{"a": 1, "b": 2}'
    expect(formatValueForClipboard(json, col('x', 'JSONB'))).toBe('{"a":1,"b":2}')
  })

  it('不正なJSONはそのまま返す', () => {
    expect(formatValueForClipboard('not json', col('x', 'JSONB'))).toBe('not json')
  })
})

describe('formatAsCsv', () => {
  it('1行目にカラム名が含まれる', () => {
    const lines = formatAsCsv(mockResult).split('\n')
    expect(lines[0]).toBe('id,name,active')
  })

  it('NULL値が空文字（,,）になる', () => {
    const lines = formatAsCsv(mockResult).split('\n')
    expect(lines[2]).toBe('2,,false')
  })

  it('カンマを含む値がダブルクォートで囲まれる', () => {
    const lines = formatAsCsv(mockResult).split('\n')
    expect(lines[3]).toBe('3,"Bob, Jr.",true')
  })

  it('ダブルクォートを含む値がエスケープされる', () => {
    const result: QueryExecuteResult = {
      columns: [col('note')],
      rows: [{ values: ['say "hello"'] }],
      rowCount: 1,
      executionTimeMs: 1,
      warnings: [],
    }
    const lines = formatAsCsv(result).split('\n')
    expect(lines[1]).toBe('"say ""hello"""')
  })
})

describe('formatAsTsv', () => {
  it('1行目にカラム名がタブ区切りで含まれる', () => {
    const lines = formatAsTsv(mockResult).split('\n')
    expect(lines[0]).toBe('id\tname\tactive')
  })

  it('NULL値が空文字になる', () => {
    const lines = formatAsTsv(mockResult).split('\n')
    expect(lines[2]).toBe('2\t\tfalse')
  })

  it('タブを含む値がスペースに変換される', () => {
    const result: QueryExecuteResult = {
      columns: [col('note')],
      rows: [{ values: ['line\ttab'] }],
      rowCount: 1,
      executionTimeMs: 1,
      warnings: [],
    }
    const lines = formatAsTsv(result).split('\n')
    expect(lines[1]).toBe('line tab')
  })
})

describe('formatAsMarkdown', () => {
  it('GFMパイプテーブルのヘッダー行が正しい', () => {
    const md = formatAsMarkdown(mockResult)
    expect(md).toContain('| id | name | active |')
  })

  it('GFMパイプテーブルの区切り行が正しい', () => {
    const md = formatAsMarkdown(mockResult)
    expect(md).toContain('| --- | --- | --- |')
  })

  it('NULL値が "NULL" と表示される', () => {
    const md = formatAsMarkdown(mockResult)
    expect(md).toContain('| 2 | NULL | false |')
  })

  it('パイプ文字がエスケープされる', () => {
    const result: QueryExecuteResult = {
      columns: [col('note')],
      rows: [{ values: ['a|b'] }],
      rowCount: 1,
      executionTimeMs: 1,
      warnings: [],
    }
    const md = formatAsMarkdown(result)
    expect(md).toContain('| a\\|b |')
  })

  it('SQLオプション指定時にSQLブロックが含まれる', () => {
    const md = formatAsMarkdown(mockResult, { sql: 'SELECT * FROM users' })
    expect(md).toContain('```sql')
    expect(md).toContain('SELECT * FROM users')
    expect(md).toContain('```')
  })

  it('SQLオプション未指定時はSQLブロックが含まれない', () => {
    const md = formatAsMarkdown(mockResult)
    expect(md).not.toContain('```sql')
  })

  it('行数と実行時間が含まれる', () => {
    const md = formatAsMarkdown(mockResult)
    expect(md).toContain('**3 rows**')
    expect(md).toContain('0.042s')
  })
})
