import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
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
  mockThemeRef.value = 'development';
});

describe('useTheme', () => {
  it('should switch theme by environment', () => {
    const theme = useTheme();

    theme.setThemeByEnvironment('production');
    expect(theme.currentTheme.value).toBe('production');

    theme.setThemeByEnvironment('development');
    expect(theme.currentTheme.value).toBe('development');
  });

  it('should return correct theme info', () => {
    const theme = useTheme();

    theme.setThemeByEnvironment('production');
    expect(theme.currentThemeInfo.value.label).toBe('本番環境');
    expect(theme.currentThemeInfo.value.primary).toBe('#F44336');
  });

  it('should detect production theme', () => {
    const theme = useTheme();

    theme.setThemeByEnvironment('production');
    expect(theme.isProductionTheme.value).toBe(true);

    theme.setThemeByEnvironment('development');
    expect(theme.isProductionTheme.value).toBe(false);
  });

  it('should detect warning environments', () => {
    const theme = useTheme();

    theme.setThemeByEnvironment('production');
    expect(theme.needsWarning.value).toBe(true);

    theme.setThemeByEnvironment('staging');
    expect(theme.needsWarning.value).toBe(true);

    theme.setThemeByEnvironment('development');
    expect(theme.needsWarning.value).toBe(false);
  });
});
