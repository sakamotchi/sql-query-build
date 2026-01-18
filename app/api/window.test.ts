import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { windowApi } from './window'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('windowApi.openSqlEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should invoke open_sql_editor_window command', async () => {
    const mockWindowInfo = {
      label: 'sql_editor_test-123',
      title: '[開発] TestDB - SQLエディタ',
      windowType: 'sql_editor',
      connectionId: 'test-123',
      focused: true,
      visible: true,
    }

    vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

    const result = await windowApi.openSqlEditor(
      'test-123',
      'TestDB',
      'development',
    )

    expect(invoke).toHaveBeenCalledWith('open_sql_editor_window', {
      connectionId: 'test-123',
      connectionName: 'TestDB',
      environment: 'development',
    })
    expect(result).toEqual(mockWindowInfo)
  })

  it('should handle errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(invoke).mockRejectedValue(new Error('Failed to open window'))

    await expect(
      windowApi.openSqlEditor('test-123', 'TestDB', 'development'),
    ).rejects.toThrow('Failed to open window')

    consoleErrorSpy.mockRestore()
  })

  it('should handle production environment correctly', async () => {
    const mockWindowInfo = {
      label: 'sql_editor_prod-456',
      title: '[本番] ProdDB - SQLエディタ ⚠️',
      windowType: 'sql_editor',
      connectionId: 'prod-456',
      focused: true,
      visible: true,
    }

    vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

    const result = await windowApi.openSqlEditor(
      'prod-456',
      'ProdDB',
      'production',
    )

    expect(invoke).toHaveBeenCalledWith('open_sql_editor_window', {
      connectionId: 'prod-456',
      connectionName: 'ProdDB',
      environment: 'production',
    })
    expect(result.title).toContain('⚠️')
  })

  it('should log error when window fails to open', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Network error')
    vi.mocked(invoke).mockRejectedValue(error)

    await expect(
      windowApi.openSqlEditor('test-123', 'TestDB', 'development'),
    ).rejects.toThrow()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[windowApi] Failed to open SQL editor window:',
      error,
    )

    consoleErrorSpy.mockRestore()
  })
})
