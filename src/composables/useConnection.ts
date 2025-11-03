import { computed } from 'vue';
import { useConnectionStore } from '@/stores/connection';
import type { Connection } from '@/stores/types';

export function useConnection() {
  const store = useConnectionStore();

  /**
   * 環境別のテーマカラーを取得
   */
  const getEnvironmentColor = (environment: Connection['environment']): string => {
    const colors = {
      development: '#4CAF50',
      test: '#2196F3',
      staging: '#FF9800',
      production: '#F44336',
    };
    return colors[environment];
  };

  /**
   * 環境別のラベルを取得
   */
  const getEnvironmentLabel = (environment: Connection['environment']): string => {
    const labels = {
      development: '開発環境',
      test: 'テスト環境',
      staging: 'ステージング環境',
      production: '本番環境',
    };
    return labels[environment];
  };

  /**
   * データベース種別のラベルを取得
   */
  const getDatabaseTypeLabel = (dbType: Connection['dbType']): string => {
    const labels = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      sqlite: 'SQLite',
    };
    return labels[dbType];
  };

  /**
   * データベース種別のアイコンを取得
   */
  const getDatabaseTypeIcon = (dbType: Connection['dbType']): string => {
    const icons = {
      postgresql: 'mdi-elephant',
      mysql: 'mdi-dolphin',
      sqlite: 'mdi-database',
    };
    return icons[dbType];
  };

  return {
    // ストアの参照
    store,

    // ゲッター
    connections: computed(() => store.connections),
    filteredConnections: computed(() => store.filteredConnections),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    recentConnections: computed(() => store.recentConnections),

    // アクション
    fetchConnections: store.fetchConnections,
    fetchConnectionById: store.fetchConnectionById,
    createConnection: store.createConnection,
    updateConnection: store.updateConnection,
    deleteConnection: store.deleteConnection,
    duplicateConnection: store.duplicateConnection,
    markConnectionAsUsed: store.markConnectionAsUsed,

    // フィルター
    setFilter: store.setFilter,
    resetFilter: store.resetFilter,
    setSort: store.setSort,
    clearError: store.clearError,

    // ヘルパー関数
    getEnvironmentColor,
    getEnvironmentLabel,
    getDatabaseTypeLabel,
    getDatabaseTypeIcon,
  };
}
