/**
 * 環境テーマタイプ
 */
export type ThemeType = 'development' | 'test' | 'staging' | 'production';

/**
 * テーマカラー情報
 */
export interface ThemeColorInfo {
  name: ThemeType;
  label: string;
  primary: string;
  secondary: string;
  background: string;
  description: string;
}

/**
 * テーマカラー一覧
 */
export const THEME_COLORS: Record<ThemeType, ThemeColorInfo> = {
  development: {
    name: 'development',
    label: '開発環境',
    primary: '#4CAF50',
    secondary: '#66BB6A',
    background: '#F1F8E9',
    description: '安全な作業環境を示す緑色',
  },
  test: {
    name: 'test',
    label: 'テスト環境',
    primary: '#2196F3',
    secondary: '#42A5F5',
    background: '#E3F2FD',
    description: '検証環境を示す青色',
  },
  staging: {
    name: 'staging',
    label: 'ステージング環境',
    primary: '#FF9800',
    secondary: '#FFA726',
    background: '#FFF3E0',
    description: '注意が必要な環境を示すオレンジ色',
  },
  production: {
    name: 'production',
    label: '本番環境',
    primary: '#F44336',
    secondary: '#EF5350',
    background: '#FFEBEE',
    description: '危険を示す赤色',
  },
};
