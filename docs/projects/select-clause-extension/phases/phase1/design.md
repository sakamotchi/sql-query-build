# Phase 1 設計書: 式ツリー基盤構築

**SELECT句拡張プロジェクト - Phase 1**

このドキュメントは Phase 1（式ツリー基盤構築）の詳細設計を記載します。

- プロジェクト全体概要: [../../design.md](../../design.md)
- Phase 1 タスクリスト: [tasklist.md](tasklist.md)
- Phase 1 テスト手順: [testing.md](testing.md)

---

## 1. Phase 1 の目標

Phase 1では、SELECT句で関数やサブクエリを扱うための基盤となる**式ツリー構造**を構築します。

### 1.1 実装範囲

- ✅ ExpressionNode型定義（TypeScript + Rust）
- ✅ ExpressionBuilder（式ツリーからSQL文字列への変換）
- ✅ DialectMapper（データベース方言対応）
- ✅ バリデーションロジック
- ✅ 基本的なテストコード

### 1.2 実装しないもの（Phase 2以降）

- ❌ UIコンポーネント（関数ビルダー、サブクエリビルダー）
- ❌ Piniaストアの拡張
- ❌ プレビュー表示UI

---

## 2. データ構造設計

### 2.1 ExpressionNode型定義（TypeScript）

**ファイル**: `app/types/expression-node.ts`

```typescript
/**
 * 式ノード（再帰的構造）
 *
 * SELECT句で使用できる式を表現する型
 * 関数、サブクエリ、演算子などをネストして表現可能
 */
export type ExpressionNode =
  | ColumnReference
  | LiteralValue
  | FunctionCall
  | SubqueryExpression
  | BinaryOperation
  | UnaryOperation

/**
 * カラム参照
 * 例: u.name, orders.total
 */
export interface ColumnReference {
  type: 'column'
  table?: string  // テーブルエイリアス（オプション）
  column: string  // カラム名
}

/**
 * リテラル値
 * 例: 'Hello', 123, true, null
 */
export interface LiteralValue {
  type: 'literal'
  valueType: 'string' | 'number' | 'boolean' | 'null'
  value: string | number | boolean | null
}

/**
 * 関数呼び出し
 * 例: UPPER(name), CONCAT(first_name, ' ', last_name)
 */
export interface FunctionCall {
  type: 'function'
  name: string  // 関数名（UPPER, CONCAT, SUBSTRINGなど）
  category: 'string' | 'date' | 'numeric' | 'conditional' | 'aggregate'
  arguments: ExpressionNode[]  // 引数（再帰）
}

/**
 * サブクエリ式
 * 例: (SELECT COUNT(*) FROM orders WHERE user_id = u.id)
 */
export interface SubqueryExpression {
  type: 'subquery'
  query: SubqueryModel  // サブクエリの定義
}

/**
 * サブクエリモデル（簡易版）
 */
export interface SubqueryModel {
  select: ExpressionNode  // SELECT句（単一カラムのみ）
  from: string  // FROMテーブル
  where?: WhereClause  // WHERE条件（既存のWhereClause型を再利用）
  alias?: string  // テーブルエイリアス
}

/**
 * 二項演算
 * 例: price * quantity, age > 18
 */
export interface BinaryOperation {
  type: 'binary'
  operator: '+' | '-' | '*' | '/' | '=' | '!=' | '>' | '<' | '>=' | '<=' | 'AND' | 'OR'
  left: ExpressionNode
  right: ExpressionNode
}

/**
 * 単項演算
 * 例: NOT active, -price
 */
export interface UnaryOperation {
  type: 'unary'
  operator: 'NOT' | '-'
  operand: ExpressionNode
}
```

### 2.2 ExpressionNode型定義（Rust）

**ファイル**: `src-tauri/src/models/expression_node.rs`

