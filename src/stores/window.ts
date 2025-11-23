import { defineStore } from 'pinia';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { windowApi } from '@/api/window';
import type { WindowContext, WindowInfo } from '@/types/window';
import type { Environment } from '@/types/connection';

const isTauriEnvironment = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_IPC__' in window || '__TAURI_INTERNALS__' in window);

interface WindowStoreState {
  /** 現在のウィンドウコンテキスト */
  currentContext: WindowContext | null;
  /** 開いているウィンドウリスト */
  openWindows: WindowInfo[];
  /** 初期化済みフラグ */
  initialized: boolean;
  /** 読み込み中フラグ */
  loading: boolean;
  /** エラー */
  error: string | null;
}

export const useWindowStore = defineStore('window', {
  state: (): WindowStoreState => ({
    currentContext: null,
    openWindows: [],
    initialized: false,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * 現在のウィンドウラベル
     */
    currentWindowLabel(state): string | undefined {
      return state.currentContext?.windowLabel;
    },

    /**
     * 現在の接続ID
     */
    currentConnectionId(state): string | undefined {
      return state.currentContext?.connectionId;
    },

    /**
     * 現在の環境
     */
    currentEnvironment(state): Environment | string | undefined {
      return state.currentContext?.environment;
    },

    /**
     * ランチャーウィンドウかどうか
     */
    isLauncher(state): boolean {
      return state.currentContext?.windowType === 'launcher';
    },

    /**
     * クエリビルダーウィンドウかどうか
     */
    isQueryBuilder(state): boolean {
      return state.currentContext?.windowType === 'query_builder';
    },

    /**
     * 設定ウィンドウかどうか
     */
    isSettings(state): boolean {
      return state.currentContext?.windowType === 'settings';
    },

    /**
     * 開いているウィンドウ数
     */
    windowCount(state): number {
      return state.openWindows.length;
    },

    /**
     * 他のクエリビルダーウィンドウ
     */
    otherQueryBuilders(state): WindowInfo[] {
      return state.openWindows.filter(
        (w) => w.windowType === 'query_builder' && w.label !== state.currentContext?.windowLabel
      );
    },
  },

  actions: {
    /**
     * ウィンドウストアを初期化
     */
    async initialize() {
      if (this.initialized) return;

      this.loading = true;
      this.error = null;

      try {
        if (!isTauriEnvironment()) {
          this.currentContext = {
            windowLabel: 'launcher',
            windowType: 'launcher',
          };
          this.initialized = true;
          return;
        }

        const window = getCurrentWindow();
        const label = window.label;

        const context = this.parseWindowLabel(label);
        this.currentContext = context;

        await this.refreshWindowList();

        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to initialize';
        console.error('Failed to initialize window store:', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * ウィンドウラベルからコンテキストを解析
     */
    parseWindowLabel(label: string): WindowContext {
      if (label === 'launcher' || label === 'main') {
        return {
          windowLabel: label,
          windowType: 'launcher',
        };
      }

      if (label === 'settings') {
        return {
          windowLabel: label,
          windowType: 'settings',
        };
      }

      if (label.startsWith('query-builder-')) {
        const connectionId = label.replace('query-builder-', '');
        return {
          windowLabel: label,
          connectionId,
          windowType: 'query_builder',
        };
      }

      return {
        windowLabel: label,
        windowType: 'query_builder',
      };
    },

    /**
     * ウィンドウコンテキストを設定
     */
    setContext(context: Partial<WindowContext>) {
      if (this.currentContext) {
        this.currentContext = {
          ...this.currentContext,
          ...context,
        };
      }
    },

    /**
     * 接続情報を設定
     */
    setConnectionContext(connectionId: string, environment: Environment | string) {
      this.setContext({
        connectionId,
        environment,
      });
    },

    /**
     * ウィンドウリストを更新
     */
    async refreshWindowList() {
      if (!isTauriEnvironment()) {
        this.openWindows = [];
        return;
      }

      try {
        this.openWindows = await windowApi.listWindows();
      } catch (error) {
        console.error('Failed to refresh window list:', error);
      }
    },

    /**
     * クエリビルダーウィンドウを開く
     */
    async openQueryBuilder(
      connectionId: string,
      connectionName: string,
      environment: Environment | string
    ): Promise<WindowInfo | null> {
      if (!isTauriEnvironment()) {
        console.warn('Window operations are available only in the Tauri runtime.');
        return null;
      }

      try {
        const info = await windowApi.openQueryBuilder(connectionId, connectionName, environment);
        await this.refreshWindowList();
        return info;
      } catch (error) {
        console.error('Failed to open query builder window:', error);
        return null;
      }
    },

    /**
     * 設定ウィンドウを開く
     */
    async openSettings(): Promise<WindowInfo | null> {
      if (!isTauriEnvironment()) {
        console.warn('Window operations are available only in the Tauri runtime.');
        return null;
      }

      try {
        const info = await windowApi.openSettings();
        await this.refreshWindowList();
        return info;
      } catch (error) {
        console.error('Failed to open settings window:', error);
        return null;
      }
    },

    /**
     * ウィンドウにフォーカス
     */
    async focusWindow(label: string) {
      if (!isTauriEnvironment()) return;

      try {
        await windowApi.focusWindow(label);
      } catch (error) {
        console.error('Failed to focus window:', error);
      }
    },

    /**
     * ウィンドウを閉じる
     */
    async closeWindow(label?: string) {
      if (!isTauriEnvironment()) return;

      try {
        const targetLabel = label || this.currentWindowLabel;
        if (targetLabel) {
          await windowApi.closeWindow(targetLabel);
          await this.refreshWindowList();
        }
      } catch (error) {
        console.error('Failed to close window:', error);
      }
    },

    /**
     * 接続IDでウィンドウを検索してフォーカス
     */
    async focusOrOpenQueryBuilder(
      connectionId: string,
      connectionName: string,
      environment: Environment | string
    ): Promise<WindowInfo | null> {
      if (!isTauriEnvironment()) {
        console.warn('Window operations are available only in the Tauri runtime.');
        return null;
      }

      try {
        const existing = await windowApi.findWindowByConnection(connectionId);

        if (existing) {
          await this.focusWindow(existing.label);
          return existing;
        }

        return await this.openQueryBuilder(connectionId, connectionName, environment);
      } catch (error) {
        console.error('Failed to focus or open query builder:', error);
        return null;
      }
    },

    /**
     * コンテキストをリセット
     */
    resetContext() {
      this.currentContext = null;
      this.initialized = false;
    },
  },
});
