import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';
import { useThemeStore } from '@/stores/theme';

const mockThemeRef = ref<ThemeType>('development');

vi.mock('vuetify', () => {
  return {
    useTheme: () => ({
      global: {
        name: {
          get value() {
            return mockThemeRef.value;
          },
          set value(themeName: ThemeType) {
            mockThemeRef.value = themeName;
          },
        },
      },
      current: computed(() => ({
        colors: {
          primary: THEME_COLORS[mockThemeRef.value].primary,
          background: THEME_COLORS[mockThemeRef.value].background,
        },
      })),
    }),
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  mockThemeRef.value = 'development';
});

describe('ThemeStore', () => {
  it('デフォルト状態で初期化される', () => {
    const store = useThemeStore();
    expect(store.currentTheme).toBe('development');
    expect(store.defaultTheme).toBe('development');
    expect(store.preferences.autoSwitchTheme).toBe(true);
  });

  it('テーマを設定できる', () => {
    const store = useThemeStore();

    store.setTheme('production');
    expect(store.currentTheme).toBe('production');
    expect(store.isProductionTheme).toBe(true);
  });

  it('警告が必要な環境を判定できる', () => {
    const store = useThemeStore();

    store.setTheme('production');
    expect(store.needsWarning).toBe(true);

    store.setTheme('staging');
    expect(store.needsWarning).toBe(true);

    store.setTheme('development');
    expect(store.needsWarning).toBe(false);
  });

  it('設定を保存・読み込みできる', () => {
    const store = useThemeStore();

    store.setDefaultTheme('staging');
    store.updatePreferences({
      enableAnimations: false,
      showWarningBanner: false,
    });

    setActivePinia(createPinia());
    mockThemeRef.value = 'development';

    const newStore = useThemeStore();
    newStore.initialize();

    expect(newStore.defaultTheme).toBe('staging');
    expect(newStore.currentTheme).toBe('staging');
    expect(newStore.preferences.enableAnimations).toBe(false);
    expect(newStore.preferences.showWarningBanner).toBe(false);
  });

  it('ウィンドウごとのテーマを管理できる', () => {
    const store = useThemeStore();

    store.setWindowTheme('window-1', 'production');
    store.setWindowTheme('window-2', 'development');

    expect(store.getWindowTheme('window-1')).toBe('production');
    expect(store.getWindowTheme('window-2')).toBe('development');

    store.clearWindowTheme('window-1');
    expect(store.getWindowTheme('window-1')).toBe(store.defaultTheme);

    store.clearAllWindowThemes();
    expect(Object.keys(store.windowThemes)).toHaveLength(0);
  });

  it('設定トグルが機能する', () => {
    const store = useThemeStore();

    const warningInitially = store.preferences.showWarningBanner;
    store.toggleWarningBanner();
    expect(store.preferences.showWarningBanner).toBe(!warningInitially);

    const animationsInitially = store.preferences.enableAnimations;
    store.toggleAnimations();
    expect(store.preferences.enableAnimations).toBe(!animationsInitially);
  });
});