```rust
use serde::{Deserialize, Serialize};

/// 式ノード（再帰的構造）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ExpressionNode {
    Column(ColumnReference),
    Literal(LiteralValue),
    Function(FunctionCall),
    Subquery(SubqueryExpression),
    Binary(BinaryOperation),
    Unary(UnaryOperation),
}

/// カラム参照
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ColumnReference {
    pub table: Option<String>,
    pub column: String,
}

/// リテラル値
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LiteralValue {
    #[serde(rename = "valueType")]
    pub value_type: LiteralType,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LiteralType {
    String,
    Number,
    Boolean,
    Null,
}

/// 関数呼び出し
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FunctionCall {
    pub name: String,
    pub category: FunctionCategory,
    pub arguments: Vec<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FunctionCategory {
    String,
    Date,
    Numeric,
    Conditional,
    Aggregate,
}

/// サブクエリ式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubqueryExpression {
    pub query: Box<SubqueryModel>,
}

/// サブクエリモデル
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubqueryModel {
    pub select: Box<ExpressionNode>,
    pub from: String,
    pub where_clause: Option<WhereClause>,
    pub alias: Option<String>,
}

/// 二項演算
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BinaryOperation {
    pub operator: BinaryOperator,
    pub left: Box<ExpressionNode>,
    pub right: Box<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BinaryOperator {
    #[serde(rename = "+")]
    Add,
    #[serde(rename = "-")]
    Subtract,
    #[serde(rename = "*")]
    Multiply,
    #[serde(rename = "/")]
    Divide,
    #[serde(rename = "=")]
    Equal,
    #[serde(rename = "!=")]
    NotEqual,
    #[serde(rename = ">")]
    GreaterThan,
    #[serde(rename = "<")]
    LessThan,
    #[serde(rename = ">=")]
    GreaterThanOrEqual,
    #[serde(rename = "<=")]
    LessThanOrEqual,
    #[serde(rename = "AND")]
    And,
    #[serde(rename = "OR")]
    Or,
}

/// 単項演算
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnaryOperation {
    pub operator: UnaryOperator,
    pub operand: Box<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UnaryOperator {
    #[serde(rename = "NOT")]
    Not,
    #[serde(rename = "-")]
    Negate,
}
```

### 2.3 SelectColumn型の拡張

既存の `SelectColumn` 型に `expression_node` フィールドを追加します。

**ファイル**: `app/types/query-model.ts`

```typescript
export interface SelectColumn {
  type: 'column' | 'expression' | 'aggregate' | 'expression_node'  // 'expression_node'を追加
  column?: string  // type='column'の場合
  expression?: string  // type='expression'の場合（既存の文字列入力）
  aggregate?: AggregateFunction  // type='aggregate'の場合
  expressionNode?: ExpressionNode  // type='expression_node'の場合（新規）
  alias?: string
}
```

