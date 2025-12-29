# 設計書: クエリ種別検出

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.1 クエリ種別検出

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  queryApi.analyzeQuery(sql, dialect)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼ invoke()                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Rustバックエンド                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  commands/query_analyzer.rs                         │   │
│  │  - analyze_query コマンド                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  services/query_analyzer.rs                         │   │
│  │  - QueryAnalyzer 構造体                              │   │
│  │  - analyze() メソッド                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  sqlparser クレート                                  │   │
│  │  - SQL構文解析                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Rust実装設計

### 2.1 ディレクトリ構造

```
src-tauri/src/
├── commands/
│   ├── mod.rs              # 追加: query_analyzer
│   └── query_analyzer.rs   # 新規作成
├── services/
│   ├── mod.rs              # 追加: query_analyzer
│   └── query_analyzer.rs   # 新規作成
└── models/
    ├── mod.rs              # 追加: query_analysis
    └── query_analysis.rs   # 新規作成
```

### 2.2 データ型定義

**ファイル**: `src-tauri/src/models/query_analysis.rs`

```rust
use serde::{Deserialize, Serialize};

/// クエリ種別
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum QueryType {
    Select,
    Insert,
    Update,
    Delete,
    Drop,
    Truncate,
    Alter,
    Create,
    Unknown,
}

/// 危険度レベル
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Ord, PartialOrd, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Safe,
    Warning,
    Danger,
}

/// 危険度要因
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskFactor {
    pub code: String,
    pub message: String,
}

/// クエリ解析結果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryAnalysisResult {
    pub query_type: QueryType,
    pub risk_level: RiskLevel,
    pub risk_factors: Vec<RiskFactor>,
    pub affected_tables: Vec<String>,
    pub has_where_clause: bool,
}

impl QueryAnalysisResult {
    pub fn safe_select() -> Self {
        Self {
            query_type: QueryType::Select,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![],
            has_where_clause: false,
        }
    }

    pub fn unknown() -> Self {
        Self {
            query_type: QueryType::Unknown,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![],
            has_where_clause: false,
        }
    }
}
```

### 2.3 QueryAnalyzer サービス

**ファイル**: `src-tauri/src/services/query_analyzer.rs`

