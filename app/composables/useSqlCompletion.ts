import * as monaco from 'monaco-editor'
import { useDatabaseStructureStore } from '~/stores/database-structure'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { SQL_KEYWORDS, COMPLETION_KIND_MAP } from '~/constants/sql-keywords'
import { getFunctionCatalog } from '~/data/function-catalog'
import type { CompletionContext } from '~/types/sql-completion'

const MAX_SUGGESTIONS_PER_CATEGORY = 100

/**
 * テーブル名からエイリアスを自動生成
 * @example user_settings → us
 * @example order_items → oi
 * @example table_1 → t1
 */
function generateTableAlias(tableName: string): string {
  // スネークケースを分割して最初の文字を結合
  const parts = tableName.split('_').filter(part => part.length > 0)

  if (parts.length === 0) return tableName.substring(0, 2)
  if (parts.length === 1) {
    // 単一単語の場合は最初の2文字
    return tableName.substring(0, 2).toLowerCase()
  }

  // 各単語の最初の文字を結合
  return parts.map(part => part[0]).join('').toLowerCase()
}

/**
 * SQL文からテーブルエイリアスを抽出
 * @example "FROM users AS u" → { u: "users" }
 * @example "JOIN orders o" → { o: "orders" }
 */
function extractAliasesFromSql(sql: string): Record<string, string> {
  const aliases: Record<string, string> = {}

  // FROM table_name AS alias または FROM table_name alias パターン
  const fromPattern = /FROM\s+(\w+(?:\.\w+)?)\s+(?:AS\s+)?(\w+)/gi
  const joinPattern = /JOIN\s+(\w+(?:\.\w+)?)\s+(?:AS\s+)?(\w+)/gi

  let match
  while ((match = fromPattern.exec(sql)) !== null) {
    if (!match || !match[1] || !match[2]) continue
    const tableName = match[1].split('.').pop() || match[1] // スキーマ名を除去
    const alias = match[2]
    aliases[alias] = tableName
  }

  while ((match = joinPattern.exec(sql)) !== null) {
    if (!match || !match[1] || !match[2]) continue
    const tableName = match[1].split('.').pop() || match[1]
    const alias = match[2]
    aliases[alias] = tableName
  }

  return aliases
}

