import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { WindowState, WindowContext, Environment } from '~/types'

export const useWindowStore = defineStore('window', {
  state: () => ({
    windows: [] as WindowState[],
    loading: false,
    error: null as string | null,
    currentContext: null as WindowContext | null,
  }),

  getters: {
    getWindowByConnectionId: (state) => (connectionId: string) =>
      state.windows.find((windowState) => windowState.connectionId === connectionId),
    allWindows: (state) => state.windows,

    /**
     * 現在のウィンドウラベル
     */
    currentWindowLabel(state): string | undefined {
      return state.currentContext?.windowLabel
    },

    /**
     * 現在の接続ID
     */
    currentConnectionId(state): string | undefined {
      return state.currentContext?.connectionId
    },

    /**
     * 現在の環境
     */
    currentEnvironment(state): Environment | undefined {
      return state.currentContext?.environment
    },

    /**
     * ランチャーウィンドウかどうか
     */
    isLauncher(state): boolean {
      return state.currentContext?.windowType === 'launcher'
    },

    /**
     * クエリビルダーウィンドウかどうか
     */
    isQueryBuilder(state): boolean {
      return state.currentContext?.windowType === 'query_builder'
    },

    /**
     * データ変更ビルダーウィンドウかどうか
     */
    isMutationBuilder(state): boolean {
      return state.currentContext?.windowType === 'mutation_builder'
    },

    /**
     * SQLエディタウィンドウかどうか
     */
    isSqlEditor(state): boolean {
      return state.currentContext?.windowType === 'sql_editor'
    },

    /**
     * 設定ウィンドウかどうか
     */
    isSettings(state): boolean {
      return state.currentContext?.windowType === 'settings'
    },
  },

  actions: {
    async loadWindows() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        this.windows = await invokeCommand<WindowState[]>('get_windows')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load windows'
        console.error('Failed to load windows:', error)
      } finally {
        this.loading = false
      }
    },

    async saveWindowState(windowState: Omit<WindowState, 'id' | 'createdAt'>) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        const saved = await invokeCommand<WindowState>('save_window_state', { windowState })

        const index = this.windows.findIndex((window) => window.connectionId === windowState.connectionId)
        if (index !== -1) {
          this.windows[index] = saved
        } else {
          this.windows.push(saved)
        }

        return saved
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save window state'
        console.error('Failed to save window state:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async restoreWindows() {
      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('restore_windows')
      } catch (error) {
        console.error('Failed to restore windows:', error)
        throw error
      }
    },

    async deleteWindow(id: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('delete_window', { id })
        this.windows = this.windows.filter((windowState) => windowState.id !== id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete window'
        console.error('Failed to delete window:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * ウィンドウコンテキストを設定
     *
     * @param context - 設定するコンテキスト（一部のみでも可）
     */
    setContext(context: Partial<WindowContext>) {
      if (this.currentContext) {
        this.currentContext = {
          ...this.currentContext,
          ...context,
        }
      } else {
        this.currentContext = context as WindowContext
      }
    },

    /**
     * 接続情報を設定
     *
     * @param connectionId - 接続ID
     * @param environment - 環境タイプ
     *
     * @example
     * // クエリビルダー画面のonMountedで呼び出す
     * windowStore.setConnectionContext('conn-123', 'development')
     */
    setConnectionContext(connectionId: string, environment: Environment) {
      this.setContext({
        connectionId,
        environment,
      })
    },

    /**
     * コンテキストをリセット
     */
    resetContext() {
      this.currentContext = null
    },

    /**
     * ウィンドウストアを初期化
     *
     * アプリ起動時に呼び出し、現在のウィンドウのコンテキストを設定する。
     * Tauri環境でのみ動作し、ブラウザモードでは安全にスキップする。
     */
    async initialize() {
      // クライアントサイドでない場合はスキップ（SSRガード）
      if (!import.meta.client) {
        console.log('[WindowStore] Skipping initialization (not client-side)')
        return
      }

      try {
        // Tauri APIを動的インポート（ブラウザモード対応）
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const window = getCurrentWindow()
        const label = window.label

        console.log('[WindowStore] Initializing with label:', label)

        // ラベルからコンテキストを解析
        const context = this.parseWindowLabel(label)
        this.currentContext = context

        console.log('[WindowStore] Context initialized:', context)
      } catch (error) {
        // ブラウザモードではエラーになるが、無視して続行
        console.warn('[WindowStore] Failed to initialize (running in browser mode?):', error)

        // ブラウザモード用のデフォルトコンテキスト
        this.currentContext = {
          windowLabel: 'browser',
          windowType: 'launcher',
        }
      }
    },

    /**
     * ウィンドウラベルからコンテキストを解析
     *
     * @param label - Tauriのウィンドウラベル
     * @returns 解析されたウィンドウコンテキスト
     *
     * @example
     * parseWindowLabel('launcher') // => { windowLabel: 'launcher', windowType: 'launcher' }
     * parseWindowLabel('query-builder-conn-123') // => { windowLabel: '...', windowType: 'query_builder', connectionId: 'conn-123' }
     * parseWindowLabel('mutation-builder-conn-123') // => { windowLabel: '...', windowType: 'mutation_builder', connectionId: 'conn-123' }
     */
    parseWindowLabel(label: string): WindowContext {
      // ランチャー
      if (label === 'launcher' || label === 'main') {
        return {
          windowLabel: label,
          windowType: 'launcher',
        }
      }

      // 設定
      if (label === 'settings') {
        return {
          windowLabel: label,
          windowType: 'settings',
        }
      }

      // クエリビルダー
      if (label.startsWith('query-builder-')) {
        const connectionId = label.replace('query-builder-', '')
        return {
          windowLabel: label,
          windowType: 'query_builder',
          connectionId,
        }
      }

      // データ変更ビルダー
      if (label.startsWith('mutation-builder-')) {
        const connectionId = label.replace('mutation-builder-', '')
        return {
          windowLabel: label,
          windowType: 'mutation_builder',
          connectionId,
        }
      }

      // SQLエディタ
      if (label.startsWith('sql_editor_')) {
        const connectionId = label.replace('sql_editor_', '')
        return {
          windowLabel: label,
          windowType: 'sql_editor',
          connectionId,
        }
      }

      // 未知のラベル（デフォルトはクエリビルダー）
      console.warn('[WindowStore] Unknown window label:', label)
      return {
        windowLabel: label,
        windowType: 'query_builder',
      }
    },
  }
})
