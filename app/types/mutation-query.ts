import type { WhereCondition, ConditionGroup } from '@/types/query'

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
export interface UpdateQueryModel {
  /** クエリ種別 */
  type: 'UPDATE'
  /** 更新対象テーブル名 */
  table: string
  /** SET句（カラム=値のペア） */
  setClause: Array<{
    column: string
    value: any
  }>
  /** WHERE条件 */
  whereConditions: Array<WhereCondition | ConditionGroup>
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
