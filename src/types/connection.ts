/**
 * データベース接続情報の型定義
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite';

export interface Connection {
  id: string;                    // UUID
  name: string;                  // 接続名
  environment: Environment;      // 環境タイプ
  themeColor: string;            // テーマカラー
  host: string;                  // ホスト名
  port: number;                  // ポート番号
  database: string;              // データベース名
  username: string;              // ユーザー名
  password: string;              // 暗号化されたパスワード
  dbType: DatabaseType;          // データベース種別
  ssl: boolean;                  // SSL使用フラグ
  createdAt: string;             // 作成日時 (ISO 8601)
  updatedAt: string;             // 更新日時 (ISO 8601)
  lastUsedAt?: string;           // 最終使用日時 (ISO 8601)
}
