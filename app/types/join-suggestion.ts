export interface JoinSuggestion {
  fromTable: string
  toTable: string
  joinType: string
  conditions: JoinCondition[]
  confidence: number
  reason: string
}

export interface JoinCondition {
  leftColumn: string
  operator: string
  rightColumn: string
}
