import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWindow } from '~/composables/useWindow'
import { useWindowStore } from '~/stores/window'
import { windowApi } from '~/api/window'
import type { WindowInfo } from '~/types'

vi.mock('~/api/window', () => ({
  windowApi: {
    findWindowByConnection: vi.fn(),
    openQueryBuilder: vi.fn(),
    openSettings: vi.fn(),
    focusWindow: vi.fn(),
  },
}))

const windowApiMock = vi.mocked(windowApi)

const mockWindowInfo: WindowInfo = {
  label: 'query-builder-123',
  title: 'Test DB',
  windowType: 'query_builder',
  connectionId: '123',
  focused: true,
  visible: true,
}

describe('useWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('状態', () => {
    it('connectionIdがストアの値を返す', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
        connectionId: 'conn-123',
      }

      const { connectionId } = useWindow()

      expect(connectionId.value).toBe('conn-123')
    })

    it('environmentがストアの値を返す', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
        environment: 'production',
      }

      const { environment } = useWindow()

      expect(environment.value).toBe('production')
    })

    it('isQueryBuilderがウィンドウタイプを正しく判定', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
      }

      const { isQueryBuilder, isLauncher } = useWindow()

      expect(isQueryBuilder.value).toBe(true)
      expect(isLauncher.value).toBe(false)
    })

    it('isLauncherがウィンドウタイプを正しく判定', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'launcher',
        windowType: 'launcher',
      }

      const { isLauncher, isQueryBuilder } = useWindow()

      expect(isLauncher.value).toBe(true)
      expect(isQueryBuilder.value).toBe(false)
    })

    it('isSettingsがウィンドウタイプを正しく判定', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'settings',
        windowType: 'settings',
      }

      const { isSettings, isLauncher } = useWindow()

      expect(isSettings.value).toBe(true)
      expect(isLauncher.value).toBe(false)
    })
  })

  describe('openQueryBuilder', () => {
    it('既存ウィンドウがある場合はフォーカスする', async () => {
      windowApiMock.findWindowByConnection.mockResolvedValueOnce(mockWindowInfo)

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(windowApiMock.findWindowByConnection).toHaveBeenCalledWith('123')
      expect(windowApiMock.focusWindow).toHaveBeenCalledWith('query-builder-123')
      expect(windowApiMock.openQueryBuilder).not.toHaveBeenCalled()
      expect(result).toEqual(mockWindowInfo)
    })

    it('既存ウィンドウがない場合は新規作成する', async () => {
      windowApiMock.findWindowByConnection.mockResolvedValueOnce(null)
      windowApiMock.openQueryBuilder.mockResolvedValueOnce(mockWindowInfo)

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(windowApiMock.findWindowByConnection).toHaveBeenCalledWith('123')
      expect(windowApiMock.openQueryBuilder).toHaveBeenCalledWith('123', 'Test DB', 'development')
      expect(windowApiMock.focusWindow).not.toHaveBeenCalled()
      expect(result).toEqual(mockWindowInfo)
    })

    it('エラー時はnullを返す', async () => {
      windowApiMock.findWindowByConnection.mockRejectedValueOnce(new Error('Test error'))

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(result).toBeNull()
    })
  })

  describe('openSettings', () => {
    it('設定ウィンドウを開く', async () => {
      const settingsInfo: WindowInfo = {
        label: 'settings',
        title: 'Settings',
        windowType: 'settings',
        connectionId: null,
        focused: true,
        visible: true,
      }
      windowApiMock.openSettings.mockResolvedValueOnce(settingsInfo)

      const { openSettings } = useWindow()
      const result = await openSettings()

      expect(windowApiMock.openSettings).toHaveBeenCalled()
      expect(result).toEqual(settingsInfo)
    })

    it('エラー時はnullを返す', async () => {
      windowApiMock.openSettings.mockRejectedValueOnce(new Error('Test error'))

      const { openSettings } = useWindow()
      const result = await openSettings()

      expect(result).toBeNull()
    })
  })

  describe('setConnectionContext', () => {
    it('ストアのsetConnectionContextを呼び出す', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
      }

      const { setConnectionContext } = useWindow()
      setConnectionContext('conn-123', 'development')

      expect(store.currentConnectionId).toBe('conn-123')
      expect(store.currentEnvironment).toBe('development')
    })
  })
})
