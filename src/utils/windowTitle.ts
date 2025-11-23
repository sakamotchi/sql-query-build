import { getCurrentWindow } from '@tauri-apps/api/window';
import { windowApi } from '@/api/window';

/**
 * 環境ラベルを取得
 */
export const getEnvironmentLabel = (environment: string): string => {
  const labels: Record<string, string> = {
    development: '開発環境',
    test: 'テスト環境',
    staging: 'ステージング',
    production: '本番環境',
  };
  return labels[environment] || environment;
};

/**
 * ウィンドウタイトルを生成
 */
export const generateWindowTitle = (
  connectionName: string,
  environment: string,
  suffix?: string
): string => {
  const envLabel = getEnvironmentLabel(environment);
  let title = `${connectionName} [${envLabel}] - SQL Query Builder`;

  if (suffix) {
    title = `${suffix} - ${title}`;
  }

  return title;
};

/**
 * 現在のウィンドウタイトルを更新
 */
export const updateCurrentWindowTitle = async (
  connectionName: string,
  environment: string,
  suffix?: string
): Promise<void> => {
  try {
    const window = getCurrentWindow();
    const title = generateWindowTitle(connectionName, environment, suffix);
    await windowApi.setWindowTitle(window.label, title);
  } catch (error) {
    console.error('Failed to update window title:', error);
  }
};

/**
 * クエリ名を含むタイトルに更新
 */
export const updateTitleWithQueryName = async (
  connectionName: string,
  environment: string,
  queryName: string
): Promise<void> => {
  await updateCurrentWindowTitle(connectionName, environment, queryName);
};
