/**
 * シンプルなSQL整形ユーティリティ
 * キーワード前後の改行、インデント、複数行VALUES対応
 */

export const useSqlFormatter = () => {
  /**
   * INSERT文を整形する
   * @param sql - 整形前のSQL文
   * @returns 整形後のSQL文
   */
  const formatInsertSql = (sql: string): string => {
    if (!sql || !sql.trim()) return sql

    try {
      let formatted = sql.trim()

      // INSERT INTO の後で改行
      formatted = formatted.replace(/INSERT\s+INTO/gi, 'INSERT INTO')

      // VALUES の前で改行、インデント追加
      formatted = formatted.replace(/\s+VALUES\s*/gi, '\nVALUES\n  ')

      // 複数行VALUES: ), ( を ), \n  ( に変換
      formatted = formatted.replace(/\)\s*,\s*\(/g, '),\n  (')

      // 末尾のセミコロン前で改行（存在する場合）
      formatted = formatted.replace(/\s*;\s*$/, ';\n')

      return formatted
    } catch (error) {
      console.error('SQL formatting error:', error)
      return sql // フォーマット失敗時は元のSQLを返す
    }
  }

  /**
   * UPDATE文を整形する（将来の拡張用）
   * @param sql - 整形前のSQL文
   * @returns 整形後のSQL文
   */
  const formatUpdateSql = (sql: string): string => {
    if (!sql || !sql.trim()) return sql

    try {
      let formatted = sql.trim()

      // UPDATE の後で改行
      formatted = formatted.replace(/UPDATE\s+/gi, 'UPDATE ')

      // SET の前で改行
      formatted = formatted.replace(/\s+SET\s+/gi, '\nSET\n  ')

      // カラム設定をカンマで区切って改行
      formatted = formatted.replace(/,\s*([a-zA-Z_][a-zA-Z0-9_]*\s*=)/g, ',\n  $1')

      // WHERE の前で改行
      formatted = formatted.replace(/\s+WHERE\s+/gi, '\nWHERE\n  ')

      return formatted
    } catch (error) {
      console.error('SQL formatting error:', error)
      return sql
    }
  }

  /**
   * DELETE文を整形する（将来の拡張用）
   * @param sql - 整形前のSQL文
   * @returns 整形後のSQL文
   */
  const formatDeleteSql = (sql: string): string => {
    if (!sql || !sql.trim()) return sql

    try {
      let formatted = sql.trim()

      // DELETE FROM の後で改行
      formatted = formatted.replace(/DELETE\s+FROM/gi, 'DELETE FROM')

      // WHERE の前で改行
      formatted = formatted.replace(/\s+WHERE\s+/gi, '\nWHERE\n  ')

      return formatted
    } catch (error) {
      console.error('SQL formatting error:', error)
      return sql
    }
  }

  /**
   * mutation-builderのクエリタイプに応じて適切なフォーマッターを選択
   * @param sql - 整形前のSQL文
   * @param type - クエリタイプ ('INSERT' | 'UPDATE' | 'DELETE')
   * @returns 整形後のSQL文
   */
  const formatMutationSql = (sql: string, type: 'INSERT' | 'UPDATE' | 'DELETE'): string => {
    switch (type) {
      case 'INSERT':
        return formatInsertSql(sql)
      case 'UPDATE':
        return formatUpdateSql(sql)
      case 'DELETE':
        return formatDeleteSql(sql)
      default:
        return sql
    }
  }

  return {
    formatInsertSql,
    formatUpdateSql,
    formatDeleteSql,
    formatMutationSql,
  }
}
