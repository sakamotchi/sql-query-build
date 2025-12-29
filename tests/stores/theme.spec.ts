import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '~/stores/theme'

// useTauriをモック
vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('ThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルト値を持つ', () => {
      const store = useThemeStore()
      expect(store.colorMode).toBe('auto')
      expect(store.primaryColor).toBe('#4CAF50')
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    it('currentColorModeがcolorModeを返す', () => {
      const store = useThemeStore()
      expect(store.currentColorMode).toBe('auto')
    })

    it('currentPrimaryColorがprimaryColorを返す', () => {
      const store = useThemeStore()
      expect(store.currentPrimaryColor).toBe('#4CAF50')
    })
  })

  describe('actions', () => {
    it('setColorModeがcolorModeを更新する', async () => {
      const store = useThemeStore()
      await store.setColorMode('dark')
      expect(store.colorMode).toBe('dark')
    })

    it('setPrimaryColorがprimaryColorを更新する', async () => {
      const store = useThemeStore()
      await store.setPrimaryColor('#FF5722')
      expect(store.primaryColor).toBe('#FF5722')
    })
  })
})
