import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock useTauri
const mockInvokeCommand = vi.fn()
const mockIsAvailable = { value: true }

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: mockInvokeCommand,
    isAvailable: mockIsAvailable
  })
}))

// Mock security store
const mockLoadSettings = vi.fn()

vi.mock('~/stores/security', () => ({
  useSecurityStore: () => ({
    loadSettings: mockLoadSettings
  })
}))

import { useProviderSwitch } from '~/composables/useProviderSwitch'

describe('useProviderSwitch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockIsAvailable.value = true
  })

  describe('switchFromSimple', () => {
    it('正しいパラメータでバックエンドを呼び出す', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromSimple } = useProviderSwitch()

      await switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'password123',
        newPasswordConfirm: 'password123'
      })

      expect(mockInvokeCommand).toHaveBeenCalledWith('switch_security_provider', {
        targetProvider: 'master_password',
        currentPassword: null,
        newPassword: 'password123',
        newPasswordConfirm: 'password123'
      })
    })

    it('切り替え後に設定を再読み込みする', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromSimple } = useProviderSwitch()

      await switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'password123',
        newPasswordConfirm: 'password123'
      })

      expect(mockLoadSettings).toHaveBeenCalled()
    })

    it('skipReload=trueで再読み込みをスキップする', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromSimple } = useProviderSwitch()

      await switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'password123',
        newPasswordConfirm: 'password123',
        skipReload: true
      })

      expect(mockLoadSettings).not.toHaveBeenCalled()
    })

    it('パスワードが8文字未満でエラー', async () => {
      const { switchFromSimple } = useProviderSwitch()

      await expect(switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'short',
        newPasswordConfirm: 'short'
      })).rejects.toThrow('パスワードは8文字以上で設定してください')
    })

    it('パスワードが一致しない場合エラー', async () => {
      const { switchFromSimple } = useProviderSwitch()

      await expect(switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'password123',
        newPasswordConfirm: 'password456'
      })).rejects.toThrow('パスワードが一致しません')
    })

    it('Tauri環境が利用できない場合エラー', async () => {
      mockIsAvailable.value = false

      const { switchFromSimple } = useProviderSwitch()

      await expect(switchFromSimple({
        targetProvider: 'master-password',
        newPassword: 'password123',
        newPasswordConfirm: 'password123'
      })).rejects.toThrow('Tauri環境が利用できません')
    })
  })

  describe('switchFromMasterPassword', () => {
    it('正しいパラメータでバックエンドを呼び出す', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromMasterPassword } = useProviderSwitch()

      await switchFromMasterPassword({
        targetProvider: 'simple',
        currentPassword: 'currentPass123'
      })

      expect(mockInvokeCommand).toHaveBeenCalledWith('switch_security_provider', {
        targetProvider: 'simple',
        currentPassword: 'currentPass123',
        newPassword: null,
        newPasswordConfirm: null
      })
    })

    it('切り替え後に設定を再読み込みする', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromMasterPassword } = useProviderSwitch()

      await switchFromMasterPassword({
        targetProvider: 'simple',
        currentPassword: 'currentPass123'
      })

      expect(mockLoadSettings).toHaveBeenCalled()
    })

    it('skipReload=trueで再読み込みをスキップする', async () => {
      mockInvokeCommand.mockResolvedValue(undefined)

      const { switchFromMasterPassword } = useProviderSwitch()

      await switchFromMasterPassword({
        targetProvider: 'simple',
        currentPassword: 'currentPass123',
        skipReload: true
      })

      expect(mockLoadSettings).not.toHaveBeenCalled()
    })

    it('現在のパスワードが空の場合エラー', async () => {
      const { switchFromMasterPassword } = useProviderSwitch()

      await expect(switchFromMasterPassword({
        targetProvider: 'simple',
        currentPassword: ''
      })).rejects.toThrow('現在のパスワードを入力してください')
    })

    it('Tauri環境が利用できない場合エラー', async () => {
      mockIsAvailable.value = false

      const { switchFromMasterPassword } = useProviderSwitch()

      await expect(switchFromMasterPassword({
        targetProvider: 'simple',
        currentPassword: 'currentPass123'
      })).rejects.toThrow('Tauri環境が利用できません')
    })
  })
})
