import type { Environment } from '@/types'

/**
 * 確認ダイアログを表示する危険度レベルの閾値
 */
export type ConfirmationThreshold = 'warning' | 'danger'

/**
 * 環境別の安全設定
 */
export interface EnvironmentSafetyConfig {
  /** 確認ダイアログを有効にするか */
  confirmationEnabled: boolean

  /** 確認ダイアログを表示する危険度の閾値 */
  confirmationThreshold: ConfirmationThreshold

  /** カウントダウン秒数（0〜10） */
  countdownSeconds: number

  /** DROPクエリを禁止するか */
  disableDrop: boolean

  /** TRUNCATEクエリを禁止するか */
  disableTruncate: boolean
}

/**
 * 全環境の安全設定
 */
export interface SafetySettings {
  version: number
  environments: Record<Environment, EnvironmentSafetyConfig>
}

/**
 * デフォルト設定
 */
export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  version: 1,
  environments: {
    development: {
      confirmationEnabled: true,
      confirmationThreshold: 'danger',
      countdownSeconds: 0,
      disableDrop: false,
      disableTruncate: false,
    },
    test: {
      confirmationEnabled: true,
      confirmationThreshold: 'danger',
      countdownSeconds: 0,
      disableDrop: false,
      disableTruncate: false,
    },
    staging: {
      confirmationEnabled: true,
      confirmationThreshold: 'warning',
      countdownSeconds: 3,
      disableDrop: false,
      disableTruncate: false,
    },
    production: {
      confirmationEnabled: true,
      confirmationThreshold: 'warning',
      countdownSeconds: 5,
      disableDrop: true,
      disableTruncate: true,
    },
  },
}
