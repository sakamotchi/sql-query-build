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
  savePassword: boolean;         // パスワード保存フラグ
  dbType: DatabaseType;          // データベース種別
  ssl: boolean;                  // SSL使用フラグ
  sshTunnel: boolean;            // SSHトンネル使用フラグ
  sshHost?: string;              // SSHホスト名
  sshPort?: number;              // SSHポート番号
  sshUsername?: string;          // SSHユーザー名
  sshPassword?: string;          // SSHパスワード
  timeout: number;               // 接続タイムアウト(秒)
  createdAt: string;             // 作成日時 (ISO 8601)
  updatedAt: string;             // 更新日時 (ISO 8601)
  lastUsedAt?: string;           // 最終使用日時 (ISO 8601)
}
