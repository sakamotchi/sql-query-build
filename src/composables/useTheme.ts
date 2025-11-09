import { computed } from 'vue';
import { useTheme as useVuetifyTheme } from 'vuetify';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';

/**
 * テーマ切り替え用コンポーザブル
 */
export function useTheme() {
  const vuetifyTheme = useVuetifyTheme();

  /**
   * 現在のテーマ名
   */
  const currentTheme = computed<ThemeType>({
    get: () => (vuetifyTheme.global.name.value as ThemeType) ?? 'development',
    set: (themeName: ThemeType) => {
      vuetifyTheme.global.name.value = themeName;
    },
  });

  /**
   * 現在のテーマカラー情報
   */
  const currentThemeInfo = computed(() => {
    return THEME_COLORS[currentTheme.value];
  });

  /**
   * 現在のプライマリーカラー
   */
  const primaryColor = computed(() => {
    return vuetifyTheme.current.value.colors.primary;
  });

  /**
   * 現在のバックグラウンドカラー
   */
  const backgroundColor = computed(() => {
    return vuetifyTheme.current.value.colors.background;
  });

  /**
   * 環境に応じてテーマを切り替え
   */
  const setThemeByEnvironment = (environment: ThemeType) => {
    vuetifyTheme.global.name.value = environment;
  };

  /**
   * テーマをデフォルトに戻す
   */
  const resetTheme = () => {
    vuetifyTheme.global.name.value = 'development';
  };

  /**
   * 利用可能なテーマ一覧
   */
  const availableThemes = computed(() => {
    return Object.keys(THEME_COLORS) as ThemeType[];
  });

  /**
   * 指定されたテーマ情報
   */
  const getThemeInfo = (themeName: ThemeType) => {
    return THEME_COLORS[themeName];
  };

  /**
   * 本番環境テーマかどうか
   */
  const isProductionTheme = computed(() => {
    return currentTheme.value === 'production';
  });

  /**
   * ステージング環境テーマかどうか
   */
  const isStagingTheme = computed(() => {
    return currentTheme.value === 'staging';
  });

  /**
   * 注意が必要な環境かどうか
   */
  const needsWarning = computed(() => {
    return isProductionTheme.value || isStagingTheme.value;
  });

  /**
   * エラーハンドリング付きのテーマ切り替え
   */
  const safeSetTheme = (environment: ThemeType) => {
    try {
      if (!availableThemes.value.includes(environment)) {
        console.warn(`Unknown theme: ${environment}, falling back to development`);
        resetTheme();
        return false;
      }

      setThemeByEnvironment(environment);
      return true;
    } catch (error) {
      console.error('Failed to set theme:', error);
      resetTheme();
      return false;
    }
  };

  return {
    currentTheme,
    currentThemeInfo,
    primaryColor,
    backgroundColor,
    availableThemes,
    isProductionTheme,
    isStagingTheme,
    needsWarning,
    setThemeByEnvironment,
    resetTheme,
    getThemeInfo,
    safeSetTheme,
  };
}
