import { defineStore } from 'pinia';

/**
 * アプリケーション設定の状態
 */
interface SettingsState {
  /** 起動時にウィンドウを復元するか */
  restoreWindowsOnStartup: boolean;
  /** ウィンドウ位置を記憶するか */
  rememberWindowPositions: boolean;
  /** 終了前に確認ダイアログを表示するか */
  confirmBeforeClose: boolean;
  /** 最後に開いたウィンドウを記憶するか */
  rememberLastOpenedWindows: boolean;
  /** 読み込み完了フラグ */
  loaded: boolean;
}

const STORAGE_KEY = 'app-settings';

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    restoreWindowsOnStartup: true,
    rememberWindowPositions: true,
    confirmBeforeClose: true,
    rememberLastOpenedWindows: true,
    loaded: false,
  }),

  getters: {
    /**
     * ウィンドウ復元が有効かどうか
     */
    shouldRestoreWindows(state): boolean {
      return state.restoreWindowsOnStartup && state.rememberLastOpenedWindows;
    },

    /**
     * 位置の記憶が有効かどうか
     */
    shouldRememberPositions(state): boolean {
      return state.rememberWindowPositions;
    },
  },

  actions: {
    /**
     * 設定を読み込み
     */
    async loadSettings() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          this.restoreWindowsOnStartup = data.restoreWindowsOnStartup ?? true;
          this.rememberWindowPositions = data.rememberWindowPositions ?? true;
          this.confirmBeforeClose = data.confirmBeforeClose ?? true;
          this.rememberLastOpenedWindows = data.rememberLastOpenedWindows ?? true;
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        this.loaded = true;
      }
    },

    /**
     * 設定を保存
     */
    saveSettings() {
      try {
        const data = {
          restoreWindowsOnStartup: this.restoreWindowsOnStartup,
          rememberWindowPositions: this.rememberWindowPositions,
          confirmBeforeClose: this.confirmBeforeClose,
          rememberLastOpenedWindows: this.rememberLastOpenedWindows,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    },

    /**
     * 設定を更新
     */
    updateSettings(settings: Partial<SettingsState>) {
      if (settings.restoreWindowsOnStartup !== undefined) {
        this.restoreWindowsOnStartup = settings.restoreWindowsOnStartup;
      }
      if (settings.rememberWindowPositions !== undefined) {
        this.rememberWindowPositions = settings.rememberWindowPositions;
      }
      if (settings.confirmBeforeClose !== undefined) {
        this.confirmBeforeClose = settings.confirmBeforeClose;
      }
      if (settings.rememberLastOpenedWindows !== undefined) {
        this.rememberLastOpenedWindows = settings.rememberLastOpenedWindows;
      }
      this.saveSettings();
    },

    /**
     * デフォルト設定にリセット
     */
    resetToDefaults() {
      this.restoreWindowsOnStartup = true;
      this.rememberWindowPositions = true;
      this.confirmBeforeClose = true;
      this.rememberLastOpenedWindows = true;
      this.saveSettings();
    },
  },
});
