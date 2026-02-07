import { invoke } from '@tauri-apps/api/core';
import type {
  DatabaseStructure,
  DatabaseStructureSummary,
  Schema,
  Table,
  Column,
} from '@/types/database-structure';

/**
 * データベース構造取得API
 */
export const databaseStructureApi = {
  /**
   * データベース構造全体を取得
   */
  async getDatabaseStructure(connectionId: string): Promise<DatabaseStructure> {
    return invoke('get_database_structure', { connectionId });
  },

  /**
   * データベース構造サマリーを取得（軽量）
   */
  async getDatabaseStructureSummary(connectionId: string): Promise<DatabaseStructureSummary> {
    return invoke('get_database_structure_summary', { connectionId });
  },

  /**
   * スキーマ一覧を取得
   */
  async getSchemas(connectionId: string): Promise<Schema[]> {
    return invoke('get_schemas', { connectionId });
  },

  /**
   * テーブル一覧を取得
   */
  async getTables(connectionId: string, schema: string): Promise<Table[]> {
    return invoke('get_tables', { connectionId, schema });
  },

  /**
   * カラム一覧を取得
   */
  async getColumns(
    connectionId: string,
    schema: string,
    table: string
  ): Promise<Column[]> {
    return invoke('get_columns', { connectionId, schema, table });
  },
};
