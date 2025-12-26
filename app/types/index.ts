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
export type SecurityProvider = 'simple' | 'master-password' | 'keychain'

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
 * ウィンドウの種類
 */
export type WindowType = 'launcher' | 'query_builder' | 'settings'

/**
 * ウィンドウ情報インターフェース（Tauriから返却される）
 */
export interface WindowInfo {
  label: string
  title: string
  windowType: WindowType
  connectionId: string | null
  focused: boolean
  visible: boolean
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
 * ウィンドウコンテキスト（各ウィンドウ固有の状態）
 */
export interface WindowContext {
  /** ウィンドウラベル（Tauriのウィンドウ識別子） */
  windowLabel: string

  /** ウィンドウの種類 */
  windowType: WindowType

  /** 関連する接続ID（クエリビルダーの場合のみ） */
  connectionId?: string

  /** 環境タイプ（クエリビルダーの場合のみ） */
  environment?: Environment
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
