import { invoke } from '@tauri-apps/api/core'

/**
 * Tauri IPC通信を抽象化するComposable
 */
export const useTauri = () => {
  // Tauriが利用可能かどうかを即座にチェック
  const isAvailable = computed(() => {
    if (import.meta.client && typeof window !== 'undefined') {
      return '__TAURI__' in window
    }
    return false
  })

  /**
   * Tauriコマンドを実行
   */
  const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    if (!isAvailable.value) {
      throw new Error('Tauri is not available. Running in browser mode.')
    }
    return invoke<T>(command, args)
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