Rust側も同様に拡張：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectColumn {
    #[serde(rename = "type")]
    pub column_type: SelectColumnType,
    pub column: Option<String>,
    pub expression: Option<String>,
    pub aggregate: Option<AggregateFunction>,
    pub expression_node: Option<ExpressionNode>,  // 新規追加
    pub alias: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SelectColumnType {
    Column,
    Expression,
    Aggregate,
    ExpressionNode,  // 新規追加
}
```

---

## 3. SQL生成ロジック設計

### 3.1 ExpressionBuilder

**ファイル**: `src-tauri/src/sql/expression_builder.rs`

```rust
use crate::models::expression_node::*;
use crate::sql::dialect_mapper::DialectMapper;
use crate::error::QueryBuilderError;

pub struct ExpressionBuilder {
    dialect_mapper: DialectMapper,
    max_depth: usize,  // 最大ネスト深さ（デフォルト10）
}

impl ExpressionBuilder {
    pub fn new(db_type: &str) -> Self {
        Self {
            dialect_mapper: DialectMapper::new(db_type),
            max_depth: 10,
        }
    }

    /// ExpressionNodeからSQL文字列を生成
    pub fn build(&self, node: &ExpressionNode) -> Result<String, QueryBuilderError> {
        self.build_with_depth(node, 0)
    }

    fn build_with_depth(&self, node: &ExpressionNode, depth: usize) -> Result<String, QueryBuilderError> {
        // 深さチェック
        if depth > self.max_depth {
            return Err(QueryBuilderError::ExpressionTooDeep(depth));
        }

        match node {
            ExpressionNode::Column(col) => self.build_column(col),
            ExpressionNode::Literal(lit) => self.build_literal(lit),
            ExpressionNode::Function(func) => self.build_function(func, depth),
            ExpressionNode::Subquery(sub) => self.build_subquery(sub, depth),
            ExpressionNode::Binary(bin) => self.build_binary(bin, depth),
            ExpressionNode::Unary(un) => self.build_unary(un, depth),
        }
    }

    fn build_column(&self, col: &ColumnReference) -> Result<String, QueryBuilderError> {
        if let Some(table) = &col.table {
            Ok(format!("{}.{}", table, col.column))
        } else {
            Ok(col.column.clone())
        }
    }

    fn build_literal(&self, lit: &LiteralValue) -> Result<String, QueryBuilderError> {
        match lit.value_type {
            LiteralType::String => {
                let s = lit.value.as_str().ok_or(QueryBuilderError::InvalidLiteral)?;
                Ok(format!("'{}'", s.replace("'", "''")))  // エスケープ
            }
            LiteralType::Number => {
                Ok(lit.value.to_string())
            }
            LiteralType::Boolean => {
                let b = lit.value.as_bool().ok_or(QueryBuilderError::InvalidLiteral)?;
                Ok(b.to_string().to_uppercase())  // TRUE/FALSE
            }
            LiteralType::Null => Ok("NULL".to_string()),
        }
    }

    fn build_function(&self, func: &FunctionCall, depth: usize) -> Result<String, QueryBuilderError> {
        // 引数数チェック
        if func.arguments.len() > 10 {
            return Err(QueryBuilderError::TooManyArguments(func.arguments.len()));
        }

        // 方言マッピング
        let mapped_name = self.dialect_mapper.map_function(&func.name, &func.arguments)?;

        // 引数をSQL化
        let args: Result<Vec<String>, _> = func.arguments
            .iter()
            .map(|arg| self.build_with_depth(arg, depth + 1))
            .collect();

        let args_sql = args?.join(", ");
        Ok(format!("{}({})", mapped_name, args_sql))
    }

    fn build_subquery(&self, sub: &SubqueryExpression, depth: usize) -> Result<String, QueryBuilderError> {
        let select_sql = self.build_with_depth(&sub.query.select, depth + 1)?;
        let from_table = &sub.query.from;
        let alias = sub.query.alias.as_deref().unwrap_or("");

        let mut sql = format!("SELECT {} FROM {} {}", select_sql, from_table, alias).trim().to_string();

        // WHERE句があれば追加
        if let Some(where_clause) = &sub.query.where_clause {
            let where_sql = self.build_where_clause(where_clause)?;
            sql.push_str(&format!(" WHERE {}", where_sql));
        }

        Ok(format!("({})", sql))
    }

    fn build_binary(&self, bin: &BinaryOperation, depth: usize) -> Result<String, QueryBuilderError> {
        let left = self.build_with_depth(&bin.left, depth + 1)?;
        let right = self.build_with_depth(&bin.right, depth + 1)?;
        let op = format!("{:?}", bin.operator);  // 演算子文字列化

        Ok(format!("({} {} {})", left, op, right))
    }

    fn build_unary(&self, un: &UnaryOperation, depth: usize) -> Result<String, QueryBuilderError> {
        let operand = self.build_with_depth(&un.operand, depth + 1)?;
        let op = format!("{:?}", un.operator);

        Ok(format!("{}({})", op, operand))
    }
}
```

### 3.2 DialectMapper（データベース方言対応）

**ファイル**: `src-tauri/src/sql/dialect_mapper.rs`

```rust
use std::collections::HashMap;
use crate::error::QueryBuilderError;

pub struct DialectMapper {
    db_type: String,
    function_map: HashMap<String, String>,
}

impl DialectMapper {
    pub fn new(db_type: &str) -> Self {
        let mut mapper = Self {
            db_type: db_type.to_string(),
            function_map: HashMap::new(),
        };

        mapper.init_mappings();
        mapper
    }

    fn init_mappings(&mut self) {
        match self.db_type.as_str() {
            "postgresql" => self.init_postgresql(),
            "mysql" => self.init_mysql(),
            "sqlite" => self.init_sqlite(),
            _ => {}
        }
    }

    fn init_postgresql(&mut self) {
        // PostgreSQLは標準SQLに準拠しているため、ほとんどマッピング不要
        self.function_map.insert("CONCAT".to_string(), "CONCAT".to_string());
        self.function_map.insert("SUBSTRING".to_string(), "SUBSTRING".to_string());
        // ...
    }

    fn init_mysql(&mut self) {
        // MySQLの特殊ケース
        self.function_map.insert("CONCAT".to_string(), "CONCAT".to_string());
        self.function_map.insert("SUBSTRING".to_string(), "SUBSTRING".to_string());
        // ...
    }

    fn init_sqlite(&mut self) {
        // SQLiteの特殊ケース
        // CONCATは||演算子を使用
        self.function_map.insert("CONCAT".to_string(), "||".to_string());
        self.function_map.insert("SUBSTRING".to_string(), "SUBSTR".to_string());
        // ...
    }

    /// 関数名をデータベース方言に応じてマッピング
    pub fn map_function(&self, func_name: &str, args: &[ExpressionNode]) -> Result<String, QueryBuilderError> {
        // 特殊ケース: SQLiteのCONCAT（||演算子に変換）
        if self.db_type == "sqlite" && func_name.to_uppercase() == "CONCAT" {
            // CONCATは||演算子として扱う（ExpressionBuilderで処理）
            return Ok("||".to_string());
        }

        // 通常のマッピング
        Ok(self.function_map
            .get(&func_name.to_uppercase())
            .cloned()
            .unwrap_or_else(|| func_name.to_uppercase()))
    }
}
```

### 3.3 バリデーションロジック

**ファイル**: `src-tauri/src/validators/expression_validator.rs`

```rust
use crate::models::expression_node::*;
use crate::error::QueryBuilderError;

pub struct ExpressionValidator {
    max_depth: usize,
    max_arguments: usize,
}

impl ExpressionValidator {
    pub fn new() -> Self {
        Self {
            max_depth: 10,
            max_arguments: 10,
        }
    }

    /// 式ツリー全体をバリデーション
    pub fn validate(&self, node: &ExpressionNode) -> Result<(), QueryBuilderError> {
        self.validate_depth(node, 0)?;
        self.validate_structure(node)?;
        Ok(())
    }

    fn validate_depth(&self, node: &ExpressionNode, depth: usize) -> Result<(), QueryBuilderError> {
        if depth > self.max_depth {
            return Err(QueryBuilderError::ExpressionTooDeep(depth));
        }

        match node {
            ExpressionNode::Function(func) => {
                for arg in &func.arguments {
                    self.validate_depth(arg, depth + 1)?;
                }
            }
            ExpressionNode::Subquery(sub) => {
                self.validate_depth(&sub.query.select, depth + 1)?;
            }
            ExpressionNode::Binary(bin) => {
                self.validate_depth(&bin.left, depth + 1)?;
                self.validate_depth(&bin.right, depth + 1)?;
            }
            ExpressionNode::Unary(un) => {
                self.validate_depth(&un.operand, depth + 1)?;
            }
            _ => {}
        }

        Ok(())
    }

    fn validate_structure(&self, node: &ExpressionNode) -> Result<(), QueryBuilderError> {
        match node {
            ExpressionNode::Function(func) => {
                if func.arguments.len() > self.max_arguments {
                    return Err(QueryBuilderError::TooManyArguments(func.arguments.len()));
                }
                // 各引数を再帰的にバリデーション
                for arg in &func.arguments {
                    self.validate_structure(arg)?;
                }
            }
            ExpressionNode::Subquery(sub) => {
                // サブクエリのSELECT句はスカラー値のみ
                self.validate_structure(&sub.query.select)?;
            }
            _ => {}
        }

        Ok(())
    }
}
```

---

## 4. エラーハンドリング

### 4.1 エラー型定義

**ファイル**: `src-tauri/src/error.rs`（拡張）

```rust
#[derive(Debug, thiserror::Error)]
pub enum QueryBuilderError {
    #[error("Expression tree is too deep: {0} levels (max 10)")]
    ExpressionTooDeep(usize),

    #[error("Too many function arguments: {0} (max 10)")]
    TooManyArguments(usize),

    #[error("Invalid literal value")]
    InvalidLiteral,

    #[error("Unsupported function for database: {0}")]
    UnsupportedFunction(String),

    #[error("Subquery must return a scalar value")]
    SubqueryNotScalar,
}
```

---

## 5. ファイル構成

```
src-tauri/src/
├── models/
│   ├── expression_node.rs          # ExpressionNode型定義（新規）
│   ├── query.rs                     # QueryModel（既存、SelectColumn拡張）
│   └── mod.rs
├── sql/
│   ├── expression_builder.rs       # ExpressionBuilder（新規）
│   ├── dialect_mapper.rs            # DialectMapper（新規）
│   ├── select_builder.rs            # SelectBuilder（既存、expression_node対応）
│   └── mod.rs
├── validators/
│   ├── expression_validator.rs     # ExpressionValidator（新規）
│   └── mod.rs
├── error.rs                         # エラー型（拡張）
└── lib.rs

app/types/
├── expression-node.ts               # ExpressionNode型定義（新規）
├── query-model.ts                   # QueryModel（既存、SelectColumn拡張）
└── index.ts
```

---

## 6. テストコード

### 6.1 単体テスト（Rust）

**ファイル**: `src-tauri/src/sql/expression_builder_test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_column_reference() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Column(ColumnReference {
            table: Some("u".to_string()),
            column: "name".to_string(),
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "u.name");
    }

    #[test]
    fn test_function_call() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Function(FunctionCall {
            name: "UPPER".to_string(),
            category: FunctionCategory::String,
            arguments: vec![
                ExpressionNode::Column(ColumnReference {
                    table: Some("u".to_string()),
                    column: "name".to_string(),
                })
            ],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "UPPER(u.name)");
    }

    #[test]
    fn test_nested_function() {
        let builder = ExpressionBuilder::new("postgresql");
        let node = ExpressionNode::Function(FunctionCall {
            name: "SUBSTRING".to_string(),
            category: FunctionCategory::String,
            arguments: vec![
                ExpressionNode::Function(FunctionCall {
                    name: "UPPER".to_string(),
                    category: FunctionCategory::String,
                    arguments: vec![
                        ExpressionNode::Column(ColumnReference {
                            table: Some("u".to_string()),
                            column: "name".to_string(),
                        })
                    ],
                }),
                ExpressionNode::Literal(LiteralValue {
                    value_type: LiteralType::Number,
                    value: serde_json::json!(1),
                }),
                ExpressionNode::Literal(LiteralValue {
                    value_type: LiteralType::Number,
                    value: serde_json::json!(3),
                }),
            ],
        });

        let sql = builder.build(&node).unwrap();
        assert_eq!(sql, "SUBSTRING(UPPER(u.name), 1, 3)");
    }

    #[test]
    fn test_depth_limit() {
        let builder = ExpressionBuilder::new("postgresql");

        // 深さ11のツリーを構築（max_depth=10を超える）
        let mut node = ExpressionNode::Column(ColumnReference {
            table: None,
            column: "x".to_string(),
        });

        for _ in 0..11 {
            node = ExpressionNode::Function(FunctionCall {
                name: "UPPER".to_string(),
                category: FunctionCategory::String,
                arguments: vec![node],
            });
        }

        let result = builder.build(&node);
        assert!(result.is_err());
    }
}
```

### 6.2 統合テスト（TypeScript）

**ファイル**: `app/tests/expression-node.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { ExpressionNode, ColumnReference, FunctionCall } from '~/types/expression-node'

