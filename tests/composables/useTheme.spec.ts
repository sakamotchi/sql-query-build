import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type { ThemeType } from '@/types/theme';
import { THEME_COLORS } from '@/types/theme';
import { useTheme } from '@/composables/useTheme';

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
  mockThemeRef.value = 'development';
  localStorage.clear();
});

describe('useTheme', () => {
  it('autoSwitchが有効なら環境に応じてテーマを切り替える', () => {
    const theme = useTheme();

    theme.setThemeByEnvironment('production');
    expect(theme.currentTheme.value).toBe('production');
    expect(theme.currentThemeInfo.value.primary).toBe(THEME_COLORS.production.primary);
    expect(mockThemeRef.value).toBe('production');
  });

  it('autoSwitchが無効ならsetThemeByEnvironmentで切り替わらない', () => {
    const theme = useTheme();
    theme.updatePreferences({ autoSwitchTheme: false });

    theme.setThemeByEnvironment('production');
    expect(theme.currentTheme.value).toBe('development');
  });

  it('警告表示関連のフラグを取得できる', () => {
    const theme = useTheme();

    theme.store.setTheme('production');
    expect(theme.isProductionTheme.value).toBe(true);
    expect(theme.needsWarning.value).toBe(true);
    expect(theme.shouldShowWarning.value).toBe(true);

    theme.toggleWarningBanner();
    expect(theme.shouldShowWarning.value).toBe(false);
  });

  it('アニメーション設定をトグルできる', () => {
    const theme = useTheme();

    const initial = theme.animationsEnabled.value;
    theme.toggleAnimations();
    expect(theme.animationsEnabled.value).toBe(!initial);
  });

  it('safeSetThemeで未知のテーマはデフォルトにフォールバックする', () => {
    const theme = useTheme();

    const result = theme.safeSetTheme('production');
    expect(result).toBe(true);
    expect(theme.currentTheme.value).toBe('production');
    expect(mockThemeRef.value).toBe('production');

    // @ts-expect-error テスト用に未知テーマを渡す
    const invalidResult = theme.safeSetTheme('unknown');
    expect(invalidResult).toBe(false);
    expect(theme.currentTheme.value).toBe(theme.store.defaultTheme);
    expect(mockThemeRef.value).toBe(theme.store.defaultTheme);
  });
});
