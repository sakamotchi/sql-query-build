import type { WhereCondition, ConditionGroup } from '@/types/query'
import type { WhereClause } from '@/types/query-model'

/**
 * データ変更クエリの種別
 */
export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * INSERT クエリモデル
 */
export interface InsertQueryModel {
  /** クエリ種別 */
  type: 'INSERT'
  /** 挿入先テーブル名 */
  table: string
  /** 挿入するカラム名の配列 */
  columns: string[]
  /** 挿入する値の配列（複数行対応） */
  values: Array<Record<string, any>>
}

/**
 * UPDATE クエリモデル
 */
export interface UpdateSetValue {
  /** 更新値 */
  value: any
  /** NULL指定 */
  isNull: boolean
}

export interface UpdateQueryModel {
  /** クエリ種別 */
  type: 'UPDATE'
  /** 更新対象テーブル名 */
  table: string
  /** SET句（カラム=値のペア） */
  setClause: Record<string, UpdateSetValue>
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | ConditionGroup>
}

/**
 * UPDATE SQL生成用モデル
 */
export interface UpdateSqlQueryModel {
  /** クエリ種別 */
  type: 'UPDATE'
  /** 更新対象テーブル名 */
  table: string
  /** SET句 */
  setClause: Record<string, UpdateSetValue>
  /** WHERE句 */
  whereClause: WhereClause | null
}

/**
 * UPDATE SQL生成結果
 */
export interface UpdateSqlResult {
  /** 生成SQL */
  sql: string
  /** WHERE句有無 */
  hasWhereClause: boolean
}

/**
 * DELETE SQL生成用モデル
 */
export interface DeleteSqlQueryModel {
  /** クエリ種別 */
  type: 'DELETE'
  /** 削除対象テーブル名 */
  table: string
  /** WHERE句 */
  whereClause: WhereClause | null
}

/**
 * DELETE クエリモデル
 */
export interface DeleteQueryModel {
  /** クエリ種別 */
  type: 'DELETE'
  /** 削除対象テーブル名 */
  table: string
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | ConditionGroup>
}

/**
 * データ変更クエリモデル（ユニオン型）
 */
export type MutationQueryModel =
  | InsertQueryModel
  | UpdateQueryModel
  | DeleteQueryModel

export type { WhereCondition, ConditionGroup }