describe('ExpressionNode型定義', () => {
  it('カラム参照を正しく定義できる', () => {
    const col: ColumnReference = {
      type: 'column',
      table: 'u',
      column: 'name'
    }

    expect(col.type).toBe('column')
    expect(col.column).toBe('name')
  })

  it('関数呼び出しを正しく定義できる', () => {
    const func: FunctionCall = {
      type: 'function',
      name: 'UPPER',
      category: 'string',
      arguments: [
        {
          type: 'column',
          table: 'u',
          column: 'name'
        }
      ]
    }

    expect(func.name).toBe('UPPER')
    expect(func.arguments.length).toBe(1)
  })

  it('ネストした関数を正しく定義できる', () => {
    const nested: FunctionCall = {
      type: 'function',
      name: 'SUBSTRING',
      category: 'string',
      arguments: [
        {
          type: 'function',
          name: 'UPPER',
          category: 'string',
          arguments: [
            {
              type: 'column',
              table: 'u',
              column: 'name'
            }
          ]
        },
        { type: 'literal', valueType: 'number', value: 1 },
        { type: 'literal', valueType: 'number', value: 3 }
      ]
    }

    expect(nested.arguments[0]).toHaveProperty('type', 'function')
  })
})
```

---

## 7. マイグレーション計画

### 7.1 既存コードとの互換性

既存の `SelectColumn` 型の `type='column'`, `type='expression'`, `type='aggregate'` はそのまま動作します。

新しい `type='expression_node'` は段階的に導入：
1. Phase 1完了時: バックエンドのみ対応
2. Phase 2完了時: フロントエンドUIで関数を構築可能
3. Phase 3完了時: サブクエリも含めた完全対応

### 7.2 deprecation計画

既存の `type='expression'`（文字列入力）は6ヶ月間サポートし、その後廃止予定。

---

## 8. パフォーマンス考慮事項

- 式ツリーの深さ制限: 最大10レベル
- 関数引数数の制限: 最大10個
- サブクエリの実行計画: データベースのクエリオプティマイザに依存

---

## 9. セキュリティ考慮事項

- リテラル値のエスケープ処理（SQLインジェクション対策）
- 深さ制限によるDoS攻撃対策
- 不正な関数名の検証

---

## 10. 次のステップ（Phase 2）

Phase 1完了後、Phase 2で以下を実装：
- FunctionBuilderコンポーネント
- 関数マスタデータ
- Piniaストアの拡張
- プレビュー表示UI

詳細: [Phase 2 設計書](../phase2/design.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-01-03 | 1.0 | Phase 1詳細設計書を作成 | Claude |
