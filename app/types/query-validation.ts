export type ValidationStatus = 'valid' | 'warning' | 'error'

export interface TableValidationInfo {
  schema: string
  table: string
  exists: boolean
}

export interface QueryValidationResult {
  status: ValidationStatus
  connectionMatches: boolean
  tables: TableValidationInfo[]
  missingTables: Array<{ schema: string; table: string }>
  message?: string
  originalConnectionId?: string
  currentConnectionId?: string
}

export interface ValidateQueryTablesRequest {
  tables: Array<{ schema: string; table: string }>
  connectionId: string
}

export interface ValidateQueryTablesResponse {
  tables: TableValidationInfo[]
}
