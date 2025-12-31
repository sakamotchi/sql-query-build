use super::dialect::Dialect;
use super::reserved_words;
use crate::models::query::*;

/// 引用符のスタイル
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuoteStyle {
    /// 常に引用符をつける (従来の動作)
    Always,
    /// 必要な場合のみ引用符をつける (スマートクォーティング)
    Smart,
}

/// SQLビルダー
pub struct SqlBuilder<'a> {
    pub(crate) dialect: &'a dyn Dialect,
    pub(crate) pretty: bool,
    pub(crate) quote_style: QuoteStyle,
    pub(crate) _indent: usize,
}

impl<'a> SqlBuilder<'a> {
    /// 新しいビルダーを作成
    pub fn new(dialect: &'a dyn Dialect) -> Self {
        Self {
            dialect,
            pretty: true,
            quote_style: QuoteStyle::Smart, // デフォルトはスマート
            _indent: 2,
        }
    }

    /// スマートクォーティングを設定
    pub fn smart_quote(mut self, enabled: bool) -> Self {
        self.quote_style = if enabled {
            QuoteStyle::Smart
        } else {
            QuoteStyle::Always
        };
        self
    }

    /// 整形出力を無効化
    pub fn compact(mut self) -> Self {
        self.pretty = false;
        self
    }

    /// クエリモデルからSQLを生成
    pub fn build(&self, query: &QueryModel) -> Result<String, String> {
        let mut parts: Vec<String> = Vec::new();

        // SELECT句
        parts.push(self.build_select(&query.select)?);

        // FROM句
        parts.push(self.build_from(&query.from)?);

        // JOIN句
        for join in &query.joins {
            parts.push(self.build_join(join)?);
        }

        // WHERE句
        if let Some(ref where_clause) = query.where_clause {
            parts.push(self.build_where(where_clause)?);
        }

        // GROUP BY句
        if let Some(ref group_by) = query.group_by {
            parts.push(self.build_group_by(group_by)?);
        }

        // HAVING句
        if let Some(ref having) = query.having {
            parts.push(self.build_having(having)?);
        }

        // ORDER BY句
        if let Some(ref order_by) = query.order_by {
            parts.push(self.build_order_by(order_by)?);
        }

        // LIMIT句
        if let Some(ref limit) = query.limit {
            parts.push(self.build_limit(limit)?);
        }

        // 結合
        let separator = if self.pretty { "\n" } else { " " };
        Ok(parts.join(separator))
    }
    pub(crate) fn build_literal_value(&self, value: &LiteralValue) -> Result<String, String> {
        match value {
            LiteralValue::Null => Ok("NULL".to_string()),
            LiteralValue::String(s) => Ok(self.dialect.escape_string(s)),
            LiteralValue::Number(n) => Ok(n.to_string()),
            LiteralValue::Boolean(b) => Ok(if *b { "TRUE" } else { "FALSE" }.to_string()),
        }
    }

    /// 識別子を引用符で囲む（設定に応じて）
    pub(crate) fn quote_identifier(&self, identifier: &str) -> String {
        match self.quote_style {
            QuoteStyle::Always => self.dialect.quote_identifier(identifier),
            QuoteStyle::Smart => {
                // "*", "table.*" などの特殊なケースはそのまま扱うべきだが、
                // 基本的には識別子が渡される前提。
                // * は特別扱いする
                if identifier == "*" {
                    return "*".to_string();
                }

                if reserved_words::is_safe_identifier(identifier, self.dialect.dialect_name()) {
                    identifier.to_string()
                } else {
                    self.dialect.quote_identifier(identifier)
                }
            }
        }
    }
}
