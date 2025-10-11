import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  storageWrite,
  storageRead,
  storageDelete,
  storageListKeys,
  storageExists
} from './storage'

// Tauri APIをモック
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

import { invoke } from '@tauri-apps/api/core'

describe('Storage API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('storageWrite', () => {
    it('should call invoke with correct parameters', async () => {
      const key = 'test_key'
      const data = { name: 'test', value: 42 }

      await storageWrite(key, data)

      expect(invoke).toHaveBeenCalledWith('storage_write', { key, data })
    })
  })

  describe('storageRead', () => {
    it('should call invoke and return data', async () => {
      const key = 'test_key'
      const expectedData = { name: 'test', value: 42 }

      vi.mocked(invoke).mockResolvedValueOnce(expectedData)

      const result = await storageRead(key)

      expect(invoke).toHaveBeenCalledWith('storage_read', { key })
      expect(result).toEqual(expectedData)
    })
  })

  describe('storageDelete', () => {
    it('should call invoke with correct parameters', async () => {
      const key = 'test_key'

      await storageDelete(key)

      expect(invoke).toHaveBeenCalledWith('storage_delete', { key })
    })
  })

  describe('storageListKeys', () => {
    it('should call invoke and return keys array', async () => {
      const expectedKeys = ['key1', 'key2', 'key3']

      vi.mocked(invoke).mockResolvedValueOnce(expectedKeys)

      const result = await storageListKeys()

      expect(invoke).toHaveBeenCalledWith('storage_list_keys')
      expect(result).toEqual(expectedKeys)
    })
  })

  describe('storageExists', () => {
    it('should call invoke and return true when data exists', async () => {
      const key = 'test_key'

      vi.mocked(invoke).mockResolvedValueOnce(true)

      const result = await storageExists(key)

      expect(invoke).toHaveBeenCalledWith('storage_exists', { key })
      expect(result).toBe(true)
    })

    it('should call invoke and return false when data does not exist', async () => {
      const key = 'test_key'

      vi.mocked(invoke).mockResolvedValueOnce(false)

      const result = await storageExists(key)

      expect(invoke).toHaveBeenCalledWith('storage_exists', { key })
      expect(result).toBe(false)
    })
  })
})