export function useSqlCompletion() {
  const databaseStructureStore = useDatabaseStructureStore()
  const sqlEditorStore = useSqlEditorStore()

  /**
   * 補完候補を提供（Monaco Editorから呼ばれる）
   */
  function provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.CompletionList {
    const context = createCompletionContext(model, position)

    const items: monaco.languages.CompletionItem[] = []

    items.push(...getKeywordCompletions(context))
    items.push(...getFunctionCompletions(context))
    items.push(...getAliasCompletions(context))

    if (context.connectionId) {
      items.push(...getTableCompletions(context))
      items.push(...getColumnCompletions(context))
    }

    return { suggestions: items }
  }

  /**
   * 補完コンテキストを作成
   */
  function createCompletionContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): CompletionContext {
    const lineText = model.getLineContent(position.lineNumber)
    const textUntilPosition = lineText.substring(0, position.column - 1)

    // currentWordを取得（ドットを含む単語全体を取得）
    // 例: "WHERE ci.user_" → currentWord = "ci.user_"
    const wordMatch = textUntilPosition.match(/[\w.]+$/)
    const currentWord = wordMatch ? wordMatch[0] : ''

    // previousWordを取得（スペース区切り）
    const words = textUntilPosition.trim().split(/\s+/)
    const previousWord = words.length > 1 ? words[words.length - 2] : null

    // SQL文全体を取得
    const fullSql = model.getValue()

    // SQLエディタの接続情報を取得
    const connectionId = sqlEditorStore.connectionId
    const currentConnection = sqlEditorStore.currentConnection
    const rawDatabaseType = currentConnection?.type || null
    const databaseType = rawDatabaseType === 'postgresql' || rawDatabaseType === 'mysql' || rawDatabaseType === 'sqlite'
      ? rawDatabaseType
      : null
    const selectedDatabase = sqlEditorStore.selectedDatabase

    // エイリアスを抽出
    const aliases = extractAliasesFromSql(fullSql)

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - currentWord.length,
      endColumn: position.column,
    }

    return {
      connectionId,
      databaseType,
      selectedDatabase,
      currentWord,
      previousWord: previousWord?.toUpperCase() || null,
      lineText,
      position,
      fullSql,
      aliases,
      range,
    }
  }

  /**
   * SQLキーワードの補完候補を取得
   */
  function getKeywordCompletions(context: CompletionContext): monaco.languages.CompletionItem[] {
    return SQL_KEYWORDS
      .filter((keyword) => keyword.name.startsWith(context.currentWord.toUpperCase()))
      .slice(0, MAX_SUGGESTIONS_PER_CATEGORY)
      .map((keyword) => ({
        label: keyword.name,
        kind: COMPLETION_KIND_MAP.keyword,
        insertText: keyword.name,
        detail: keyword.description,
        sortText: `1_${keyword.name}`,
        range: context.range,
      }))
  }

  /**
   * SQL関数の補完候補を取得
   */
  function getFunctionCompletions(context: CompletionContext): monaco.languages.CompletionItem[] {
    const dbType = context.databaseType || 'postgresql'
    const functions = getFunctionCatalog(dbType)

    return functions
      .filter((func) => func.name.toUpperCase().startsWith(context.currentWord.toUpperCase()))
      .slice(0, MAX_SUGGESTIONS_PER_CATEGORY)
      .map((func) => {
        const insertText = func.paramCount === 0
          ? `${func.name}()`
          : `${func.name}($0)`

        return {
          label: func.name,
          kind: COMPLETION_KIND_MAP.function,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: `${func.category} - ${func.description}`,
          documentation: func.example,
          sortText: `2_${func.name}`,
          range: context.range,
        }
      })
  }

  /**
   * テーブル名の補完候補を取得
   */
  function getTableCompletions(context: CompletionContext): monaco.languages.CompletionItem[] {
    if (!context.connectionId) {
      return []
    }

    const structure = databaseStructureStore.structures[context.connectionId]
    if (!structure) {
      return []
    }

    const items: monaco.languages.CompletionItem[] = []
    let count = 0

    // ユーザーが完全修飾名を入力している場合（例: "demo_ecommerce.cart"）、
    // そのデータベースを優先的に使用
    const dotIndex = context.currentWord.indexOf('.')
    let targetSchema: string | null = null
    if (dotIndex > 0) {
      targetSchema = context.currentWord.substring(0, dotIndex)
    }

    for (const schema of structure.schemas) {
      // 選択中のデータベースでフィルタリング
      // 1. 完全修飾名が入力されている場合は、そのスキーマのみ
      // 2. 選択中のデータベースがある場合は、そのスキーマのみ
      // 3. どちらもない場合は、すべてのスキーマ
      let skipSchema = false
      if (targetSchema) {
        // 完全修飾名が入力されている場合
        if (schema.name.toLowerCase() !== targetSchema.toLowerCase()) {
          skipSchema = true
        }
      }
      else if (context.selectedDatabase) {
        // 選択中のデータベースがある場合
        if (schema.name !== context.selectedDatabase) {
          skipSchema = true
        }
      }

      if (skipSchema) {
        continue
      }

      for (const table of schema.tables) {
        const currentWordLower = context.currentWord.toLowerCase()

        // テーブル名だけでもマッチ、または完全修飾名でもマッチ
        let matchesTableName = false
        let matchesFullName = false

        if (dotIndex > 0) {
          // 完全修飾名が入力されている場合（例: "demo.cart"）
          const tablePartial = context.currentWord.substring(dotIndex + 1).toLowerCase()
          matchesTableName = table.name.toLowerCase().startsWith(tablePartial)
        }
        else {
          // テーブル名のみが入力されている場合
          matchesTableName = table.name.toLowerCase().startsWith(currentWordLower)
        }

        const fullName = `${schema.name}.${table.name}`
        matchesFullName = fullName.toLowerCase().startsWith(currentWordLower)

        if (!matchesTableName && !matchesFullName) {
          continue
        }

        // 表示名：テーブル名 (スキーマ名)
        // 挿入テキスト：テーブル名 AS エイリアス
        const alias = generateTableAlias(table.name)
        const label = `${table.name} (${schema.name})`
        const insertText = `${table.name} AS ${alias}`

        items.push({
          label,
          kind: COMPLETION_KIND_MAP.table,
          insertText,
          detail: table.comment || `Table (${table.estimatedRowCount || 0} rows)`,
          documentation: table.comment || `Alias: ${alias}`,
          sortText: schema.isSystem ? `4_${table.name}` : `3_${table.name}`,
          range: context.range,
        })

        count += 1
        if (count >= MAX_SUGGESTIONS_PER_CATEGORY) return items
      }
    }

    return items
  }

  /**
   * カラム名の補完候補を取得
   */
  function getColumnCompletions(context: CompletionContext): monaco.languages.CompletionItem[] {
    if (!context.connectionId) return []

    const structure = databaseStructureStore.structures[context.connectionId]
    if (!structure) return []

    // エイリアス.カラム名 の形式かチェック（例: us.user_id）
    const dotIndex = context.currentWord.lastIndexOf('.')
    let targetTableName: string | null = null
    let columnPrefix = context.currentWord.toLowerCase()
    let completionRange = context.range

    if (dotIndex > 0) {
      // エイリアス指定あり（例: "us.user_"）
      const aliasOrTable = context.currentWord.substring(0, dotIndex)
      columnPrefix = context.currentWord.substring(dotIndex + 1).toLowerCase()

      // エイリアスからテーブル名を解決
      targetTableName = context.aliases[aliasOrTable] || null

      // エイリアスでなければテーブル名として扱う
      if (!targetTableName) {
        targetTableName = aliasOrTable
      }

      // ドットがある場合、補完範囲をドットの後に限定する
      completionRange = {
        startLineNumber: context.range.startLineNumber,
        endLineNumber: context.range.endLineNumber,
        startColumn: context.position.column - columnPrefix.length,
        endColumn: context.position.column,
      }
    }

    const items: monaco.languages.CompletionItem[] = []
    let count = 0

    for (const schema of structure.schemas) {
      // エイリアス/テーブル名指定がない場合は、選択中のデータベースでフィルタリング
      if (!targetTableName && context.selectedDatabase) {
        if (schema.name !== context.selectedDatabase) {
          continue
        }
      }

      for (const table of schema.tables) {
        // エイリアス指定がある場合は、そのテーブルのカラムのみ表示
        if (targetTableName && table.name !== targetTableName) {
          continue
        }

        for (const column of table.columns) {
          if (!column.name.toLowerCase().startsWith(columnPrefix)) {
            continue
          }

          const constraints: string[] = []
          if (column.isPrimaryKey) constraints.push('PK')
          if (column.isForeignKey) constraints.push('FK')
          if (column.isUnique) constraints.push('UNIQUE')
          if (column.isAutoIncrement) constraints.push('AUTO')

          const constraintStr = constraints.length > 0 ? `, ${constraints.join(', ')}` : ''
          const detail = `${column.displayType}${constraintStr}`
          const documentation = [
            `**Table**: ${schema.name}.${table.name}`,
            `**Type**: ${column.displayType}`,
            `**Nullable**: ${column.nullable ? 'YES' : 'NO'}`,
            column.defaultValue ? `**Default**: ${column.defaultValue}` : null,
            column.comment ? `**Comment**: ${column.comment}` : null,
          ].filter(Boolean).join('\n')

          items.push({
            label: `${column.name} (${table.name})`,
            kind: COMPLETION_KIND_MAP.column,
            insertText: column.name,
            detail,
            documentation,
            sortText: column.isPrimaryKey ? `3_${column.name}` : `4_${column.name}`,
            range: completionRange,
          })

          count += 1
          if (count >= MAX_SUGGESTIONS_PER_CATEGORY) return items
        }

        // エイリアス指定時は特定テーブルのみなので、見つかったら終了
        if (targetTableName && items.length > 0) break
      }

      if (targetTableName && items.length > 0) break
    }

    return items
  }

  /**
   * エイリアス名の補完候補を取得
   */
  function getAliasCompletions(context: CompletionContext): monaco.languages.CompletionItem[] {
    return Object.entries(context.aliases)
      .filter(([alias]) => alias.toUpperCase().startsWith(context.currentWord.toUpperCase()))
      .map(([alias, tableName]) => ({
        label: alias,
        kind: COMPLETION_KIND_MAP.alias,
        insertText: alias,
        detail: `Alias for ${tableName}`,
        sortText: `0_${alias}`, // 最優先で表示
        range: context.range,
      }))
  }

  return {
    provideCompletionItems,
  }
}