```rust
use sqlparser::ast::{Statement, ObjectType, SetExpr};
use sqlparser::dialect::{PostgreSqlDialect, MySqlDialect, SQLiteDialect, Dialect};
use sqlparser::parser::Parser;

use crate::models::query_analysis::{QueryAnalysisResult, QueryType, RiskLevel, RiskFactor};

pub struct QueryAnalyzer;

impl QueryAnalyzer {
    /// SQLクエリを解析して危険度を判定
    pub fn analyze(sql: &str, dialect: &str) -> QueryAnalysisResult {
        let dialect_box: Box<dyn Dialect> = match dialect {
            "postgresql" => Box::new(PostgreSqlDialect {}),
            "mysql" => Box::new(MySqlDialect {}),
            "sqlite" => Box::new(SQLiteDialect {}),
            _ => Box::new(PostgreSqlDialect {}),
        };

        let ast = match Parser::parse_sql(&*dialect_box, sql) {
            Ok(statements) => statements,
            Err(_) => return QueryAnalysisResult::unknown(),
        };

        if ast.is_empty() {
            return QueryAnalysisResult::unknown();
        }

        // 最初の文のみ解析
        Self::analyze_statement(&ast[0])
    }

    fn analyze_statement(stmt: &Statement) -> QueryAnalysisResult {
        match stmt {
            Statement::Query(query) => Self::analyze_select(query),
            Statement::Insert { table_name, .. } => Self::analyze_insert(table_name),
            Statement::Update { table, selection, .. } => Self::analyze_update(table, selection),
            Statement::Delete { from, selection, .. } => Self::analyze_delete(from, selection),
            Statement::Drop { object_type, names, .. } => Self::analyze_drop(object_type, names),
            Statement::Truncate { table_names, .. } => Self::analyze_truncate(table_names),
            Statement::AlterTable { name, .. } => Self::analyze_alter(name),
            Statement::CreateTable { name, .. } => Self::analyze_create_table(name),
            Statement::CreateIndex { name, .. } => Self::analyze_create_index(name),
            _ => QueryAnalysisResult::unknown(),
        }
    }

    fn analyze_select(_query: &sqlparser::ast::Query) -> QueryAnalysisResult {
        QueryAnalysisResult::safe_select()
    }

    fn analyze_insert(table_name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Insert,
            risk_level: RiskLevel::Warning,
            risk_factors: vec![RiskFactor {
                code: "insert_data".to_string(),
                message: "データが挿入されます".to_string(),
            }],
            affected_tables: vec![table_name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_update(
        table: &sqlparser::ast::TableWithJoins,
        selection: &Option<sqlparser::ast::Expr>,
    ) -> QueryAnalysisResult {
        let table_name = table.relation.to_string();
        let has_where = selection.is_some();

        let (risk_level, risk_factors) = if has_where {
            (
                RiskLevel::Warning,
                vec![RiskFactor {
                    code: "update_with_where".to_string(),
                    message: "条件に一致するデータが更新されます".to_string(),
                }],
            )
        } else {
            (
                RiskLevel::Danger,
                vec![RiskFactor {
                    code: "no_where_clause".to_string(),
                    message: "WHERE句がありません。テーブル内の全データが更新されます".to_string(),
                }],
            )
        };

        QueryAnalysisResult {
            query_type: QueryType::Update,
            risk_level,
            risk_factors,
            affected_tables: vec![table_name],
            has_where_clause: has_where,
        }
    }

    fn analyze_delete(
        from: &sqlparser::ast::FromClause,
        selection: &Option<sqlparser::ast::Expr>,
    ) -> QueryAnalysisResult {
        let table_name = from.to_string();
        let has_where = selection.is_some();

        let (risk_level, risk_factors) = if has_where {
            (
                RiskLevel::Warning,
                vec![RiskFactor {
                    code: "delete_with_where".to_string(),
                    message: "条件に一致するデータが削除されます".to_string(),
                }],
            )
        } else {
            (
                RiskLevel::Danger,
                vec![RiskFactor {
                    code: "no_where_clause".to_string(),
                    message: "WHERE句がありません。テーブル内の全データが削除されます".to_string(),
                }],
            )
        };

        QueryAnalysisResult {
            query_type: QueryType::Delete,
            risk_level,
            risk_factors,
            affected_tables: vec![table_name],
            has_where_clause: has_where,
        }
    }

    fn analyze_drop(
        object_type: &ObjectType,
        names: &[sqlparser::ast::ObjectName],
    ) -> QueryAnalysisResult {
        let type_name = match object_type {
            ObjectType::Table => "テーブル",
            ObjectType::Index => "インデックス",
            ObjectType::Schema => "スキーマ",
            ObjectType::View => "ビュー",
            _ => "オブジェクト",
        };

        QueryAnalysisResult {
            query_type: QueryType::Drop,
            risk_level: RiskLevel::Danger,
            risk_factors: vec![RiskFactor {
                code: "drop_object".to_string(),
                message: format!("{}が削除されます。この操作は取り消せません", type_name),
            }],
            affected_tables: names.iter().map(|n| n.to_string()).collect(),
            has_where_clause: false,
        }
    }

    fn analyze_truncate(table_names: &[sqlparser::ast::TruncateTableTarget]) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Truncate,
            risk_level: RiskLevel::Danger,
            risk_factors: vec![RiskFactor {
                code: "truncate_table".to_string(),
                message: "テーブル内の全データが削除されます。この操作は取り消せません".to_string(),
            }],
            affected_tables: table_names.iter().map(|t| t.name.to_string()).collect(),
            has_where_clause: false,
        }
    }

    fn analyze_alter(name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Alter,
            risk_level: RiskLevel::Warning,
            risk_factors: vec![RiskFactor {
                code: "alter_table".to_string(),
                message: "テーブル構造が変更されます".to_string(),
            }],
            affected_tables: vec![name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_create_table(name: &sqlparser::ast::ObjectName) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Create,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: vec![name.to_string()],
            has_where_clause: false,
        }
    }

    fn analyze_create_index(name: &Option<sqlparser::ast::ObjectName>) -> QueryAnalysisResult {
        QueryAnalysisResult {
            query_type: QueryType::Create,
            risk_level: RiskLevel::Safe,
            risk_factors: vec![],
            affected_tables: name.as_ref().map(|n| n.to_string()).into_iter().collect(),
            has_where_clause: false,
        }
    }
}
```

### 2.4 Tauriコマンド

**ファイル**: `src-tauri/src/commands/query_analyzer.rs`

```rust
use crate::models::query_analysis::QueryAnalysisResult;
use crate::services::query_analyzer::QueryAnalyzer;

#[tauri::command]
pub fn analyze_query(sql: String, dialect: String) -> QueryAnalysisResult {
    QueryAnalyzer::analyze(&sql, &dialect)
}
```

### 2.5 依存クレート

**ファイル**: `src-tauri/Cargo.toml` に追加

```toml
[dependencies]
sqlparser = "0.52"  # または最新バージョン
```

---

## 3. フロントエンド設計

### 3.1 API関数

**ファイル**: `app/api/queryApi.ts` に追加

