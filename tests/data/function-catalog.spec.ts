import { describe, it, expect } from 'vitest'
import { getFunctionCatalog } from '~/data/function-catalog'

describe('function-catalog', () => {
  it('postgresqlの関数カタログを取得できる', () => {
    const catalog = getFunctionCatalog('postgresql')
    expect(catalog.some((f) => f.name === 'UPPER')).toBe(true)
    expect(catalog.some((f) => f.name === 'CONCAT')).toBe(true)
  })

  it('mysqlの関数カタログを取得できる', () => {
    const catalog = getFunctionCatalog('mysql')
    expect(catalog.some((f) => f.name === 'DATE_FORMAT')).toBe(true)
  })

  it('sqliteの関数カタログを取得できる', () => {
    const catalog = getFunctionCatalog('sqlite')
    expect(catalog.some((f) => f.name === 'SUBSTR')).toBe(true)
    expect(catalog.some((f) => f.name === '||')).toBe(true)
  })
})
