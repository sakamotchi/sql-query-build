export type WindowType = 'launcher' | 'query_builder' | 'settings';

export interface WindowInfo {
  label: string;
  title: string;
  windowType: WindowType;
  connectionId?: string | null;
  focused: boolean;
  visible: boolean;
}
