import { invoke } from '@tauri-apps/api/core'

/** フロントエンド側のinvokeタイムアウト（ミリ秒）。Rustのタイムアウト（30秒）より長く設定 */
const INVOKE_TIMEOUT_MS = 35_000

/**
 * Tauri IPC通信を抽象化するComposable
 */
export const useTauri = () => {
  // Tauriが利用可能かどうかを即座にチェック
  const isAvailable = computed(() => {
    if (typeof window === 'undefined') return false

    // Tauri v2では __TAURI_INTERNALS__ または import.meta.env.TAURI_PLATFORM で判定
    return (
      '__TAURI_INTERNALS__' in window ||
      import.meta.env.TAURI_PLATFORM !== undefined ||
      '__TAURI__' in window
    )
  })

  /**
   * Tauriコマンドを実行
   */
  const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    if (!isAvailable.value) {
      throw new Error('Tauri is not available. Running in browser mode.')
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Command "${command}" timed out after ${INVOKE_TIMEOUT_MS / 1000}s`)),
        INVOKE_TIMEOUT_MS
      )
    )

    return Promise.race([invoke<T>(command, args), timeoutPromise])
  }

  /**
   * エラーハンドリング付きでTauriコマンドを実行
   */
  const safeInvokeCommand = async <T>(
    command: string,
    args?: Record<string, unknown>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await invokeCommand<T>(command, args)
    } catch (error) {
      console.error(`Tauri command "${command}" failed:`, error)
      return fallback
    }
  }

  return {
    isAvailable,
    invokeCommand,
    safeInvokeCommand
  }
}
