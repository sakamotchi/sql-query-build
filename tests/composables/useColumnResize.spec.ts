import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useColumnResize } from '@/composables/useColumnResize'

describe('useColumnResize', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('未設定のカラムはデフォルト幅を返す', () => {
    const { getColumnWidth } = useColumnResize()

    expect(getColumnWidth('column1')).toBe(150)
  })

  it('設定済みのカラムは設定値を返す', () => {
    const { getColumnWidth, columnWidths } = useColumnResize()
    columnWidths.value.column1 = 220

    expect(getColumnWidth('column1')).toBe(220)
  })

  it('リサイズ開始時に状態を正しく設定する', () => {
    const { startResize, isResizing } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')

    expect(event.preventDefault).toHaveBeenCalled()
    expect(isResizing.value).toBe(true)
  })

  it('リサイズ開始時にイベントリスナーを追加する', () => {
    const { startResize } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

    document.dispatchEvent(new MouseEvent('mouseup'))
  })

  it('リサイズ中に幅を更新する', () => {
    const { startResize, getColumnWidth } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 130 }))

    expect(getColumnWidth('column1')).toBe(180)

    document.dispatchEvent(new MouseEvent('mouseup'))
  })

  it('最小幅を下回らない', () => {
    const { startResize, getColumnWidth } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }))

    expect(getColumnWidth('column1')).toBe(80)

    document.dispatchEvent(new MouseEvent('mouseup'))
  })

  it('リサイズ中でない場合は幅を変更しない', () => {
    const { startResize, getColumnWidth } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    const widthAfterStop = getColumnWidth('column1')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))

    expect(getColumnWidth('column1')).toBe(widthAfterStop)
  })

  it('リサイズ終了時に状態をリセットする', () => {
    const { startResize, isResizing } = useColumnResize()
    const event = { clientX: 100, preventDefault: vi.fn() } as unknown as MouseEvent

    startResize(event, 'column1')
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(isResizing.value).toBe(false)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('全カラムの幅をリセットできる', () => {
    const { columnWidths, resetColumnWidths, getColumnWidth } = useColumnResize()
    columnWidths.value.column1 = 200

    resetColumnWidths()

    expect(columnWidths.value).toEqual({})
    expect(getColumnWidth('column1')).toBe(150)
  })
})
