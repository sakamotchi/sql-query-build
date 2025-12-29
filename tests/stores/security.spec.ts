import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSecurityStore } from '~/stores/security'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('SecurityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルトのセキュリティ設定を持つ', () => {
      const store = useSecurityStore()
      expect(store.currentProvider).toBe('simple')
      expect(store.currentLevel).toBe('medium')
      expect(store.isMasterPasswordSet).toBe(false)
    })
  })

  describe('actions (Browser Mode)', () => {
    it('setProviderがproviderを更新する', async () => {
      const store = useSecurityStore()
      await store.setProvider('keychain')
      expect(store.currentProvider).toBe('keychain')
    })

    it('setLevelがlevelを更新する', async () => {
      const store = useSecurityStore()
      await store.setLevel('high')
      expect(store.currentLevel).toBe('high')
    })
    
    it('setMasterPasswordがmasterPasswordSetフラグを更新する', async () => {
      const store = useSecurityStore()
      await store.setMasterPassword('secret')
      expect(store.isMasterPasswordSet).toBe(true)
    })
  })
})
