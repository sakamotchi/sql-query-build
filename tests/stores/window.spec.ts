import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWindowStore } from '~/stores/window';
import type { WindowInfo } from '~/types';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WindowStore - Context Management', () => {
  describe('parseWindowLabel', () => {
    it('ランチャーラベルを正しく解析', () => {
      const store = useWindowStore();

      const launcher = store.parseWindowLabel('launcher');
      expect(launcher.windowType).toBe('launcher');
      expect(launcher.windowLabel).toBe('launcher');

      const main = store.parseWindowLabel('main');
      expect(main.windowType).toBe('launcher');
    });

    it('クエリビルダーラベルを正しく解析', () => {
      const store = useWindowStore();

      const qb = store.parseWindowLabel('query-builder-conn-123');
      expect(qb.windowType).toBe('query_builder');
      expect(qb.connectionId).toBe('conn-123');
      expect(qb.windowLabel).toBe('query-builder-conn-123');
    });

    it('設定ラベルを正しく解析', () => {
      const store = useWindowStore();

      const settings = store.parseWindowLabel('settings');
      expect(settings.windowType).toBe('settings');
      expect(settings.windowLabel).toBe('settings');
    });

    it('未知のラベルはクエリビルダーとして扱う', () => {
      const store = useWindowStore();

      const unknown = store.parseWindowLabel('unknown-label');
      expect(unknown.windowType).toBe('query_builder');
      expect(unknown.windowLabel).toBe('unknown-label');
    });
  });

  describe('setConnectionContext', () => {
    it('接続情報を設定できる', () => {
      const store = useWindowStore();

      // 初期状態
      expect(store.currentContext).toBeNull();

      // コンテキストを設定
      store.currentContext = {
        windowLabel: 'query-builder-123',
        windowType: 'query_builder',
      };

      store.setConnectionContext('conn-123', 'development');

      // 設定されたことを確認
      expect(store.currentConnectionId).toBe('conn-123');
      expect(store.currentEnvironment).toBe('development');
    });
  });

  describe('isQueryBuilder/isLauncher/isSettings', () => {
    it('isQueryBuilderがウィンドウタイプを正しく判定する', () => {
      const store = useWindowStore();

      store.currentContext = {
        windowLabel: 'query-builder-123',
        windowType: 'query_builder',
      };

      expect(store.isQueryBuilder).toBe(true);
      expect(store.isLauncher).toBe(false);
      expect(store.isSettings).toBe(false);
    });

    it('isLauncherがウィンドウタイプを正しく判定する', () => {
      const store = useWindowStore();

      store.currentContext = {
        windowLabel: 'launcher',
        windowType: 'launcher',
      };

      expect(store.isLauncher).toBe(true);
      expect(store.isQueryBuilder).toBe(false);
      expect(store.isSettings).toBe(false);
    });

    it('isSettingsがウィンドウタイプを正しく判定する', () => {
      const store = useWindowStore();

      store.currentContext = {
        windowLabel: 'settings',
        windowType: 'settings',
      };

      expect(store.isSettings).toBe(true);
      expect(store.isLauncher).toBe(false);
      expect(store.isQueryBuilder).toBe(false);
    });
  });

  describe('resetContext', () => {
    it('resetContextでコンテキストをクリアできる', () => {
      const store = useWindowStore();

      store.currentContext = {
        windowLabel: 'test',
        windowType: 'launcher',
      };

      store.resetContext();

      expect(store.currentContext).toBeNull();
      expect(store.currentConnectionId).toBeUndefined();
    });
  });

  describe('initialize', () => {
    it('ブラウザモードでエラーにならない', async () => {
      const store = useWindowStore();

      // エラーを投げずに完了することを確認
      await expect(store.initialize()).resolves.toBeUndefined();

      // デフォルトコンテキストが設定されることを確認
      expect(store.currentContext).toBeTruthy();
    });
  });
});
