import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSafetyStore } from '~/stores/safety'
import { safetyApi } from '@/api/safetyApi'
import { DEFAULT_SAFETY_SETTINGS } from '@/types/safety-settings'

vi.mock('@/api/safetyApi', () => ({
  safetyApi: {
    getSettings: vi.fn(),
    updateEnvironmentSafety: vi.fn(),
    resetSettings: vi.fn(),
  },
}))

describe('useSafetyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default settings', () => {
    const store = useSafetyStore()
    expect(store.settings).toEqual(DEFAULT_SAFETY_SETTINGS)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('loadSettings fetches settings from API', async () => {
    const store = useSafetyStore()
    const mockSettings = { ...DEFAULT_SAFETY_SETTINGS, version: 2 }
    vi.mocked(safetyApi.getSettings).mockResolvedValue(mockSettings)

    await store.loadSettings()

    expect(safetyApi.getSettings).toHaveBeenCalled()
    expect(store.settings).toEqual(mockSettings)
    expect(store.loading).toBe(false)
  })

  it('loadSettings handles errors', async () => {
    const store = useSafetyStore()
    vi.mocked(safetyApi.getSettings).mockRejectedValue(new Error('Failed'))

    await store.loadSettings()

    expect(store.error).toBe('Failed')
    expect(store.settings).toEqual(DEFAULT_SAFETY_SETTINGS)
  })
})
