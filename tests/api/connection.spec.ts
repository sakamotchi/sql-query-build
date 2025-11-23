import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { ConnectionAPI } from '@/api/connection';
import type { Connection } from '@/stores/types';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe('ConnectionAPI', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('getByIdでパラメータ名がバックエンドと一致する', async () => {
    const mockConnection: Connection = {
      id: 'conn-1',
      name: 'test',
      environment: 'development',
      host: 'localhost',
      port: 5432,
      database: 'db',
      username: 'user',
      password: 'pass',
      dbType: 'postgresql',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    invokeMock.mockResolvedValueOnce(mockConnection);

    const result = await ConnectionAPI.getById('conn-1', true);

    expect(result).toEqual(mockConnection);
    expect(invokeMock).toHaveBeenCalledWith('get_connection', {
      id: 'conn-1',
      includePasswordDecrypted: true,
    });
  });

  it('getByIdのincludePassword省略時はfalseとして渡す', async () => {
    invokeMock.mockResolvedValueOnce(null);

    await ConnectionAPI.getById('conn-2');

    expect(invokeMock).toHaveBeenCalledWith('get_connection', {
      id: 'conn-2',
      includePasswordDecrypted: false,
    });
  });
});
