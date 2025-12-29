# 要件定義書: クエリ種別検出

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.1 クエリ種別検出

---

## 1. 目的

本番環境での誤操作を防止するため、SQLクエリの種別（SELECT, UPDATE, DELETE, DROP等）を解析し、危険度を判定する機能を実装する。

---

## 2. 背景

- 本番環境でのDELETE/UPDATE/DROP/TRUNCATEなどの破壊的クエリの実行は、データ損失のリスクがある
- クエリ実行前に危険度を判定し、ユーザーに警告を表示することで誤操作を防止する
- Phase 2（クエリ実行・結果表示）完了後の次ステップとして実装

---

## 3. 機能要件

### 3.1 クエリ種別の検出

以下のSQL文を検出できること:

| 種別 | 検出対象 | 危険度 |
|------|---------|--------|
| SELECT | SELECT文 | Safe |
| INSERT | INSERT文 | Warning |
| UPDATE | UPDATE文（WHERE句有無で変動） | Warning / Danger |
| DELETE | DELETE文（WHERE句有無で変動） | Warning / Danger |
| DROP | DROP TABLE/DATABASE/INDEX等 | Danger |
| TRUNCATE | TRUNCATE TABLE | Danger |
| ALTER | ALTER TABLE | Warning |
| CREATE | CREATE TABLE/INDEX等 | Safe |

### 3.2 危険度レベル

| レベル | 説明 | UI表示 |
|--------|------|--------|
| Safe | 読み取り専用、データ変更なし | 緑色 |
| Warning | データ変更あり、WHERE句等で制限あり | 黄色 |
| Danger | 大量データ削除/変更の可能性、WHERE句なし | 赤色 |

### 3.3 危険度判定ロジック

#### UPDATE/DELETE文の危険度

```
WHERE句なし → Danger
WHERE句あり → Warning
```

#### DROP/TRUNCATE文

```
常に → Danger
```

---

## 4. 非機能要件

### 4.1 パフォーマンス

- クエリ解析は100ms以内に完了すること
- フロントエンドでのリアルタイムプレビュー時に遅延を感じさせないこと

### 4.2 正確性

- SQLパーサーによる正確な構文解析
- コメント内のSQL文を誤検出しないこと
- 文字列リテラル内のSQL文を誤検出しないこと

---

## 5. 入出力

### 5.1 入力

```typescript
interface AnalyzeQueryRequest {
  sql: string           // 解析対象のSQL文
  dialect: SqlDialect   // 'postgresql' | 'mysql' | 'sqlite'
}
```

### 5.2 出力

```typescript
interface QueryAnalysisResult {
  queryType: QueryType       // 'select' | 'insert' | 'update' | 'delete' | 'drop' | 'truncate' | 'alter' | 'create' | 'unknown'
  riskLevel: RiskLevel       // 'safe' | 'warning' | 'danger'
  riskFactors: RiskFactor[]  // 危険度の要因リスト
  affectedTables: string[]   // 影響を受けるテーブル
  hasWhereClause: boolean    // WHERE句の有無（UPDATE/DELETEの場合）
}

interface RiskFactor {
  code: string       // 'no_where_clause' | 'drop_table' | 'truncate' | 等
  message: string    // ユーザー向けメッセージ
}
```

---

## 6. 制約・前提条件

- Phase 2（クエリ実行基盤）が完了していること
- SQLパーサーとしてRustの`sqlparser`クレートを使用
- 複数文（セミコロン区切り）の場合は最初の文のみ解析

---

## 7. 優先度

**高**: 本番環境での誤操作防止は安全性に直結する重要機能

---

## 8. 参照ドキュメント

- [sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md) - Phase 3セクション
- [query-builder.md](../../features/query-builder.md) - クエリビルダー機能仕様
