import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

describe('SettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('デフォルト値を持つ', () => {
    const store = useSettingsStore();

    expect(store.restoreWindowsOnStartup).toBe(true);
    expect(store.rememberWindowPositions).toBe(true);
    expect(store.confirmBeforeClose).toBe(true);
    expect(store.rememberLastOpenedWindows).toBe(true);
  });

  it('localStorageから設定を読み込む', async () => {
    localStorage.setItem(
      'app-settings',
      JSON.stringify({
        restoreWindowsOnStartup: false,
        rememberWindowPositions: false,
      })
    );

    const store = useSettingsStore();
    await store.loadSettings();

    expect(store.restoreWindowsOnStartup).toBe(false);
    expect(store.rememberWindowPositions).toBe(false);
    expect(store.loaded).toBe(true);
  });

  it('設定を保存する', () => {
    const store = useSettingsStore();
    store.updateSettings({
      restoreWindowsOnStartup: false,
    });

    const saved = JSON.parse(localStorage.getItem('app-settings') || '{}');
    expect(saved.restoreWindowsOnStartup).toBe(false);
  });

  it('shouldRestoreWindowsを正しく計算する', () => {
    const store = useSettingsStore();

    expect(store.shouldRestoreWindows).toBe(true);

    store.restoreWindowsOnStartup = false;
    expect(store.shouldRestoreWindows).toBe(false);

    store.restoreWindowsOnStartup = true;
    store.rememberLastOpenedWindows = false;
    expect(store.shouldRestoreWindows).toBe(false);
  });

  it('デフォルトにリセットする', () => {
    const store = useSettingsStore();
    store.updateSettings({
      restoreWindowsOnStartup: false,
      confirmBeforeClose: false,
    });

    store.resetToDefaults();

    expect(store.restoreWindowsOnStartup).toBe(true);
    expect(store.confirmBeforeClose).toBe(true);
  });
});
