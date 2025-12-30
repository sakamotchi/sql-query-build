import { invoke } from '@tauri-apps/api/core'
import type { ExportOptions, ExportResult } from '../types/export'
import type { QueryExecuteResult } from '../types/query-result'

export async function exportQueryResult(result: QueryExecuteResult, options: ExportOptions): Promise<ExportResult> {
  // Be careful with large results, passing them via IPC might be heavy.
  // But for now verify with small datasets.
  return await invoke<ExportResult>('export_query_result', {
    result,
    options
  })
}
