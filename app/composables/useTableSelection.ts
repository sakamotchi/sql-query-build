import { useQueryBuilderStore } from '@/stores/query-builder'
import type { Table } from '@/types/database-structure'
import type { SelectedTable } from '@/types/query'

/**
 * テーブル選択機能を提供するComposable
 */
export const useTableSelection = () => {
  const queryBuilderStore = useQueryBuilderStore()

  /**
   * エイリアスを生成
   */
  const generateAlias = (tableName: string): string => {
    const existingAliases = new Set(
      queryBuilderStore.selectedTables.map((t) => t.alias)
    )

    // テーブル名の先頭文字をベースにする
    let baseAlias = tableName.charAt(0).toLowerCase()

    // スネークケースの場合は各単語の先頭文字を使用
    if (tableName.includes('_')) {
      baseAlias = tableName
        .split('_')
        .map((word) => word.charAt(0))
        .join('')
        .toLowerCase()
    }

    // 重複がなければそのまま使用
    if (!existingAliases.has(baseAlias)) {
      return baseAlias
    }

    // 数字を付けて重複を回避
    let counter = 1
    while (existingAliases.has(`${baseAlias}${counter}`)) {
      counter++
    }
    return `${baseAlias}${counter}`
  }

  /**
   * テーブルを追加
   */
  const addTable = (table: Table) => {
    const tableId = `${table.schema}.${table.name}`

    // 既に追加されている場合はスキップ
    if (queryBuilderStore.selectedTables.some((t) => t.id === tableId)) {
      return false
    }

    // デフォルトエイリアスを生成
    const alias = generateAlias(table.name)

    const selectedTable: SelectedTable = {
      id: tableId,
      schema: table.schema,
      name: table.name,
      alias,
      columns: table.columns,
    }

    queryBuilderStore.addTable(selectedTable)
    return true
  }

  /**
   * テーブルが選択されているかどうか
   */
  const isTableSelected = (table: Table): boolean => {
    const tableId = `${table.schema}.${table.name}`
    return queryBuilderStore.selectedTables.some((t) => t.id === tableId)
  }

  return {
    addTable,
    isTableSelected,
    generateAlias,
  }
}