```typescript
import { invoke } from '@tauri-apps/api/core'

export interface QueryAnalysisResult {
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'drop' | 'truncate' | 'alter' | 'create' | 'unknown'
  riskLevel: 'safe' | 'warning' | 'danger'
  riskFactors: RiskFactor[]
  affectedTables: string[]
  hasWhereClause: boolean
}

export interface RiskFactor {
  code: string
  message: string
}

export async function analyzeQuery(
  sql: string,
  dialect: 'postgresql' | 'mysql' | 'sqlite'
): Promise<QueryAnalysisResult> {
  return await invoke<QueryAnalysisResult>('analyze_query', { sql, dialect })
}
```

### 3.2 型定義

**ファイル**: `app/types/query-analysis.ts`

```typescript
export type QueryType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'drop'
  | 'truncate'
  | 'alter'
  | 'create'
  | 'unknown'

export type RiskLevel = 'safe' | 'warning' | 'danger'

export interface RiskFactor {
  code: string
  message: string
}

export interface QueryAnalysisResult {
  queryType: QueryType
  riskLevel: RiskLevel
  riskFactors: RiskFactor[]
  affectedTables: string[]
  hasWhereClause: boolean
}
```

---

## 4. テストコード設計

### 4.1 Rustユニットテスト

**ファイル**: `src-tauri/src/services/query_analyzer_test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_select() {
        let result = QueryAnalyzer::analyze("SELECT * FROM users", "postgresql");
        assert_eq!(result.query_type, QueryType::Select);
        assert_eq!(result.risk_level, RiskLevel::Safe);
    }

    #[test]
    fn test_analyze_update_without_where() {
        let result = QueryAnalyzer::analyze("UPDATE users SET active = false", "postgresql");
        assert_eq!(result.query_type, QueryType::Update);
        assert_eq!(result.risk_level, RiskLevel::Danger);
        assert!(!result.has_where_clause);
    }

    #[test]
    fn test_analyze_update_with_where() {
        let result = QueryAnalyzer::analyze("UPDATE users SET active = false WHERE id = 1", "postgresql");
        assert_eq!(result.query_type, QueryType::Update);
        assert_eq!(result.risk_level, RiskLevel::Warning);
        assert!(result.has_where_clause);
    }

    #[test]
    fn test_analyze_delete_without_where() {
        let result = QueryAnalyzer::analyze("DELETE FROM users", "postgresql");
        assert_eq!(result.query_type, QueryType::Delete);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_delete_with_where() {
        let result = QueryAnalyzer::analyze("DELETE FROM users WHERE id = 1", "postgresql");
        assert_eq!(result.query_type, QueryType::Delete);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_drop_table() {
        let result = QueryAnalyzer::analyze("DROP TABLE users", "postgresql");
        assert_eq!(result.query_type, QueryType::Drop);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_truncate() {
        let result = QueryAnalyzer::analyze("TRUNCATE TABLE users", "postgresql");
        assert_eq!(result.query_type, QueryType::Truncate);
        assert_eq!(result.risk_level, RiskLevel::Danger);
    }

    #[test]
    fn test_analyze_insert() {
        let result = QueryAnalyzer::analyze("INSERT INTO users (name) VALUES ('test')", "postgresql");
        assert_eq!(result.query_type, QueryType::Insert);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_create_table() {
        let result = QueryAnalyzer::analyze("CREATE TABLE users (id INT)", "postgresql");
        assert_eq!(result.query_type, QueryType::Create);
        assert_eq!(result.risk_level, RiskLevel::Safe);
    }

    #[test]
    fn test_analyze_alter_table() {
        let result = QueryAnalyzer::analyze("ALTER TABLE users ADD COLUMN email VARCHAR(255)", "postgresql");
        assert_eq!(result.query_type, QueryType::Alter);
        assert_eq!(result.risk_level, RiskLevel::Warning);
    }

    #[test]
    fn test_analyze_invalid_sql() {
        let result = QueryAnalyzer::analyze("NOT A VALID SQL", "postgresql");
        assert_eq!(result.query_type, QueryType::Unknown);
    }
}
```

---

## 5. 変更点まとめ

### 5.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `src-tauri/src/models/query_analysis.rs` | クエリ解析結果の型定義 |
| `src-tauri/src/services/query_analyzer.rs` | クエリ解析サービス |
| `src-tauri/src/services/query_analyzer_test.rs` | ユニットテスト |
| `src-tauri/src/commands/query_analyzer.rs` | Tauriコマンド |
| `app/types/query-analysis.ts` | フロントエンド型定義 |

### 5.2 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/Cargo.toml` | `sqlparser`クレート追加 |
| `src-tauri/src/models/mod.rs` | `query_analysis`モジュール追加 |
| `src-tauri/src/services/mod.rs` | `query_analyzer`モジュール追加 |
| `src-tauri/src/commands/mod.rs` | `query_analyzer`モジュール追加 |
| `src-tauri/src/lib.rs` | `analyze_query`コマンド登録 |
| `app/api/queryApi.ts` | `analyzeQuery`関数追加 |
