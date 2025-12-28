/// SQL方言トレイト
pub trait Dialect: Send + Sync {
    /// 識別子をクォート
    fn quote_identifier(&self, identifier: &str) -> String;

    /// 文字列リテラルをエスケープ
    fn escape_string(&self, value: &str) -> String;

    /// LIMITオフセット構文
    fn limit_offset(&self, limit: u64, offset: Option<u64>) -> String;

    /// LIKE演算子のエスケープ文字
    fn like_escape_char(&self) -> char {
        '\\'
    }

    /// 大文字小文字を区別しないLIKE
    fn ilike_operator(&self) -> &str {
        "ILIKE"
    }

    /// NULLS FIRST/LAST のサポート
    fn supports_nulls_order(&self) -> bool {
        true
    }

    /// データベース種別名
    fn dialect_name(&self) -> &str;
}
