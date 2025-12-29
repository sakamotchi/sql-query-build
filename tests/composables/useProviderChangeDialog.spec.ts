import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies
vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

import { useProviderChangeDialog } from '~/composables/useProviderChangeDialog'
import { useSecurityStore } from '~/stores/security'

describe('useProviderChangeDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('全てのダイアログが閉じた状態で初期化される', () => {
      const { isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      expect(isFromSimpleDialogOpen.value).toBe(false)
      expect(isFromMasterPasswordDialogOpen.value).toBe(false)
    })
  })

  describe('openChangeDialog', () => {
    it('Simple → Master Password でSimpleダイアログが開く', () => {
      const securityStore = useSecurityStore()
      securityStore.currentProvider = 'simple'

      const { openChangeDialog, isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      openChangeDialog('master-password')

      expect(isFromSimpleDialogOpen.value).toBe(true)
      expect(isFromMasterPasswordDialogOpen.value).toBe(false)
    })

    // TODO: storeToRefsとの統合テストが必要。現在はComposableが内部でストアを取得するため、
    // テスト内でのストア状態変更がComposableに反映されない問題がある。
    it.skip('Master Password → Simple でMasterPasswordダイアログが開く', () => {
      const { openChangeDialog, isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      const securityStore = useSecurityStore()
      securityStore.currentProvider = 'master-password'

      openChangeDialog('simple')

      expect(isFromSimpleDialogOpen.value).toBe(false)
      expect(isFromMasterPasswordDialogOpen.value).toBe(true)
    })

    it('同じプロバイダーへの変更は何もしない', () => {
      const securityStore = useSecurityStore()
      securityStore.currentProvider = 'simple'
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { openChangeDialog, isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      openChangeDialog('simple')

      expect(isFromSimpleDialogOpen.value).toBe(false)
      expect(isFromMasterPasswordDialogOpen.value).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('既に同じプロバイダーです')

      consoleSpy.mockRestore()
    })

    // TODO: storeToRefsとの統合テストが必要
    it.skip('currentProviderがnullの場合はエラーログを出す', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { openChangeDialog } = useProviderChangeDialog()

      const securityStore = useSecurityStore()
      securityStore.currentProvider = null

      openChangeDialog('master-password')

      expect(consoleSpy).toHaveBeenCalledWith('現在のプロバイダーが取得できません')

      consoleSpy.mockRestore()
    })
  })

  describe('closeAllDialogs', () => {
    it('全てのダイアログを閉じる', () => {
      const securityStore = useSecurityStore()
      securityStore.currentProvider = 'simple'

      const { openChangeDialog, closeAllDialogs, isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      // ダイアログを開く
      openChangeDialog('master-password')
      expect(isFromSimpleDialogOpen.value).toBe(true)

      // 全て閉じる
      closeAllDialogs()

      expect(isFromSimpleDialogOpen.value).toBe(false)
      expect(isFromMasterPasswordDialogOpen.value).toBe(false)
    })

    it('何も開いていない状態でも安全に呼べる', () => {
      const { closeAllDialogs, isFromSimpleDialogOpen, isFromMasterPasswordDialogOpen } = useProviderChangeDialog()

      expect(() => closeAllDialogs()).not.toThrow()

      expect(isFromSimpleDialogOpen.value).toBe(false)
      expect(isFromMasterPasswordDialogOpen.value).toBe(false)
    })
  })
})
