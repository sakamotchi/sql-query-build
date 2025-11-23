import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWindowStore } from '@/stores/window';
import { windowApi } from '@/api/window';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { WindowInfo } from '@/types/window';

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({ label: 'launcher' })),
}));

vi.mock('@/api/window', () => ({
  windowApi: {
    listWindows: vi.fn(),
    openQueryBuilder: vi.fn(),
    openSettings: vi.fn(),
    focusWindow: vi.fn(),
    closeWindow: vi.fn(),
    findWindowByConnection: vi.fn(),
  },
}));

const windowApiMock = vi.mocked(windowApi);
const getCurrentWindowMock = vi.mocked(getCurrentWindow);

const mockQueryBuilderInfo: WindowInfo = {
  label: 'query-builder-123',
  title: 'QB',
  windowType: 'query_builder',
  connectionId: '123',
  focused: true,
  visible: true,
};

const mockSettingsInfo: WindowInfo = {
  label: 'settings',
  title: 'Settings',
  windowType: 'settings',
  focused: false,
  visible: true,
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  (globalThis as any).__TAURI_IPC__ = {};
  windowApiMock.listWindows.mockResolvedValue([]);
  windowApiMock.openQueryBuilder.mockResolvedValue(mockQueryBuilderInfo);
  windowApiMock.openSettings.mockResolvedValue(mockSettingsInfo);
  windowApiMock.focusWindow.mockResolvedValue();
  windowApiMock.closeWindow.mockResolvedValue();
  windowApiMock.findWindowByConnection.mockResolvedValue(null);
});

afterEach(() => {
  delete (globalThis as any).__TAURI_IPC__;
});

describe('WindowStore', () => {
  it('ラベルからコンテキストを解析できる', () => {
    const store = useWindowStore();

    const launcher = store.parseWindowLabel('launcher');
    expect(launcher.windowType).toBe('launcher');

    const queryBuilder = store.parseWindowLabel('query-builder-conn-123');
    expect(queryBuilder.windowType).toBe('query_builder');
    expect(queryBuilder.connectionId).toBe('conn-123');

    const settings = store.parseWindowLabel('settings');
    expect(settings.windowType).toBe('settings');
  });

  it('initializeで現在のウィンドウコンテキストと一覧を取得する', async () => {
    const store = useWindowStore();
    getCurrentWindowMock.mockReturnValueOnce({ label: 'query-builder-456' } as any);
    windowApiMock.listWindows.mockResolvedValueOnce([mockQueryBuilderInfo]);

    await store.initialize();

    expect(store.currentContext?.windowLabel).toBe('query-builder-456');
    expect(store.isQueryBuilder).toBe(true);
    expect(store.openWindows).toHaveLength(1);
    expect(store.initialized).toBe(true);
  });

  it('接続コンテキストを設定できる', () => {
    const store = useWindowStore();
    store.currentContext = {
      windowLabel: 'query-builder-789',
      windowType: 'query_builder',
    };

    store.setConnectionContext('conn-789', 'production');

    expect(store.currentConnectionId).toBe('conn-789');
    expect(store.currentEnvironment).toBe('production');
  });

  it('既存ウィンドウがあればフォーカスし、無ければ新規作成する', async () => {
    const store = useWindowStore();
    windowApiMock.findWindowByConnection.mockResolvedValueOnce({
      ...mockQueryBuilderInfo,
      label: 'query-builder-existing',
    });

    const existing = await store.focusOrOpenQueryBuilder('123', 'DB', 'development');

    expect(windowApiMock.findWindowByConnection).toHaveBeenCalledWith('123');
    expect(windowApiMock.focusWindow).toHaveBeenCalledWith('query-builder-existing');
    expect(windowApiMock.openQueryBuilder).not.toHaveBeenCalled();
    expect(existing?.label).toBe('query-builder-existing');
  });

  it('クエリビルダーを新規に開くと一覧を更新する', async () => {
    const store = useWindowStore();
    windowApiMock.listWindows.mockResolvedValueOnce([mockQueryBuilderInfo]);

    const created = await store.openQueryBuilder('123', 'DB', 'development');

    expect(windowApiMock.openQueryBuilder).toHaveBeenCalledWith('123', 'DB', 'development');
    expect(windowApiMock.listWindows).toHaveBeenCalledTimes(1);
    expect(created?.label).toBe(mockQueryBuilderInfo.label);
  });
});
