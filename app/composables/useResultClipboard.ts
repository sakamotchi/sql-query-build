import type { QueryExecuteResult, QueryResultColumn, QueryValue } from '@/types/query-result'

export type CopyFormat = 'csv' | 'tsv' | 'markdown'

export interface CopyOptions {
  /** マークダウン形式に含めるSQL文（省略時はSQLブロックを省略） */
  sql?: string
}

/**
 * クリップボード向けの値フォーマット
 * NULL は空文字を返す（NULL表示が必要な場合は呼び出し側で判定）
 */
export function formatValueForClipboard(value: QueryValue, column: QueryResultColumn): string {
  if (value === null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value.toString()
  if (Array.isArray(value)) return `[${value.length} bytes]`
  if (column.dataType.includes('JSON')) {
    try {
      return JSON.stringify(JSON.parse(value as string))
    } catch {
      // fall through
    }
  }
  return String(value)
}

/** CSV フィールドのエスケープ（RFC 4180） */
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** CSV 形式で文字列を生成 */
export function formatAsCsv(result: QueryExecuteResult): string {
  const headers = result.columns.map((col) => escapeCsvField(col.name))
  const lines = [headers.join(',')]
  for (const row of result.rows) {
    const cells = row.values.map((val, i) => {
      const col = result.columns[i] ?? { name: '', dataType: 'TEXT', nullable: true }
      const formatted = formatValueForClipboard(val, col)
      return escapeCsvField(formatted)
    })
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

/** TSV 形式で文字列を生成 */
export function formatAsTsv(result: QueryExecuteResult): string {
  const headers = result.columns.map((col) => col.name.replace(/[\t\r\n]/g, ' '))
  const lines = [headers.join('\t')]
  for (const row of result.rows) {
    const cells = row.values.map((val, i) => {
      const col = result.columns[i] ?? { name: '', dataType: 'TEXT', nullable: true }
      const formatted = formatValueForClipboard(val, col)
      return formatted.replace(/[\t\r\n]/g, ' ')
    })
    lines.push(cells.join('\t'))
  }
  return lines.join('\n')
}

/** Markdown テーブル形式で文字列を生成 */
export function formatAsMarkdown(result: QueryExecuteResult, options: CopyOptions = {}): string {
  const parts: string[] = []

  if (options.sql) {
    parts.push('```sql')
    parts.push(options.sql.trim())
    parts.push('```')
    parts.push('')
  }

  const seconds = (result.executionTimeMs / 1000).toFixed(3)
  parts.push(`**${result.rowCount} rows** in ${seconds}s`)
  parts.push('')

  const headers = result.columns.map((col) => col.name)
  parts.push(`| ${headers.join(' | ')} |`)
  parts.push(`| ${headers.map(() => '---').join(' | ')} |`)

  for (const row of result.rows) {
    const cells = row.values.map((val, i) => {
      const col = result.columns[i] ?? { name: '', dataType: 'TEXT', nullable: true }
      const formatted = val === null ? 'NULL' : formatValueForClipboard(val, col)
      return formatted.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
    })
    parts.push(`| ${cells.join(' | ')} |`)
  }

  return parts.join('\n')
}

/** クリップボードへのコピー機能を提供する composable */
export function useResultClipboard() {
  const { t } = useI18n()
  const toast = useToast()

  async function copyResultAs(
    format: CopyFormat,
    result: QueryExecuteResult,
    options: CopyOptions = {},
  ): Promise<void> {
    let text: string
    let formatLabel: string

    switch (format) {
      case 'csv':
        text = formatAsCsv(result)
        formatLabel = t('common.copyTo.csv')
        break
      case 'tsv':
        text = formatAsTsv(result)
        formatLabel = t('common.copyTo.tsv')
        break
      case 'markdown':
        text = formatAsMarkdown(result, options)
        formatLabel = t('common.copyTo.markdown')
        break
    }

    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: t('common.copyTo.success', { format: formatLabel }),
        color: 'success',
        duration: 2500,
      })
    } catch {
      toast.add({
        title: t('common.copyTo.error'),
        color: 'error',
        duration: 3000,
      })
    }
  }

  return { copyResultAs }
}
