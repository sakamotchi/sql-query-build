export type QueryType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'drop'
  | 'truncate'
  | 'alter'
  | 'create'
  | 'unknown'

export type RiskLevel = 'safe' | 'warning' | 'danger'

export interface RiskFactor {
  code: string
  message: string
}

export interface QueryAnalysisResult {
  queryType: QueryType
  riskLevel: RiskLevel
  riskFactors: RiskFactor[]
  affectedTables: string[]
  hasWhereClause: boolean
}
