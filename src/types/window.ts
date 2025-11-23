import type { Environment } from '@/types/connection';

/**
 * ウィンドウの種類
 */
export type WindowType = 'launcher' | 'query_builder' | 'settings';

/**
 * ウィンドウ情報
 */
export interface WindowInfo {
  /** ウィンドウラベル */
  label: string;
  /** ウィンドウタイトル */
  title: string;
  /** ウィンドウの種類 */
  windowType: WindowType;
  /** 関連する接続ID */
  connectionId?: string | null;
  /** 環境（バックエンドからは通常返却されないためオプショナル） */
  environment?: Environment | null;
  /** フォーカス状態 */
  focused: boolean;
  /** 可視状態 */
  visible: boolean;
}

/**
 * ウィンドウコンテキスト（各ウィンドウ固有の状態）
 */
export interface WindowContext {
  /** ウィンドウラベル */
  windowLabel: string;
  /** 接続ID */
  connectionId?: string;
  /** 環境タイプ */
  environment?: Environment | string;
  /** ウィンドウの種類 */
  windowType: WindowType;
}

/**
 * ウィンドウイベント
 */
export interface WindowEvent {
  /** イベント種類 */
  type: 'focus' | 'blur' | 'close' | 'resize' | 'move';
  /** ウィンドウラベル */
  label: string;
  /** タイムスタンプ */
  timestamp: number;
}
