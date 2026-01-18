import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import SqlTextEditor from '~/components/sql-editor/SqlTextEditor.vue'

const mocks = vi.hoisted(() => {
  const onDidChangeHandlers: Array<() => void> = []
  const onDidChangeSelectionHandlers: Array<() => void> = []
  let currentValue = ''

  const editorInstance = {
    getValue: vi.fn(() => currentValue),
    setValue: vi.fn((value: string) => {
      currentValue = value
    }),
    addAction: vi.fn(),
    getSelection: vi.fn(() => null),
    getModel: vi.fn(() => null),
    onDidChangeModelContent: vi.fn((handler: () => void) => {
      onDidChangeHandlers.push(handler)
      return { dispose: vi.fn() }
    }),
    onDidChangeCursorSelection: vi.fn((handler: () => void) => {
      onDidChangeSelectionHandlers.push(handler)
      return { dispose: vi.fn() }
    }),
    deltaDecorations: vi.fn(() => []),
    dispose: vi.fn(),
  }

  return {
    onDidChangeHandlers,
    onDidChangeSelectionHandlers,
    getCurrentValue: () => currentValue,
    setCurrentValue: (value: string) => {
      currentValue = value
    },
    editorInstance,
    createMock: vi.fn(() => editorInstance),
    setThemeMock: vi.fn(),
  }
})

vi.mock('monaco-editor', () => ({
  editor: {
    create: mocks.createMock,
    setTheme: mocks.setThemeMock,
  },
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { Enter: 3, Escape: 9 },
  Range: class {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
  },
}))

vi.mock('#app/composables/color', () => ({
  useColorMode: () => ({
    preference: 'light',
    value: 'light',
  }),
}))

describe('SqlTextEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.setCurrentValue('')
    mocks.onDidChangeHandlers.length = 0
    mocks.createMock.mockClear()
    mocks.setThemeMock.mockClear()
    mocks.editorInstance.getValue.mockClear()
    mocks.editorInstance.setValue.mockClear()
    mocks.editorInstance.onDidChangeModelContent.mockClear()
    mocks.editorInstance.onDidChangeCursorSelection.mockClear()
    mocks.editorInstance.addAction.mockClear()
    mocks.editorInstance.deltaDecorations.mockClear()
    mocks.editorInstance.dispose.mockClear()
  })

  it('Monaco Editorを初期化する', () => {
    mount(SqlTextEditor)

    expect(mocks.createMock).toHaveBeenCalledTimes(1)
    expect(mocks.createMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        language: 'sql',
        lineNumbers: 'on',
        value: '',
        minimap: { enabled: false },
      })
    )
  })

  it('エディタ変更でストアが更新される', () => {
    const store = useSqlEditorStore()
    mount(SqlTextEditor)

    mocks.setCurrentValue('SELECT 1')
    mocks.onDidChangeHandlers[0]?.()

    expect(store.sql).toBe('SELECT 1')
    expect(store.isDirty).toBe(true)
  })

  it('ストア変更がエディタに反映される', async () => {
    const store = useSqlEditorStore()
    mount(SqlTextEditor)

    store.updateSql('SELECT 2')
    await nextTick()

    expect(mocks.editorInstance.setValue).toHaveBeenCalledWith('SELECT 2')
  })
})
