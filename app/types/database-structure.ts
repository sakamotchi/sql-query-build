/**
 * データベース構造全体
 */
export interface DatabaseStructure {
  /** 接続ID */
  connectionId: string;
  /** データベース名 */
  databaseName: string;
  /** データベース種別 */
  databaseType: 'postgresql' | 'mysql' | 'sqlite';
  /** スキーマ一覧 */
  schemas: Schema[];
  /** 取得日時 */
  fetchedAt: string;
}

/**
 * データベース構造サマリー（軽量）
 */
export interface DatabaseStructureSummary {
  /** 接続ID */
  connectionId: string;
  /** データベース名 */
  databaseName: string;
  /** データベース種別 */
  databaseType: 'postgresql' | 'mysql' | 'sqlite';
  /** スキーマ一覧 */
  schemas: SchemaSummary[];
  /** 取得日時 */
  fetchedAt: string;
}

/**
 * スキーマ情報（サマリー）
 */
export interface SchemaSummary {
  /** スキーマ名 */
  name: string;
  /** システムスキーマかどうか */
  isSystem: boolean;
  /** テーブル一覧 */
  tables: TableSummary[];
  /** ビュー一覧 */
  views: TableSummary[];
}

/**
 * テーブル情報（サマリー）
 */
export interface TableSummary {
  /** テーブル名 */
  name: string;
  /** スキーマ名 */
  schema: string;
  /** コメント/説明 */
  comment: string | null;
  /** 推定行数 */
  estimatedRowCount: number | null;
}

/**
 * スキーマ情報
 */
export interface Schema {
  /** スキーマ名 */
  name: string;
  /** システムスキーマかどうか */
  isSystem: boolean;
  /** テーブル一覧 */
  tables: Table[];
  /** ビュー一覧 */
  views: View[];
}

/**
 * テーブル情報
 */
export interface Table {
  /** テーブル名 */
  name: string;
  /** スキーマ名 */
  schema: string;
  /** コメント/説明 */
  comment: string | null;
  /** 推定行数 */
  estimatedRowCount: number | null;
  /** カラム一覧 */
  columns: Column[];
  /** プライマリキー */
  primaryKey: PrimaryKey | null;
  /** インデックス一覧 */
  indexes: Index[];
  /** 外部キー一覧 */
  foreignKeys: ForeignKey[];
  /** 参照されている外部キー */
  referencedBy: ForeignKeyReference[];
}

/**
 * ビュー情報
 */
export interface View {
  /** ビュー名 */
  name: string;
  /** スキーマ名 */
  schema: string;
  /** コメント/説明 */
  comment: string | null;
  /** カラム一覧 */
  columns: Column[];
  /** ビュー定義SQL(オプション) */
  definition: string | null;
}

/**
 * カラム情報
 */
export interface Column {
  /** カラム名 */
  name: string;
  /** データ型 */
  dataType: string;
  /** 表示用データ型(長さ等含む) */
  displayType: string;
  /** NULL許可 */
  nullable: boolean;
  /** デフォルト値 */
  defaultValue: string | null;
  /** プライマリキーの一部か */
  isPrimaryKey: boolean;
  /** 外部キーの一部か */
  isForeignKey: boolean;
  /** ユニーク制約があるか */
  isUnique: boolean;
  /** 自動インクリメントか */
  isAutoIncrement: boolean;
  /** カラム位置(順序) */
  ordinalPosition: number;
  /** コメント/説明 */
  comment: string | null;
}

/**
 * プライマリキー情報
 */
export interface PrimaryKey {
  /** 制約名 */
  name: string;
  /** カラム名リスト */
  columns: string[];
}

/**
 * インデックス情報
 */
export interface Index {
  /** インデックス名 */
  name: string;
  /** ユニークインデックスか */
  isUnique: boolean;
  /** プライマリキーインデックスか */
  isPrimary: boolean;
  /** カラム名リスト */
  columns: string[];
  /** インデックス種別 */
  type: string;
}

/**
 * 外部キー情報
 */
export interface ForeignKey {
  /** 制約名 */
  name: string;
  /** 元カラム */
  columns: string[];
  /** 参照先スキーマ */
  referencedSchema: string;
  /** 参照先テーブル */
  referencedTable: string;
  /** 参照先カラム */
  referencedColumns: string[];
  /** ON DELETE アクション */
  onDelete: string;
  /** ON UPDATE アクション */
  onUpdate: string;
}

/**
 * 外部キー参照情報(このテーブルを参照している外部キー)
 */
export interface ForeignKeyReference {
  /** 参照元スキーマ */
  sourceSchema: string;
  /** 参照元テーブル */
  sourceTable: string;
  /** 参照元カラム */
  sourceColumns: string[];
  /** このテーブルのカラム */
  targetColumns: string[];
  /** 制約名 */
  constraintName: string;
}
