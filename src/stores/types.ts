// 既存の型定義を再エクスポート
import type { Connection, Environment, DatabaseType } from '@/types/connection';
import type { ThemeType } from '@/types/theme';

export type { Connection, Environment, DatabaseType } from '@/types/connection';

export interface ConnectionFilter {
  searchQuery?: string;
  environment?: Environment | 'all';
  dbType?: DatabaseType | 'all';
}

export type ConnectionSort = 'name' | 'lastUsed' | 'environment' | 'createdAt';

export interface ConnectionStoreState {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  filter: ConnectionFilter;
  sort: ConnectionSort;
}

/**
 * テーマストアの状態
 */
export interface ThemeStoreState {
  currentTheme: ThemeType;
  defaultTheme: ThemeType;
  windowThemes: Record<string, ThemeType>;
  preferences: ThemePreferences;
}

/**
 * テーマ設定
 */
export interface ThemePreferences {
  enableAnimations: boolean;
  showWarningBanner: boolean;
  autoSwitchTheme: boolean;
  customColors?: Record<ThemeType, CustomThemeColors>;
}

/**
 * カスタムテーマカラー (将来拡張用)
 */
export interface CustomThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
}
