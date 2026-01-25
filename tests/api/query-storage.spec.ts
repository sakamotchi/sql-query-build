import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args)
}))

import { queryStorageApi } from '~/api/query-storage'

describe('queryStorageApi - folder management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list_folders コマンドを正しいパラメータで呼び出す', async () => {
    const expected = ['/開発環境', '/本番環境']
    mockInvoke.mockResolvedValue(expected)

    const result = await queryStorageApi.listFolders()

    expect(mockInvoke).toHaveBeenCalledWith('list_folders')
    expect(result).toEqual(expected)
  })

  it('move_query コマンドを正しいパラメータで呼び出す', async () => {
    mockInvoke.mockResolvedValue(undefined)

    await queryStorageApi.moveQuery('query-123', '/開発環境')

    expect(mockInvoke).toHaveBeenCalledWith('move_query', {
      queryId: 'query-123',
      folderPath: '/開発環境'
    })
  })

  it('rename_folder コマンドを正しいパラメータで呼び出す', async () => {
    mockInvoke.mockResolvedValue(undefined)

    await queryStorageApi.renameFolder('/開発環境', '/Dev')

    expect(mockInvoke).toHaveBeenCalledWith('rename_folder', {
      oldPath: '/開発環境',
      newPath: '/Dev'
    })
  })

  it('delete_folder コマンドを正しいパラメータで呼び出す', async () => {
    mockInvoke.mockResolvedValue(undefined)

    await queryStorageApi.deleteFolder('/開発環境')

    expect(mockInvoke).toHaveBeenCalledWith('delete_folder', {
      folderPath: '/開発環境'
    })
  })
})
