import { describe, it, expect } from 'vitest';
import { getEnvironmentLabel, generateWindowTitle } from '@/utils/windowTitle';

describe('windowTitle', () => {
  describe('getEnvironmentLabel', () => {
    it('development環境のラベルを返す', () => {
      expect(getEnvironmentLabel('development')).toBe('開発環境');
    });

    it('test環境のラベルを返す', () => {
      expect(getEnvironmentLabel('test')).toBe('テスト環境');
    });

    it('staging環境のラベルを返す', () => {
      expect(getEnvironmentLabel('staging')).toBe('ステージング');
    });

    it('production環境のラベルを返す', () => {
      expect(getEnvironmentLabel('production')).toBe('本番環境');
    });

    it('未知の環境はそのまま返す', () => {
      expect(getEnvironmentLabel('custom')).toBe('custom');
    });
  });

  describe('generateWindowTitle', () => {
    it('サフィックスなしでタイトルを生成する', () => {
      const title = generateWindowTitle('TestDB', 'development');
      expect(title).toBe('TestDB [開発環境] - SQL Query Builder');
    });

    it('サフィックスありでタイトルを生成する', () => {
      const title = generateWindowTitle('TestDB', 'production', 'My Query');
      expect(title).toBe('My Query - TestDB [本番環境] - SQL Query Builder');
    });
  });
});
