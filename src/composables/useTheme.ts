import { computed } from 'vue';
import { useTheme as useVuetifyTheme } from 'vuetify';
import { useThemeStore } from '@/stores/theme';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';

/**
 * テーマ管理コンポーザブル
 */
export function useTheme() {
  const store = useThemeStore();
  const vuetifyTheme = useVuetifyTheme();

  const applyVuetifyTheme = (theme: ThemeType) => {
    vuetifyTheme.global.name.value = theme;
  };

  /**
   * 現在のテーマ
   */
  const currentTheme = computed({
    get: () => store.currentTheme,
    set: (value: ThemeType) => {
      store.setTheme(value);
      applyVuetifyTheme(store.currentTheme);
    },
  });

  /**
   * 現在のテーマ情報
   */
  const currentThemeInfo = computed(() => store.currentThemeInfo);

  /**
   * プライマリーカラー
   */
  const primaryColor = computed(() => currentThemeInfo.value.primary);

  /**
   * バックグラウンドカラー
   */
  const backgroundColor = computed(() => currentThemeInfo.value.background);

  /**
   * 環境に応じてテーマを設定
   */
  const setThemeByEnvironment = (environment: ThemeType) => {
    if (store.preferences.autoSwitchTheme) {
      store.setTheme(environment);
      applyVuetifyTheme(store.currentTheme);
    }
  };

  /**
   * ウィンドウ別にテーマを設定
   */
  const setWindowTheme = (windowId: string, theme: ThemeType) => {
    store.setWindowTheme(windowId, theme);
    applyVuetifyTheme(store.currentTheme);
  };

  /**
   * テーマをリセット
   */
  const resetTheme = () => {
    store.resetTheme();
    applyVuetifyTheme(store.currentTheme);
  };

  /**
   * テーマ情報を取得
   */
  const getThemeInfo = (themeName: ThemeType) => {
    return THEME_COLORS[themeName];
  };

  /**
   * 利用可能なテーマ一覧
   */
  const availableThemes = computed(() => {
    return Object.keys(THEME_COLORS) as ThemeType[];
  });

  /**
   * 安全にテーマを設定（存在しないテーマはデフォルトへフォールバック）
   */
  const safeSetTheme = (themeName: ThemeType) => {
    try {
      if (!availableThemes.value.includes(themeName)) {
        console.warn(`Unknown theme: ${themeName}, falling back to default`);
        store.resetTheme();
        applyVuetifyTheme(store.currentTheme);
        return false;
      }

      store.setTheme(themeName);
      applyVuetifyTheme(store.currentTheme);
      return true;
    } catch (error) {
      console.error('Failed to set theme:', error);
      store.resetTheme();
      applyVuetifyTheme(store.currentTheme);
      return false;
    }
  };

  return {
    // 状態
    currentTheme,
    currentThemeInfo,
    primaryColor,
    backgroundColor,

    // ゲッター
    isProductionTheme: computed(() => store.isProductionTheme),
    isStagingTheme: computed(() => store.isStagingTheme),
    needsWarning: computed(() => store.needsWarning),
    shouldShowWarning: computed(() => store.shouldShowWarning),
    animationsEnabled: computed(() => store.animationsEnabled),
    availableThemes,

    // アクション
    setThemeByEnvironment,
    setWindowTheme,
    resetTheme,
    getThemeInfo,
    safeSetTheme,

    // 設定
    updatePreferences: store.updatePreferences,
    toggleWarningBanner: store.toggleWarningBanner,
    toggleAnimations: store.toggleAnimations,

    // Vuetify同期
    syncVuetifyTheme: applyVuetifyTheme,

    // ストアの参照
    store,
  };
}
