import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { windowApi } from '@/api/window';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe('windowApi', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('openQueryBuilderが正しいパラメータで呼ばれる', async () => {
    invokeMock.mockResolvedValueOnce({
      label: 'query-builder-123',
      title: 'Test DB [開発環境] - SQL Query Builder',
      windowType: 'query_builder',
      connectionId: '123',
      focused: true,
      visible: true,
    });

    const result = await windowApi.openQueryBuilder('123', 'Test DB', 'development');

    expect(invokeMock).toHaveBeenCalledWith('open_query_builder_window', {
      connectionId: '123',
      connectionName: 'Test DB',
      environment: 'development',
    });
    expect(result.label).toBe('query-builder-123');
  });

  it('listWindowsが呼ばれる', async () => {
    invokeMock.mockResolvedValueOnce([]);

    await windowApi.listWindows();

    expect(invokeMock).toHaveBeenCalledWith('list_windows');
  });

  it('getSavedWindowStatesが呼ばれる', async () => {
    invokeMock.mockResolvedValueOnce([]);

    await windowApi.getSavedWindowStates();

    expect(invokeMock).toHaveBeenCalledWith('get_saved_window_states');
  });

  it('clearWindowStatesが呼ばれる', async () => {
    invokeMock.mockResolvedValueOnce(undefined);

    await windowApi.clearWindowStates();

    expect(invokeMock).toHaveBeenCalledWith('clear_window_states');
  });
});
