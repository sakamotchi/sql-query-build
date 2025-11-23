import { defineStore } from 'pinia';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';
import type { ThemeStoreState, ThemePreferences } from './types';

const STORAGE_KEY_THEME = 'app-theme-preferences';

export const useThemeStore = defineStore('theme', {
  state: (): ThemeStoreState => ({
    currentTheme: 'development',
    defaultTheme: 'development',
    windowThemes: {},
    preferences: {
      enableAnimations: true,
      showWarningBanner: true,
      autoSwitchTheme: true,
    },
  }),

  getters: {
    /**
     * 現在のテーマ情報
     */
    currentThemeInfo(state) {
      return THEME_COLORS[state.currentTheme];
    },

    /**
     * 現在のテーマがプロダクションかどうか
     */
    isProductionTheme(state): boolean {
      return state.currentTheme === 'production';
    },

    /**
     * 現在のテーマがステージングかどうか
     */
    isStagingTheme(state): boolean {
      return state.currentTheme === 'staging';
    },

    /**
     * 警告が必要な環境かどうか
     */
    needsWarning(state): boolean {
      return state.currentTheme === 'production' || state.currentTheme === 'staging';
    },

    /**
     * 警告バナーを表示するかどうか
     */
    shouldShowWarning(state): boolean {
      return state.preferences.showWarningBanner && this.needsWarning;
    },

    /**
     * アニメーションが有効かどうか
     */
    animationsEnabled(state): boolean {
      return state.preferences.enableAnimations;
    },

    /**
     * 指定されたウィンドウのテーマを取得
     */
    getWindowTheme: (state) => (windowId: string): ThemeType => {
      return state.windowThemes[windowId] || state.defaultTheme;
    },
  },

  actions: {
    /**
     * テーマを設定
     */
    setTheme(theme: ThemeType) {
      if (!this.isValidTheme(theme)) {
        console.warn(`Invalid theme: ${theme}, falling back to default`);
        this.currentTheme = this.defaultTheme;
        return;
      }

      this.currentTheme = theme;
    },

    /**
     * ウィンドウ別にテーマを設定
     */
    setWindowTheme(windowId: string, theme: ThemeType) {
      if (!this.isValidTheme(theme)) {
        console.warn(`Invalid theme for window ${windowId}: ${theme}`);
        return;
      }

      this.windowThemes[windowId] = theme;
      this.setTheme(theme);
    },

    /**
     * デフォルトテーマを設定
     */
    setDefaultTheme(theme: ThemeType) {
      if (!this.isValidTheme(theme)) {
        console.warn(`Invalid default theme: ${theme}`);
        return;
      }

      this.defaultTheme = theme;
      this.savePreferences();
    },

    /**
     * テーマをリセット
     */
    resetTheme() {
      this.setTheme(this.defaultTheme);
    },

    /**
     * ウィンドウテーマをクリア
     */
    clearWindowTheme(windowId: string) {
      delete this.windowThemes[windowId];
    },

    /**
     * すべてのウィンドウテーマをクリア
     */
    clearAllWindowThemes() {
      this.windowThemes = {};
    },

    /**
     * 設定を更新
     */
    updatePreferences(preferences: Partial<ThemePreferences>) {
      this.preferences = {
        ...this.preferences,
        ...preferences,
      };
      this.savePreferences();
    },

    /**
     * 警告バナー表示を切り替え
     */
    toggleWarningBanner() {
      this.preferences.showWarningBanner = !this.preferences.showWarningBanner;
      this.savePreferences();
    },

    /**
     * アニメーション有効/無効を切り替え
     */
    toggleAnimations() {
      this.preferences.enableAnimations = !this.preferences.enableAnimations;
      this.savePreferences();
    },

    /**
     * 設定をlocalStorageに保存
     */
    savePreferences() {
      try {
        const data = {
          defaultTheme: this.defaultTheme,
          preferences: this.preferences,
        };
        localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save theme preferences:', error);
      }
    },

    /**
     * 設定をlocalStorageから読み込み
     */
    loadPreferences() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_THEME);
        if (!saved) return;

        const data = JSON.parse(saved);

        if (data.defaultTheme && this.isValidTheme(data.defaultTheme)) {
          this.defaultTheme = data.defaultTheme;
        }

        if (data.preferences) {
          this.preferences = {
            ...this.preferences,
            ...data.preferences,
          };
        }
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      }
    },

    /**
     * テーマが有効かどうかをチェック
     */
    isValidTheme(theme: string): theme is ThemeType {
      return ['development', 'test', 'staging', 'production'].includes(theme);
    },

    /**
     * 初期化
     */
    initialize() {
      this.loadPreferences();
      this.setTheme(this.defaultTheme);
    },
  },
});
