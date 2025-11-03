// 既存の型定義を再エクスポート
import type { Connection, Environment, DatabaseType } from '@/types/connection';
export type { Connection, Environment, DatabaseType } from '@/types/connection';

export interface ConnectionFilter {
  searchQuery?: string;
  environment?: Environment | 'all';
  dbType?: DatabaseType | 'all';
}

export type ConnectionSort = 'name' | 'lastUsed' | 'environment' | 'createdAt';

export interface ConnectionStoreState {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  filter: ConnectionFilter;
  sort: ConnectionSort;
}
