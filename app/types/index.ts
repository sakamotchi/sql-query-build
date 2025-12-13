/**
 * 環境タイプ
 */
export type Environment = 'development' | 'test' | 'staging' | 'production'

/**
 * データベースタイプ
 */
export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver' | 'oracle'

/**
 * セキュリティプロバイダー
 */
export type SecurityProvider = 'system' | 'master-password'

/**
 * セキュリティレベル
 */
export type SecurityLevel = 'low' | 'medium' | 'high'

/**
 * カラーモード
 */
export type ColorMode = 'light' | 'dark' | 'auto'

/**
 * 言語
 */
export type Language = 'ja' | 'en'

/**
 * 接続情報インターフェース
 */
export interface Connection {
  id: string
  name: string
  type: DatabaseType
  environment: Environment
  host: string
  port: number
  username: string
  database: string
  password?: string
  customColor?: {
    primary: string
    background: string
  }
  createdAt: string
  updatedAt: string
}

/**
 * アプリケーション設定インターフェース
 */
export interface AppSettings {
  theme: ColorMode
  language: Language
  autoSave: boolean
  windowRestore: boolean
}

/**
 * セキュリティ設定インターフェース
 */
export interface SecuritySettings {
  provider: SecurityProvider
  level: SecurityLevel
  masterPasswordSet?: boolean
}

/**
 * ウィンドウ状態インターフェース
 */
export interface WindowState {
  id: string
  connectionId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMaximized: boolean
  createdAt: string
}

/**
 * テーマ設定インターフェース
 */
export interface ThemeConfig {
  colorMode: ColorMode
  primaryColor: string
  environmentColors: Record<Environment, { primary: string; bg: string }>
}

/**
 * Tauri IPCレスポンス型
 */
export interface TauriResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 接続テスト結果
 */
export interface ConnectionTestResult {
  success: boolean
  message: string
  latency?: number
}
