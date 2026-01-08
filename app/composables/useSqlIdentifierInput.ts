/**
 * SQL識別子（テーブル名、カラム名、エイリアスなど）用のInput属性
 * 自動大文字化、自動修正、スペルチェック、オートコンプリートを無効化
 */
export function useSqlIdentifierInput() {
  return {
    autocapitalize: 'off' as const,
    autocorrect: 'off' as const,
    spellcheck: false,
    autocomplete: 'off' as const,
    // type="search"にすると一部のブラウザで自動大文字化を完全に無効化できる
    // ただし検索アイコンが表示される場合があるので、必要に応じて使用
    // type: 'search' as const,
  }
}

/**
 * SQL識別子Input用のバインディング属性（v-bind用）
 * 使用例: <UInput v-model="alias" v-bind="sqlIdentifierAttrs" />
 */
export const sqlIdentifierAttrs = {
  autocapitalize: 'off' as const,
  autocorrect: 'off' as const,
  spellcheck: false,
  autocomplete: 'off' as const,
}
