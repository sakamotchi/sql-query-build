import { computed } from 'vue';
import { useTheme as useVuetifyTheme } from 'vuetify';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';

/**
 * テーマ切り替えコンポーザブル
 */
export function useTheme() {
  const vuetifyTheme = useVuetifyTheme();

  /**
   * 現在のテーマ名
   */
  const currentTheme = computed<ThemeType>({
    get: () => vuetifyTheme.global.name.value as ThemeType,
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
   * テーマをデフォルト(開発環境)に戻す
   */
  const resetTheme = () => {
    vuetifyTheme.global.name.value = 'development';
  };

  /**
   * 利用可能なテーマ一覧を取得
   */
  const availableThemes = computed(() => {
    return Object.keys(THEME_COLORS) as ThemeType[];
  });

  /**
   * 指定されたテーマのカラー情報を取得
   */
  const getThemeInfo = (themeName: ThemeType) => {
    return THEME_COLORS[themeName];
  };

  const isProductionTheme = computed(() => currentTheme.value === 'production');
  const isStagingTheme = computed(() => currentTheme.value === 'staging');
  const needsWarning = computed(() => isProductionTheme.value || isStagingTheme.value);

  /**
   * テーマ反映時の安全な切り替え
   */
  const safeSetTheme = (environment: ThemeType) => {
    try {
      if (!availableThemes.value.includes(environment)) {
        console.warn(`Unknown theme: ${environment}, falling back to development`);
        setThemeByEnvironment('development');
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
