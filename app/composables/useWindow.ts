import { computed } from 'vue'
import { useWindowStore } from '~/stores/window'
import { windowApi } from '~/api/window'
import type { WindowInfo, Environment } from '~/types'

/**
 * ウィンドウ操作コンポーザブル
 *
 * ウィンドウの開閉、コンテキスト管理などを提供する。
 * ブラウザモードでもエラーが出ないように設計されている。
 *
 * @example
 * ```vue
 * <script setup>
 * const { openQueryBuilder, isQueryBuilder, connectionId } = useWindow()
 *
 * async function handleConnect(connection) {
 *   await openQueryBuilder(connection.id, connection.name, connection.environment)
 * }
 * </script>
 * ```
 */
export function useWindow() {
  const store = useWindowStore()

  // =========================================
  // 状態（Computed）
  // =========================================

  /**
   * 現在の接続ID
   */
  const connectionId = computed(() => store.currentConnectionId)

  /**
   * 現在の環境
   */
  const environment = computed(() => store.currentEnvironment)

  /**
   * クエリビルダーウィンドウかどうか
   */
  const isQueryBuilder = computed(() => store.isQueryBuilder)

  /**
   * ランチャーウィンドウかどうか
   */
  const isLauncher = computed(() => store.isLauncher)

  /**
   * 設定ウィンドウかどうか
   */
  const isSettings = computed(() => store.isSettings)

  // =========================================
  // アクション（メソッド）
  // =========================================

  /**
   * クエリビルダーウィンドウを開く
   *
   * 既存のウィンドウがあればフォーカスし、なければ新規作成する。
   * これにより、同じ接続に対して複数のウィンドウが開かれることを防ぐ。
   *
   * @param connectionId - 接続ID
   * @param connectionName - 接続名（ウィンドウタイトル用）
   * @param environment - 環境タイプ
   * @returns ウィンドウ情報、失敗時はnull
   *
   * @example
   * ```typescript
   * const info = await openQueryBuilder('conn-123', 'MyDB', 'development')
   * if (info) {
   *   console.log('Window opened:', info.label)
   * }
   * ```
   */
  const openQueryBuilder = async (
    connectionId: string,
    connectionName: string,
    environment: Environment | string
  ): Promise<WindowInfo | null> => {
    try {
      // 既存ウィンドウを検索
      const existing = await windowApi.findWindowByConnection(connectionId)

      if (existing) {
        // 既存ウィンドウにフォーカス
        await windowApi.focusWindow(existing.label)
        console.log('[useWindow] Focused existing window:', existing.label)
        return existing
      }

      // 新規ウィンドウを作成
      const info = await windowApi.openQueryBuilder(
        connectionId,
        connectionName,
        environment
      )
      console.log('[useWindow] Opened new window:', info.label)
      return info
    } catch (error) {
      console.error('[useWindow] Failed to open query builder:', error)
      return null
    }
  }

  /**
   * 設定ウィンドウを開く
   *
   * @returns ウィンドウ情報、失敗時はnull
   *
   * @example
   * ```typescript
   * const info = await openSettings()
   * ```
   */
  const openSettings = async (): Promise<WindowInfo | null> => {
    try {
      const info = await windowApi.openSettings()
      console.log('[useWindow] Opened settings window:', info.label)
      return info
    } catch (error) {
      console.error('[useWindow] Failed to open settings:', error)
      return null
    }
  }

  /**
   * 接続コンテキストを設定
   *
   * クエリビルダー画面のonMountedなどで呼び出し、
   * 現在のウィンドウがどの接続に紐づいているかを設定する。
   *
   * @param connectionId - 接続ID
   * @param environment - 環境タイプ
   *
   * @example
   * ```typescript
   * onMounted(() => {
   *   setConnectionContext('conn-123', 'development')
   * })
   * ```
   */
  const setConnectionContext = (
    connectionId: string,
    environment: Environment
  ): void => {
    store.setConnectionContext(connectionId, environment)
    console.log('[useWindow] Connection context set:', { connectionId, environment })
  }

  // =========================================
  // 返却
  // =========================================

  return {
    // 状態
    connectionId,
    environment,
    isQueryBuilder,
    isLauncher,
    isSettings,

    // アクション
    openQueryBuilder,
    openSettings,
    setConnectionContext,
  }
}
