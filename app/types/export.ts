/**
 * エクスポート形式
 * Rust側の ExportFormat enum と対応
 * serde(rename_all = "camelCase") により "csv", "excel", "json" にシリアライズされる
 */
export type ExportFormatType = 'csv' | 'excel' | 'json'

export interface ExportOptions {
    path: string
    format: ExportFormatType
}

export interface ExportResult {
    success: boolean
    message: string | null
    rowsAffected: number
}
