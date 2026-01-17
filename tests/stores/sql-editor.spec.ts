import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'

describe('SqlEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態が正しい', () => {
    const store = useSqlEditorStore()
    expect(store.connectionId).toBeNull()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.isExecuting).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })

  it('setConnectionでconnectionIdが設定される', () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    expect(store.connectionId).toBe('conn-1')
  })

  it('updateSqlでSQLが更新される', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')
    expect(store.sql).toBe('SELECT 1')
    expect(store.isDirty).toBe(true)
  })

  it('resetで状態がリセットされる', () => {
    const store = useSqlEditorStore()
    store.setConnection('conn-1')
    store.updateSql('SELECT 1')
    store.reset()
    expect(store.sql).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })

  it('canExecuteはsql非空かつ非実行中のときtrue', () => {
    const store = useSqlEditorStore()
    expect(store.canExecute).toBe(false)
    store.updateSql('SELECT 1')
    expect(store.canExecute).toBe(true)
    store.isExecuting = true
    expect(store.canExecute).toBe(false)
  })
})
